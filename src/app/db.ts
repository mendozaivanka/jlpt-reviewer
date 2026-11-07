// Everything the learner does is stored in this browser (IndexedDB). Progress page exports and imports it.
import Dexie, { type EntityTable } from "dexie";
import type { DefaultScheduler } from "ts-fsrs";

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler>>;
export type FsrsCard = Parameters<Scheduler["review"]>[0]["card"];

export type CardKind = "w" | "k";
export type CardRow = {
  id: string; // `${kind}:${ref}`
  kind: CardKind;
  ref: string; // word id or kanji character
  lesson: number; // 0 = from the N4 placement sort or a refresh miss
  fsrs: FsrsCard;
  due: number;
  suspended: 0 | 1;
  added: number;
};
export type ReviewRow = { id?: number; cardId: string; rating: number; state: number; ms: number; at: number };
export type DoneRow = { n: number; at: number };
export type SortRow = { id: string; kind: CardKind; answer: "know" | "unsure" | "dont"; retest: 0 | 1; at: number };
export type AttemptRow = { id?: number; kind: "practice" | "test" | "placement-grammar" | "refresh" | "retest"; ref: string; type: string; ok: number; total: number; ms: number; at: number };
export type FlagRow = { id: string; note: string; at: number };
export type SettingRow = { key: string; value: unknown };

export const db = new Dexie("jlpt-reviewer") as Dexie & {
  cards: EntityTable<CardRow, "id">;
  reviews: EntityTable<ReviewRow, "id">;
  done: EntityTable<DoneRow, "n">;
  sorted: EntityTable<SortRow, "id">;
  attempts: EntityTable<AttemptRow, "id">;
  flags: EntityTable<FlagRow, "id">;
  settings: EntityTable<SettingRow, "key">;
};

db.version(1).stores({
  cards: "id, kind, due, lesson, suspended",
  reviews: "++id, cardId, at",
  done: "n",
  sorted: "id, kind, answer, retest",
  attempts: "++id, kind, ref, at",
  flags: "id",
  settings: "key",
});

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value });

const TABLES = ["cards", "reviews", "done", "sorted", "attempts", "flags", "settings"] as const;

export async function exportAll() {
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) out[t] = await db.table(t).toArray();
  return { app: "jlpt-reviewer", version: 1, exported: new Date().toISOString(), tables: out };
}

export async function importAll(json: { app?: string; tables?: Record<string, unknown[]> }) {
  if (json.app !== "jlpt-reviewer" || !json.tables) throw new Error("This file is not a JLPT Reviewer backup.");
  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = (json.tables![t] ?? []) as Record<string, unknown>[];
      if (t === "cards") for (const r of rows) reviveDates(r.fsrs as Record<string, unknown>);
      await db.table(t).bulkAdd(rows);
    }
  });
}

function reviveDates(c: Record<string, unknown>) {
  for (const k of ["dueAt", "lastReviewAt"]) if (typeof c?.[k] === "string") c[k] = new Date(c[k] as string);
}
