// Question generators in JLPT formats, built from the word, kanji and grammar data.
import type { Data, Kanji, Pattern, Word } from "./data";

export type Item = {
  type: "漢字読み" | "表記" | "文脈規定" | "意味" | "文法形式" | "意味理解" | "漢字";
  prompt: string; // may contain （　）
  focus?: string; // part of the prompt to underline
  opts: string[];
  a: number;
  explain?: string;
  ref: string; // word id, kanji or pattern id, for flags and the error log
  say?: string; // Japanese to read aloud after answering
};

export const shuffle = <T,>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function withAnswer(correct: string, wrong: string[], n = 4) {
  const opts = shuffle([correct, ...shuffle([...new Set(wrong)].filter((x) => x !== correct)).slice(0, n - 1)]);
  return { opts, a: opts.indexOf(correct) };
}

// ───────── reading slips (漢字読み) ─────────
const VOICE: Record<string, string> = { か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご", さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ", た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど", は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ" };
const UNVOICE = Object.fromEntries(Object.entries(VOICE).map(([a, b]) => [b, a]));
const O_ROW = "おこごそぞとどのほぼぽもよろょ";
const SMALL: Record<string, string> = { ゃ: "や", ゅ: "ゆ", ょ: "よ", や: "ゃ", ゆ: "ゅ", よ: "ょ" };

export function readingSlips(r: string): string[] {
  const out = new Set<string>();
  const ch = [...r];
  ch.forEach((c, i) => {
    const rest = ch.slice(i + 1).join("");
    const head = ch.slice(0, i).join("");
    if (O_ROW.includes(c) && ch[i + 1] !== "う") out.add(head + c + "う" + rest);
    if (O_ROW.includes(c) && ch[i + 1] === "う") out.add(head + c + ch.slice(i + 2).join(""));
    if (c === "え" || "けせてねへめれげぜでべ".includes(c)) { if (ch[i + 1] === "い") out.add(head + c + ch.slice(i + 2).join("")); else if (i < ch.length - 1) out.add(head + c + "い" + rest); }
    if (c === "っ") out.add(head + rest);
    if (i > 0 && "かきくけこさしすせそたちつてとぱぴぷぺぽ".includes(c) && ch[i - 1] !== "っ") out.add(head + "っ" + c + rest);
    if (VOICE[c]) out.add(head + VOICE[c] + rest);
    if (UNVOICE[c]) out.add(head + UNVOICE[c] + rest);
    if (SMALL[c] && i > 0) out.add(head + SMALL[c] + rest);
  });
  out.delete(r);
  return [...out];
}

// ───────── look-alike spellings (表記) ─────────
let byReading: Map<string, string[]> | null = null;
function kanjiSharingReading(k: Kanji, data: Data) {
  if (!byReading) {
    byReading = new Map();
    for (const x of data.kanjiList) for (const on of x.on) (byReading.get(on) ?? byReading.set(on, []).get(on)!).push(x.k);
  }
  return [...new Set(k.on.flatMap((on) => byReading!.get(on) ?? []))].filter((x) => x !== k.k);
}

export function spellingSlips(w: Word, data: Data): string[] {
  const chars = [...w.w];
  const out = new Set<string>();
  chars.forEach((c, i) => {
    const k = data.kanji.get(c);
    if (!k) return;
    let alts = kanjiSharingReading(k, data);
    if (alts.length < 3) alts = alts.concat(data.kanjiList.filter((x) => Math.abs(x.st - k.st) <= 1 && x.k !== c).map((x) => x.k));
    for (const a of shuffle(alts).slice(0, 4)) out.add(chars.map((x, j) => (j === i ? a : x)).join(""));
  });
  out.delete(w.w);
  return [...out];
}

const hasKanji = (s: string) => /[一-鿿]/.test(s);
const posGroup = (w: Word) => {
  const p = w.pos.join(" ");
  if (/\bv[15]|\bvs-|\bvk|\bvz/.test(p)) return "verb";
  if (/adj-i\b/.test(p)) return "i-adj";
  if (/adj-na/.test(p)) return "na-adj";
  if (/\badv\b/.test(p)) return "adv";
  return "noun";
};

// ───────── single items ─────────
export function readingItem(w: Word, pool: Word[]): Item | null {
  if (!hasKanji(w.w)) return null;
  let wrong = readingSlips(w.r);
  if (wrong.length < 3) wrong = wrong.concat(pool.filter((x) => x.r.length === w.r.length && x.r !== w.r).map((x) => x.r));
  const ctx = w.ex && w.ex.s === w.w ? w.ex.ja : null;
  return { type: "漢字読み", prompt: ctx ?? w.w, focus: w.w, ...withAnswer(w.r, wrong), explain: `${w.w}（${w.r}）: ${w.m}`, ref: w.id, say: ctx ?? w.w };
}

export function spellingItem(w: Word, data: Data): Item | null {
  if (!hasKanji(w.w)) return null;
  const wrong = spellingSlips(w, data);
  if (wrong.length < 3) return null;
  const ctx = w.ex && w.ex.s === w.w ? w.ex.ja.replace(w.w, w.r) : null;
  return { type: "表記", prompt: ctx ?? w.r, focus: w.r, ...withAnswer(w.w, wrong), explain: `${w.r} → ${w.w}: ${w.m}`, ref: w.id, say: w.ex?.ja ?? w.w };
}

/** Fill the blank in the word's own example sentence. Only uninflected uses, so the options read naturally. */
export function contextItem(w: Word, pool: Word[], n = 4): Item | null {
  if (!w.ex || w.ex.s !== w.w) return null;
  const g = posGroup(w);
  const wrong = pool.filter((x) => x.id !== w.id && posGroup(x) === g && x.w !== w.w).map((x) => x.w);
  if (wrong.length < n - 1) return null;
  return { type: "文脈規定", prompt: w.ex.ja.replace(w.ex.s, "（　）"), ...withAnswer(w.w, wrong, n), explain: `${w.ex.ja}　${w.ex.en}`, ref: w.id, say: w.ex.ja };
}

export function meaningItem(w: Word, pool: Word[], n = 4): Item {
  const wrong = pool.filter((x) => x.id !== w.id && x.m !== w.m).map((x) => x.w);
  return { type: "意味", prompt: w.m, ...withAnswer(w.w, wrong, n), explain: `${w.w}（${w.r}）: ${w.m}`, ref: w.id, say: w.w };
}

export function kanjiItem(k: Kanji, data: Data): Item | null {
  const words = k.w.map((id) => data.words.get(id)).filter(Boolean) as Word[];
  const w = words[0];
  if (!w) return null;
  const it = readingItem(w, data.wordList);
  return it && { ...it, type: "漢字", ref: k.k };
}

export function grammarTestItem(p: Pattern): Item | null {
  if (!p.test) return null;
  const correct = p.test.opts[p.test.a];
  const opts = shuffle(p.test.opts);
  return { type: "文法形式", prompt: p.test.q, opts, a: opts.indexOf(correct), explain: `${p.p}: ${p.meaning}`, ref: p.id, say: p.test.q.replace("（　）", correct) };
}

/** Structured input: read the sentence, choose what the pattern means. Options come from the lesson's look-alike group. */
export function structuredItem(p: Pattern, group: Pattern[], exIndex = 0): Item | null {
  const ex = p.ex[exIndex];
  if (!ex) return null;
  const correct = p.meaning;
  const opts = shuffle(group.map((g) => g.meaning));
  return { type: "意味理解", prompt: ex.ja, focus: ex.hit, opts, a: opts.indexOf(correct), explain: `${p.p}（${p.form}）. ${ex.en}`, ref: p.id, say: ex.ja };
}

// ───────── sets ─────────
/** The daily 8-item practice: pick-of-two blanks first, then four-option items, as in Sou Matome's れんしゅう. */
export function dailyPractice(words: Word[], data: Data): Item[] {
  const pool = data.wordList.filter((x) => x.lvl >= 3);
  const items: Item[] = [];
  for (const w of shuffle(words)) {
    if (items.length >= 4) break;
    const it = contextItem(w, words.length > 4 ? words : pool, 2);
    if (it) items.push(it);
  }
  for (const w of shuffle(words)) {
    if (items.length >= 8) break;
    if (items.some((i) => i.ref === w.id)) continue;
    items.push(readingItem(w, pool) ?? contextItem(w, pool) ?? meaningItem(w, words.length > 4 ? words : pool));
  }
  return items;
}

/** Day 7 test in JLPT order: vocabulary items, then grammar. */
export function weeklyTest(words: Word[], patterns: Pattern[], data: Data): Item[] {
  const pool = data.wordList.filter((x) => x.lvl >= 3);
  const used = new Set<string>();
  const take = (n: number, make: (w: Word) => Item | null) => {
    const out: Item[] = [];
    for (const w of shuffle(words)) {
      if (out.length >= n) break;
      if (used.has(w.id)) continue;
      const it = make(w);
      if (it) { out.push(it); used.add(w.id); }
    }
    return out;
  };
  return [
    ...take(8, (w) => readingItem(w, pool)),
    ...take(6, (w) => spellingItem(w, data)),
    ...take(11, (w) => contextItem(w, words.length >= 8 ? words : pool)),
    ...take(5, (w) => meaningItem(w, words)),
    ...shuffle(patterns).map(grammarTestItem).filter(Boolean).slice(0, 13) as Item[],
  ];
}

export const band = (pct: number) => (pct >= 67 ? "A" : pct >= 34 ? "B" : "C");
