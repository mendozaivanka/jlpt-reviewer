// Course position and schedule, derived from what the learner has done.
import { db, getSetting } from "./db";
import type { Course, Lesson } from "./data";

export type Placement = { words: boolean; kanji: boolean; grammar: boolean };

export async function status(course: Course) {
  const done = new Set((await db.done.toArray()).map((d) => d.n));
  const placement = await getSetting<Placement>("placement", { words: false, kanji: false, grammar: false });
  const start = await getSetting<string | null>("start", null);
  const tests = new Set((await db.attempts.where("kind").equals("test").toArray()).map((a) => a.ref));
  const next = course.lessons.find((l) => !done.has(l.n)) ?? null;
  // a week's test is due once its six lessons are done
  const testDue = course.weeks
    .map((w) => w.week)
    .find((week) => {
      const ls = course.lessons.filter((l) => l.week === week);
      return ls.length > 0 && ls.every((l) => done.has(l.n)) && !tests.has(`week-${week}`);
    }) ?? null;
  return { done, placement, start, tests, next, testDue };
}

/** Which lesson the calendar expects today: six lessons and one test day per week from the start date. */
export function scheduledLesson(course: Course, start: string | null): Lesson | null {
  if (!start) return null;
  const days = Math.floor((Date.now() - new Date(start).getTime()) / 864e5);
  if (days < 0) return course.lessons[0];
  const week = Math.floor(days / 7) + 1;
  const day = Math.min(6, (days % 7) + 1);
  return course.lessons.find((l) => l.week === week && l.day === day) ?? course.lessons.at(-1) ?? null;
}

export const weekOf = (course: Course, week: number) => course.weeks.find((w) => w.week === week);
