// Builds the review's data files from open sources.
//   node scripts/build-data.mjs            downloads into .cache/ once, then builds public/data/
//   node scripts/build-data.mjs --refresh  re-downloads everything
//
// Sources and licenses (also shown on the site's About page):
//   JMdict with Tatoeba examples, via jmdict-simplified   CC BY-SA 4.0 (EDRDG) / CC BY 2.0 FR (Tatoeba)
//   JLPT word lists by Jonathan Waller, via open-anki-jlpt-decks   CC BY (lists) / MIT (repo)
//   Kanji readings, meanings, strokes and JLPT levels, via kanji-data   KANJIDIC CC BY-SA 4.0 / MIT (repo)
// Only KANJIDIC-derived kanji fields are used. kanji-data's WaniKani fields are ignored.

import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { classify, themes } from "./topics.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CACHE = path.join(ROOT, ".cache");
const OUT = path.join(ROOT, "public", "data");
const CONTENT = path.join(ROOT, "content");
const refresh = process.argv.includes("--refresh");

const WORDS_PER_LESSON = 14;
const N4_REFRESH_PER_LESSON = 8;
const MAX_KANJI_PER_LESSON = 5;
const N3_WEEKS = 18; // course weeks 3-20
const LESSONS_PER_WEEK = 6;
const GRAMMAR_N3_WEEKS = 10; // course weeks 3-12

const LISTS = {
  5: "https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv",
  4: "https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n4.csv",
  3: "https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n3.csv",
};
const KANJI_URL = "https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json";

// ───────── download helpers ─────────
async function fetchToCache(url, name) {
  const file = path.join(CACHE, name);
  if (!refresh && existsSync(file)) return file;
  console.log(`download ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function jmdictFile() {
  const existing = (await readdir(CACHE)).find((f) => f.startsWith("jmdict-examples-eng") && f.endsWith(".json.zip"));
  if (existing && !refresh) return path.join(CACHE, existing);
  const rel = await (await fetch("https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest")).json();
  const asset = rel.assets.find((a) => /^jmdict-examples-eng-.*\.json\.zip$/.test(a.name));
  if (!asset) throw new Error("jmdict-examples-eng asset not found in the latest jmdict-simplified release");
  return fetchToCache(asset.browser_download_url, asset.name);
}

// ───────── CSV ─────────
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

// ───────── text helpers ─────────
const KANJI_RE = /[一-鿿々]/g;
const kanjiOf = (s) => [...new Set(s.match(KANJI_RE) ?? [])].filter((k) => k !== "々");
const clean = (s) => s.replace(/\(.*?\)|（.*?）/g, "").replace(/[～〜~]/g, "").replace(/\s+/g, "").trim();
const firstForm = (s) => clean(s.split(/[、,;・／/]/)[0]);

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(OUT, { recursive: true });

  // ── sources
  const kanjiData = JSON.parse(await readFile(await fetchToCache(KANJI_URL, "kanji.json"), "utf8"));
  const lists = {};
  for (const [lvl, url] of Object.entries(LISTS)) lists[lvl] = parseCsv(await readFile(await fetchToCache(url, `n${lvl}.csv`), "utf8"));
  const zipPath = await jmdictFile();
  console.log("unzip JMdict…");
  const unz = unzipSync(new Uint8Array(await readFile(zipPath)));
  const jm = JSON.parse(strFromU8(Object.values(unz)[0]));
  console.log(`JMdict ${jm.dictDate}: ${jm.words.length} entries`);

  // ── kanji levels: N5 = 5 … N1 = 1; anything without a level counts as too hard
  const kLevel = (k) => kanjiData[k]?.jlpt_new ?? 0;
  // a sentence may hold at most one kanji above N3
  const sentenceOk = (ja) => ja.length <= 45 && kanjiOf(ja).filter((k) => kLevel(k) < 3).length <= 1;

  // ── JMdict indexes
  const byKanji = new Map(), byKana = new Map();
  for (const e of jm.words) {
    for (const k of e.kanji) (byKanji.get(k.text) ?? byKanji.set(k.text, []).get(k.text)).push(e);
    for (const k of e.kana) (byKana.get(k.text) ?? byKana.set(k.text, []).get(k.text)).push(e);
  }
  const isCommon = (e) => e.kanji.some((k) => k.common) || e.kana.some((k) => k.common);
  function lookup(expr, reading) {
    const r = firstForm(reading);
    let cands = (byKanji.get(expr) ?? []).filter((e) => e.kana.some((k) => k.text === r));
    if (!cands.length) cands = (byKana.get(expr) ?? []).filter((e) => !e.kanji.length || expr === r);
    if (!cands.length) cands = byKana.get(expr) ?? [];
    if (!cands.length && r) cands = (byKana.get(r) ?? []).filter((e) => e.kanji.some((k) => k.text === expr));
    return cands.sort((a, b) => isCommon(b) - isCommon(a))[0];
  }
  function bestExample(entry) {
    const all = entry.sense.flatMap((s) => s.examples ?? []);
    const conv = all
      .map((x) => ({
        ja: x.sentences.find((s) => s.lang === "jpn")?.text ?? "",
        en: x.sentences.find((s) => s.lang === "eng")?.text ?? "",
        s: x.text,
        id: x.source?.value,
      }))
      .filter((x) => x.ja && x.en && x.ja.includes(x.s));
    return conv.find((x) => sentenceOk(x.ja)) ?? null;
  }

  // ── words
  const words = [];
  const seen = new Set();
  const missing = [];
  for (const lvl of [5, 4, 3]) {
    for (const row of lists[lvl]) {
      let w = firstForm(row.expression);
      let r = firstForm(row.reading) || w;
      if (r.endsWith("する") && !w.endsWith("する")) r = r.slice(0, -2);
      if (w.endsWith("する") && w.length > 2 && !lookup(w, r)) { w = w.slice(0, -2); r = r.endsWith("する") ? r.slice(0, -2) : r; }
      const key = `${w}|${r}`;
      if (!w || seen.has(key)) continue;
      seen.add(key);
      const e = lookup(w, r);
      if (!e) missing.push(`N${lvl} ${w} ${r}`);
      const pos = e?.sense[0]?.partOfSpeech ?? [];
      words.push({
        id: e ? `j${e.id}` : `x${words.length}`,
        w,
        r,
        m: row.meaning.replace(/\s+/g, " ").trim().slice(0, 90),
        gl: e ? e.sense.slice(0, 2).flatMap((x) => x.gloss.slice(0, 3).map((g) => g.text)).join("; ") : "",
        pos,
        lvl,
        pri: e && isCommon(e) ? 1 : 0,
        ex: e ? bestExample(e) : null,
        k: kanjiOf(w),
      });
    }
  }
  // de-duplicate ids that JMdict matched twice (keep the easier level)
  const byId = new Map();
  for (const w of words) if (!byId.has(w.id)) byId.set(w.id, w);
  const uniq = [...byId.values()];
  for (const w of uniq) Object.assign(w, classify(w));
  for (const w of uniq) delete w.gl;

  const n3 = uniq.filter((w) => w.lvl === 3);
  const n4 = uniq.filter((w) => w.lvl === 4);

  // ── pack N3 words into themed lessons (Sou Matome rhythm: 6 themes × 3 weeks × 6 lessons).
  // Each lesson takes its theme's topic words first, then fills up with the most common general words,
  // the way Sou Matome pairs picture words with a collocation list. Theme 6 gathers adverbs and connecting words.
  const prio = (a, b) => b.pri - a.pri || (b.ex ? 1 : 0) - (a.ex ? 1 : 0);
  const perTheme = 3 * LESSONS_PER_WEEK;
  const topical = themes.map((t) => n3.filter((w) => w.theme === t.id && t.id !== 6).sort((a, b) => t.subs.indexOf(a.topic) - t.subs.indexOf(b.topic) || prio(a, b)));
  const theme6 = n3.filter((w) => ["Adverbs and degree", "Connecting words"].includes(w.topic)).sort(prio);
  topical[5] = theme6;
  const general = n3.filter((w) => !topical.flat().includes(w)).sort(prio);
  const lessons = [];
  // weeks 1-2: N4 bridge
  for (let week = 1; week <= 2; week++)
    for (let day = 1; day <= LESSONS_PER_WEEK; day++) {
      const n = (week - 1) * LESSONS_PER_WEEK + day;
      lessons.push({ n, week, day, kind: "n4", theme: 0, title: n === 1 ? "Placement and N4 grammar" : "N4 grammar refresh", words: [], n4: [], kanji: [], grammar: `n4-${String(n).padStart(2, "0")}` });
    }
  // weeks 3-20: N3 course
  let gN3 = 0;
  const overflowTopical = [];
  themes.forEach((t, ti) => {
    let pool = topical[ti];
    const maxTopical = perTheme * (WORDS_PER_LESSON - 4); // leave room for at least 4 general words a lesson
    if (pool.length > maxTopical) { overflowTopical.push(...pool.slice(maxTopical)); pool = pool.slice(0, maxTopical); }
    for (let i = 0; i < perTheme; i++) {
      const from = Math.round((i * pool.length) / perTheme), to = Math.round(((i + 1) * pool.length) / perTheme);
      const ws = pool.slice(from, to);
      const counts = {};
      ws.forEach((w) => (counts[w.topic] = (counts[w.topic] ?? 0) + 1));
      const topic = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? t.subs[0];
      const week = 3 + ti * 3 + Math.floor(i / LESSONS_PER_WEEK);
      const day = (i % LESSONS_PER_WEEK) + 1;
      const grammar = week - 2 <= GRAMMAR_N3_WEEKS ? `n3-${String(++gN3).padStart(2, "0")}` : null;
      lessons.push({ n: lessons.length + 1, week, day, kind: "n3", theme: t.id, title: topic, words: ws.map((w) => w.id), n4: [], kanji: [], grammar });
    }
  });
  const fill = [...overflowTopical, ...general].sort(prio);
  for (const l of lessons.filter((l) => l.kind === "n3")) while (l.words.length < WORDS_PER_LESSON && fill.length) l.words.push(fill.shift().id);
  const extra = fill; // optional pool, unlocked when review load allows
  const n3Lessons = lessons.filter((l) => l.kind === "n3");

  // ── N4 refresh inside each N3 lesson, matched by topic, each N4 word once
  const n4ByTopic = new Map();
  for (const w of n4.sort(prio)) (n4ByTopic.get(w.topic) ?? n4ByTopic.set(w.topic, []).get(w.topic)).push(w);
  const placed = new Set();
  for (const l of n3Lessons) {
    const q = n4ByTopic.get(l.title) ?? [];
    while (l.n4.length < N4_REFRESH_PER_LESSON && q.length) { const w = q.shift(); l.n4.push(w.id); placed.add(w.id); }
  }
  const rest = n4.filter((w) => !placed.has(w.id));
  for (const w of rest) {
    const l = n3Lessons.reduce((a, b) => (b.n4.length < a.n4.length ? b : a));
    l.n4.push(w.id);
  }

  // ── kanji: introduced when a lesson's words first use them
  const wordById = new Map(uniq.map((w) => [w.id, w]));
  const n3Kanji = Object.keys(kanjiData).filter((k) => kLevel(k) === 3);
  const assigned = new Map();
  let carry = [];
  for (const l of n3Lessons) {
    const fresh = l.words.flatMap((id) => wordById.get(id).k).filter((k) => kLevel(k) === 3 && !assigned.has(k) && !carry.includes(k));
    carry.push(...new Set(fresh));
    while (l.kanji.length < MAX_KANJI_PER_LESSON && carry.length) { const k = carry.shift(); l.kanji.push(k); assigned.set(k, l.n); }
  }
  const leftK = n3Kanji.filter((k) => !assigned.has(k)).sort((a, b) => (kanjiData[a].freq ?? 9999) - (kanjiData[b].freq ?? 9999));
  for (const k of [...carry, ...leftK]) {
    if (assigned.has(k)) continue;
    const l = n3Lessons.reduce((a, b) => (b.kanji.length < a.kanji.length ? b : a));
    l.kanji.push(k); assigned.set(k, l.n);
  }

  // kanji records for N4 (placement) and N3 (course), with up to 4 compound words from the lists
  const wordsWithKanji = new Map();
  for (const w of uniq) for (const k of w.k) (wordsWithKanji.get(k) ?? wordsWithKanji.set(k, []).get(k)).push(w);
  const kanji = Object.keys(kanjiData)
    .filter((k) => kLevel(k) === 3 || kLevel(k) === 4)
    .map((k) => {
      const d = kanjiData[k];
      const ws = (wordsWithKanji.get(k) ?? []).filter((w) => w.w.length > 1).sort((a, b) => b.lvl - a.lvl || b.pri - a.pri).slice(0, 4);
      return { k, lvl: kLevel(k), st: d.strokes, on: d.readings_on ?? [], kun: (d.readings_kun ?? []).slice(0, 5).map((r) => r.replace(/\.(.+)$/, "($1)")), m: (d.meanings ?? []).slice(0, 3), w: ws.map((w) => w.id), lesson: assigned.get(k) ?? null };
    });

  // ── grammar content, validated
  const gDir = path.join(CONTENT, "grammar");
  const grammar = [];
  const problems = [];
  for (const f of (await readdir(gDir)).filter((f) => f.endsWith(".json")).sort()) {
    const data = JSON.parse(await readFile(path.join(gDir, f), "utf8"));
    for (const g of Array.isArray(data) ? data : [data]) {
    for (const p of g.patterns) {
      if (!p.p || !p.meaning || !p.form) problems.push(`${g.id}/${p.id}: missing p, form or meaning`);
      for (const x of p.ex ?? []) if (!x.ja.includes(x.hit)) problems.push(`${g.id}/${p.id}: example does not contain its hit "${x.hit}"`);
      if (p.test) {
        if (!p.test.q.includes("（　）")) problems.push(`${g.id}/${p.id}: test has no （　） blank`);
        if (p.test.opts.length !== 4 || p.test.a < 0 || p.test.a > 3) problems.push(`${g.id}/${p.id}: test needs 4 options and an answer 0-3`);
        if (new Set(p.test.opts).size !== 4) problems.push(`${g.id}/${p.id}: duplicate test options`);
      }
    }
    if (g.patterns.length !== 3) problems.push(`${g.id}: a lesson has exactly 3 patterns (Sou Matome method)`);
    grammar.push(g);
    }
  }
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }

  // ── write
  const slim = uniq.map(({ k, ...w }) => w);
  const weeks = Array.from({ length: 24 }, (_, i) => {
    const week = i + 1;
    const theme = week <= 2 ? null : week <= 20 ? themes[Math.floor((week - 3) / 3)] : null;
    return { week, phase: week <= 8 ? 1 : week <= 16 ? 2 : 3, theme: theme ? { id: theme.id, name: theme.name, ja: theme.ja } : null, label: week <= 2 ? "N4 bridge" : week <= 20 ? theme.name : "Consolidation" };
  });
  const meta = { built: new Date().toISOString(), jmdict: jm.dictDate, counts: { n5: uniq.filter((w) => w.lvl === 5).length, n4: n4.length, n3: n3.length, n3InLessons: n3.length - extra.length, extra: extra.length, kanjiN3: n3Kanji.length, kanjiN4: kanji.filter((k) => k.lvl === 4).length, grammarLessons: grammar.length, unmatched: missing.length } };
  await writeFile(path.join(OUT, "words.json"), JSON.stringify(slim));
  await writeFile(path.join(OUT, "kanji.json"), JSON.stringify(kanji));
  await writeFile(path.join(OUT, "course.json"), JSON.stringify({ meta, weeks, lessons, extra: extra.map((w) => w.id) }));
  await writeFile(path.join(OUT, "grammar.json"), JSON.stringify(grammar));
  await writeFile(path.join(CACHE, "unmatched.txt"), missing.join("\n"));

  const sizes = await Promise.all(["words", "kanji", "course", "grammar"].map(async (f) => `${f} ${Math.round((await stat(path.join(OUT, `${f}.json`))).size / 1024)} KB`));
  console.log(JSON.stringify(meta.counts), "\n" + sizes.join(" · "));
  const withEx = n3.filter((w) => w.ex).length;
  console.log(`N3 words with a level-safe example: ${withEx}/${n3.length}`);
  const topicCounts = {};
  for (const w of n3) topicCounts[`${w.theme} ${w.topic}`] = (topicCounts[`${w.theme} ${w.topic}`] ?? 0) + 1;
  console.log(topicCounts);
}

main().catch((e) => { console.error(e); process.exit(1); });
