// Types and loaders for the generated data in public/data/ (built by scripts/build-data.mjs).

export type Example = { ja: string; en: string; s: string; id?: string };
export type Word = { id: string; w: string; r: string; m: string; pos: string[]; lvl: number; pri: number; ex: Example | null; topic: string; theme: number };
export type Kanji = { k: string; lvl: number; st: number; on: string[]; kun: string[]; m: string[]; w: string[]; lesson: number | null };
export type Lesson = { n: number; week: number; day: number; kind: "n4" | "n3"; theme: number; title: string; words: string[]; n4: string[]; kanji: string[]; grammar: string | null };
export type Week = { week: number; phase: number; theme: { id: number; name: string; ja: string } | null; label: string };
export type Course = { meta: { built: string; jmdict: string; counts: Record<string, number> }; weeks: Week[]; lessons: Lesson[]; extra: string[] };
export type GrammarExample = { ja: string; en: string; hit: string };
export type Pattern = { id: string; p: string; form: string; meaning: string; plain: string; note?: string; ex: GrammarExample[]; test?: { q: string; opts: string[]; a: number } };
export type GrammarLesson = { id: string; level: number; title: string; titleJa: string; patterns: Pattern[] };

export type Data = {
  course: Course;
  words: Map<string, Word>;
  wordList: Word[];
  kanji: Map<string, Kanji>;
  kanjiList: Kanji[];
  grammar: Map<string, GrammarLesson>;
};

const base = import.meta.env.BASE_URL;
let cache: Promise<Data> | null = null;

export function loadData(): Promise<Data> {
  cache ??= (async () => {
    const get = async <T,>(f: string): Promise<T> => {
      const r = await fetch(`${base}data/${f}.json`);
      if (!r.ok) throw new Error(`Could not load ${f}.json (${r.status})`);
      return r.json();
    };
    const [course, wordList, kanjiList, grammarList] = await Promise.all([
      get<Course>("course"),
      get<Word[]>("words"),
      get<Kanji[]>("kanji"),
      get<GrammarLesson[]>("grammar"),
    ]);
    return {
      course,
      wordList,
      words: new Map(wordList.map((w) => [w.id, w])),
      kanjiList,
      kanji: new Map(kanjiList.map((k) => [k.k, k])),
      grammar: new Map(grammarList.map((g) => [g.id, g])),
    };
  })();
  return cache;
}

export const url = (p: string) => base + p.replace(/^\//, "");
