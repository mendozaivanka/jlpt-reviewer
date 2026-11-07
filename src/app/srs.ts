// FSRS scheduling with ts-fsrs's DefaultScheduler (FSRS-7).
// Desired retention is a setting: 0.90 by default, 0.93-0.95 in weeks 21-24.
import { DefaultScheduler, Rating } from "ts-fsrs";
import { db, getSetting, type CardKind, type CardRow } from "./db";

export { Rating };
export type Grade = 1 | 2 | 3 | 4;

let cached: { retention: number; s: Awaited<ReturnType<typeof DefaultScheduler>> } | null = null;

export async function scheduler() {
  const retention = await getSetting("retention", 0.9);
  if (!cached || cached.retention !== retention) {
    cached = {
      retention,
      s: await DefaultScheduler({ desiredRetention: retention, enableShortTerm: true, learningSteps: ["1m", "10m"], relearningSteps: ["10m"], enableFuzz: true, maximumInterval: 365 }),
    };
  }
  return cached.s;
}

/** Add cards that don't exist yet. Returns how many were new. */
export async function addCards(kind: CardKind, refs: string[], lesson: number) {
  const s = await scheduler();
  const now = new Date();
  const ids = refs.map((r) => `${kind}:${r}`);
  const existing = new Set((await db.cards.bulkGet(ids)).filter(Boolean).map((c) => c!.id));
  const rows: CardRow[] = refs
    .filter((r) => !existing.has(`${kind}:${r}`))
    .map((ref) => ({ id: `${kind}:${ref}`, kind, ref, lesson, fsrs: s.newCard({ now }) as CardRow["fsrs"], due: now.getTime(), suspended: 0, added: now.getTime() }));
  if (rows.length) await db.cards.bulkAdd(rows);
  return rows.length;
}

export async function review(card: CardRow, grade: Grade, ms: number) {
  const s = await scheduler();
  const { card: next } = s.review({ card: card.fsrs as never, grade, now: new Date() });
  await db.transaction("rw", db.cards, db.reviews, async () => {
    await db.cards.update(card.id, { fsrs: next as CardRow["fsrs"], due: next.dueAt.getTime() });
    await db.reviews.add({ cardId: card.id, rating: grade, state: card.fsrs.state, ms, at: Date.now() });
  });
}

/** Interval labels for the four buttons, like "10m", "3d". */
export async function previews(card: CardRow) {
  const s = await scheduler();
  const now = new Date();
  const label = (d: Date) => {
    const m = (d.getTime() - now.getTime()) / 60000;
    if (m < 60) return `${Math.max(1, Math.round(m))}m`;
    if (m < 60 * 24) return `${Math.round(m / 60)}h`;
    const days = m / 1440;
    return days < 30 ? `${Math.round(days)}d` : `${(days / 30).toFixed(1)}mo`;
  };
  return [...s.preview({ card: card.fsrs as never, now })].map((p) => label(p.card.dueAt));
}

/**
 * Cards to study now: every due review, plus new cards up to the daily cap (setting "newPerDay", default 25).
 * New cards from lessons come before the placement and optional-word backlog.
 */
export async function dueCards() {
  const due = (await db.cards.where("due").belowOrEqual(Date.now()).toArray()).filter((c) => !c.suspended);
  const reviews = due.filter((c) => c.fsrs.state !== 0).sort((a, b) => a.due - b.due);
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const introduced = new Set((await db.reviews.where("at").above(midnight.getTime()).toArray()).filter((r) => r.state === 0).map((r) => r.cardId)).size;
  const cap = await getSetting("newPerDay", 25);
  const fresh = due
    .filter((c) => c.fsrs.state === 0)
    .sort((a, b) => (b.lesson > 0 ? 1 : 0) - (a.lesson > 0 ? 1 : 0) || a.lesson - b.lesson || a.added - b.added)
    .slice(0, Math.max(0, cap - introduced));
  return [...reviews, ...fresh];
}

/** New cards waiting beyond today's cap. */
export async function backlog() {
  return (await db.cards.where("due").belowOrEqual(Date.now()).toArray()).filter((c) => !c.suspended && c.fsrs.state === 0).length;
}

/** True retention over the last N days: share of reviews of already-learned cards not rated Again. */
export async function trueRetention(days = 30) {
  const since = Date.now() - days * 864e5;
  const rows = (await db.reviews.where("at").above(since).toArray()).filter((r) => r.state === 2);
  if (!rows.length) return null;
  return rows.filter((r) => r.rating > 1).length / rows.length;
}

/** Average minutes per day spent on reviews over the last N days. */
export async function reviewMinutes(days = 7) {
  const since = Date.now() - days * 864e5;
  const rows = await db.reviews.where("at").above(since).toArray();
  return rows.reduce((s, r) => s + Math.min(r.ms, 60000), 0) / 60000 / days;
}
