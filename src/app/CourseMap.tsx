import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { db } from "./db";
import { url } from "./data";
import { Ja, Loading, Panel, useData } from "./ui";

export default function CourseMap() {
  const { data, error } = useData();
  const [done, setDone] = useState<Set<number> | null>(null);
  const [tests, setTests] = useState<Set<string>>(new Set());
  useEffect(() => {
    db.done.toArray().then((d) => setDone(new Set(d.map((x) => x.n))));
    db.attempts.where("kind").equals("test").toArray().then((a) => setTests(new Set(a.map((x) => x.ref))));
  }, []);
  if (!data || !done) return <Loading error={error} />;
  const { course } = data;
  return (
    <div className="grid gap-6 py-8">
      <header className="grid gap-2">
        <span className="label-mono">24 weeks · six lessons and a test each week</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Course</h1>
        <p className="max-w-[70ch] text-muted-foreground">
          {course.meta.counts.n3InLessons} of {course.meta.counts.n3} N3 words are in lessons. The other {course.meta.counts.extra}, the least common, form an optional pool you can unlock on the Progress page when reviews are light.
        </p>
      </header>
      {course.weeks.map((w) => {
        const ls = course.lessons.filter((l) => l.week === w.week);
        return (
          <Panel key={w.week} label={`Week ${w.week} · phase ${w.phase}`} title={<>{w.label}{w.theme && <Ja className="ml-2 text-base font-normal text-muted-foreground">{w.theme.ja}</Ja>}</>}>
            {ls.length ? (
              <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ls.map((l) => (
                  <li key={l.n}>
                    <a href={url(`/lesson/?n=${l.n}`)} className={cn("grid min-h-11 gap-0.5 rounded-lg border p-3 text-sm hover:bg-muted", done.has(l.n) ? "border-transparent bg-moss" : "border-border")}>
                      <span className="font-semibold">Day {l.day} · {l.title}</span>
                      <span className="text-muted-foreground">{l.kind === "n3" ? `${l.words.length} words · ` : ""}<Ja>{l.kanji.join("")}</Ja>{l.grammar ? ` · ${data.grammar.get(l.grammar)?.titleJa ?? l.grammar}` : ""}</span>
                    </a>
                  </li>
                ))}
                <li>
                  <a href={url(`/test/?week=${w.week}`)} className={cn("grid min-h-11 gap-0.5 rounded-lg border p-3 text-sm hover:bg-muted", tests.has(`week-${w.week}`) ? "border-transparent bg-moss" : "border-border bg-sand")}>
                    <span className="font-semibold">Day 7 · <Ja>実戦問題</Ja></span>
                    <span className="text-muted-foreground">Timed weekly test</span>
                  </a>
                </li>
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">{w.week <= 20 ? "" : "No new lessons. Full mocks in weeks 18, 21 and 23 use the official 公式問題集 on paper. Keep up reviews and reading."}</p>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
