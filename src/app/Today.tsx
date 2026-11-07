import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { url } from "./data";
import { db } from "./db";
import { backlog, dueCards, reviewMinutes, trueRetention } from "./srs";
import { scheduledLesson, status, weekOf } from "./status";
import { Loading, Panel, useData, Ja } from "./ui";

type State = Awaited<ReturnType<typeof status>> & { due: number; fresh: number; waiting: number; minutes: number; retention: number | null; retest: number; cards: number };

export default function Today() {
  const { data, error } = useData();
  const [s, setS] = useState<State | null>(null);

  useEffect(() => {
    if (!data) return;
    (async () => {
      const st = await status(data.course);
      const due = await dueCards();
      const retest = await db.sorted.where("retest").equals(1).count();
      const fresh = due.filter((c) => c.fsrs.state === 0).length;
      setS({ ...st, due: due.length, fresh, waiting: (await backlog()) - fresh, minutes: await reviewMinutes(7), retention: await trueRetention(30), retest, cards: await db.cards.count() });
    })();
  }, [data]);

  if (!data || !s) return <Loading error={error} />;
  const { course } = data;
  const next = s.next;
  const week = next ? weekOf(course, next.week) : null;
  const scheduled = scheduledLesson(course, s.start);
  const behind = scheduled && next ? scheduled.n - next.n : 0;
  const placementDone = s.placement.words && s.placement.kanji && s.placement.grammar;
  const lessonTotal = course.lessons.length;

  return (
    <div className="grid gap-6 py-8">
      <header className="grid gap-2">
        <span className="label-mono">
          {next ? `Week ${next.week} of 24 · ${week?.label ?? ""}` : "Course lessons complete"}
          {s.start && behind > 0 ? ` · ${behind} lesson${behind > 1 ? "s" : ""} behind schedule` : ""}
          {s.start && behind < 0 ? ` · ${-behind} ahead of schedule` : ""}
        </span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Today</h1>
        <p className="text-muted-foreground">
          {s.done.size} of {lessonTotal} lessons done · {s.cards} cards in your deck
          {!s.start && <> · <a className="text-primary-strong underline underline-offset-4" href={url("/progress/")}>set your start date</a> to see the schedule</>}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-3">
          {!placementDone && (
            <Step href={url("/placement/")} min="30–45" title="N4 placement" tag="Weeks 1–2" tint="bg-heather" primary>
              Sort the N4 words and kanji you already know, and check the N4 grammar. Only what you miss becomes cards.
            </Step>
          )}
          <Step href={url("/cards/")} min={String(Math.max(5, Math.round(s.due * 0.12)))} title="FSRS cards" tag={`${s.due} due`} tint="bg-heather" primary={placementDone && s.due > 0}>
            {s.due ? `${s.due - s.fresh} reviews and ${s.fresh} new cards.` : "Nothing due right now."}{s.waiting > 0 ? ` ${s.waiting} more new cards wait for later days.` : ""}
          </Step>
          {s.testDue && (
            <Step href={url(`/test/?week=${s.testDue}`)} min="30" title={`Week ${s.testDue} test · 実戦問題`} tag="Day 7" tint="bg-sand" primary>
              Your six lessons for week {s.testDue} are done. Take the test once, timed, before moving on.
            </Step>
          )}
          {next && (
            <Step href={url(`/lesson/?n=${next.n}`)} min={next.kind === "n4" ? "20" : "45"} title={`Lesson ${next.n} · ${next.title}`} tag={`Week ${next.week} · day ${next.day}`} tint={next.kind === "n4" ? "bg-fjord" : "bg-moss"} primary={placementDone && !s.due && !s.testDue}>
              {next.kind === "n4"
                ? `N4 grammar refresh: ${data.grammar.get(next.grammar ?? "")?.title ?? "grammar"}.`
                : <>{next.n4.length} N4 words to recheck, {next.words.length} new N3 words, {next.kanji.length} kanji <Ja>{next.kanji.join(" ")}</Ja>{next.grammar ? ", three grammar patterns" : ""}, then an 8-item practice.</>}
            </Step>
          )}
          {s.retest > 0 && next && next.n >= 13 && (
            <Step href={url("/placement/?retest=1")} min="5" title="Retest a sample of 'known' N4 words" tag={`${s.retest} words`} tint="bg-sand">
              One in ten words you marked as known in placement is checked again to catch overconfidence.
            </Step>
          )}
        </div>

        <aside className="grid content-start gap-4">
          <Panel label="Deck health">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">True retention 30 d</dt><dd className="font-mono text-2xl font-semibold">{s.retention === null ? "–" : s.retention.toFixed(2)}</dd></div>
              <div><dt className="text-muted-foreground">Reviews per day</dt><dd className="font-mono text-2xl font-semibold">{s.minutes.toFixed(0)}<span className="text-xs text-muted-foreground"> min</span></dd></div>
            </dl>
            {s.minutes > 30 || (s.retention !== null && s.retention < 0.85) ? (
              <p className="rounded-lg bg-sand p-3 text-sm">Review load is high. Do the lesson's words over two days instead of one until reviews drop under 30 minutes.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Load rule is clear: under 30 minutes a day and at least 0.85 retention.</p>
            )}
          </Panel>
          <Panel label="Method">
            <p className="text-sm text-muted-foreground">Six lessons and a test each week, as in Sou Matome. Weeks 1–2 bridge N4. Weeks 3–20 teach N3 by theme. Weeks 17–24 are for mocks and consolidation.</p>
            <a className="text-sm text-primary-strong underline underline-offset-4" href={url("/course/")}>See the whole course</a>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Step({ href, min, title, tag, tint, primary, children }: { href: string; min: string; title: string; tag: string; tint: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <a href={href} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted sm:grid-cols-[64px_minmax(0,1fr)_auto]">
      <span className="font-mono text-xl font-semibold">{min}<span className="text-[11px] text-muted-foreground"> min</span></span>
      <span className="grid gap-1">
        <span className="flex flex-wrap items-center gap-2 font-semibold">{title} <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", tint)}>{tag}</span></span>
        <span className="text-sm text-muted-foreground">{children}</span>
      </span>
      <span className={cn(buttonVariants({ variant: primary ? "default" : "outline" }), "col-span-2 h-11 px-5 sm:col-span-1")}>{primary ? "Start" : "Open"}</span>
    </a>
  );
}
