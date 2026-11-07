import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { db } from "./db";
import { url, type Pattern, type Word } from "./data";
import { band, weeklyTest } from "./gen";
import { Ja, Loading, Panel, Quiz, Summary, useData, type QuizResult } from "./ui";

export default function TestPage() {
  const { data, error } = useData();
  const week = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("week") ?? 3) : 3;
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [taken, setTaken] = useState<boolean | null>(null);
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { db.attempts.where("ref").equals(`week-${week}`).count().then((c) => setTaken(c > 0)); }, [week]);
  useEffect(() => {
    if (phase !== "run") return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const items = useMemo(() => {
    if (!data) return [];
    const lessons = data.course.lessons.filter((l) => l.week === week);
    const words = lessons.flatMap((l) => l.words).map((id) => data.words.get(id)).filter(Boolean) as Word[];
    const patterns = lessons.flatMap((l) => data.grammar.get(l.grammar ?? "")?.patterns ?? []) as Pattern[];
    // weeks 1-2 have no new words: test N4 words instead
    const pool = words.length ? words : data.wordList.filter((w) => w.lvl === 4);
    return weeklyTest(pool.slice(0, 120), patterns, data);
  }, [data, week]);

  if (!data || taken === null) return <Loading error={error} />;
  const minutes = Math.max(10, Math.round(items.length * 0.9));
  const ok = results?.filter((r) => r.ok).length ?? 0;
  const pct = results ? Math.round((ok / results.length) * 100) : 0;

  return (
    <div className="grid gap-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid gap-1">
          <span className="label-mono">Week {week} · day 7 · 実戦問題</span>
          <h1 className="font-heading text-4xl font-bold tracking-tight">Week {week} test</h1>
        </div>
        {phase === "run" && <span className="font-mono text-2xl font-semibold">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} <span className="text-sm text-muted-foreground">/ {minutes}:00</span></span>}
      </header>
      {phase === "intro" && (
        <Panel>
          <p>{items.length} questions in JLPT order: <Ja>漢字読み, 表記, 文脈規定</Ja>, meaning, then <Ja>文法形式</Ja>. Aim to finish in {minutes} minutes. The questions are new, not the ones you practised.</p>
          {taken && <p className="rounded-lg bg-sand p-3 text-sm">You've taken this week's test already. A retake is recorded but doesn't replace your first score, because repeating a test inflates it.</p>}
          <Button className="h-11 w-fit px-5" disabled={!items.length} onClick={() => { t0.current = Date.now(); setPhase("run"); }}>Start the test</Button>
        </Panel>
      )}
      {phase === "run" && (
        <Panel>
          <Quiz items={items} title={`Week ${week}`} onDone={async (r) => {
            const types = [...new Set(r.map((x) => x.item.type))];
            const at = Date.now();
            for (const t of types) {
              const mine = r.filter((x) => x.item.type === t);
              await db.attempts.add({ kind: "test", ref: taken ? `week-${week}-retake` : `week-${week}`, type: t, ok: mine.filter((x) => x.ok).length, total: mine.length, ms: mine.reduce((s, x) => s + x.ms, 0), at });
            }
            setResults(r); setPhase("done");
          }} />
        </Panel>
      )}
      {phase === "done" && results && (
        <Panel title={<>Band {band(pct)} · {pct}%</>}>
          <p className="text-sm text-muted-foreground">Bands use the official reference scale: A is 67% or more, B is 34–66%, C is under 34%. This is a practice score, not a predicted JLPT score.</p>
          <Summary results={results} />
          <a className="text-primary-strong underline underline-offset-4" href={url("/")}>Back to Today</a>
        </Panel>
      )}
    </div>
  );
}
