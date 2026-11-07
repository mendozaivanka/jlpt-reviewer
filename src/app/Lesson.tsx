import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db, getSetting } from "./db";
import { addCards } from "./srs";
import { url, type Data, type Kanji, type Lesson as L, type Word } from "./data";
import { dailyPractice, grammarTestItem, shuffle, structuredItem, type Item } from "./gen";
import GrammarView from "./GrammarView";
import { FlagButton, Ja, Loading, Panel, Quiz, SpeakButton, Summary, useData, type QuizResult } from "./ui";

export default function Lesson() {
  const { data, error } = useData();
  const n = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("n") ?? 1) : 1;
  const lesson = data?.course.lessons.find((l) => l.n === n);
  const [done, setDone] = useState(false);
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  const mark = (k: string) => setSteps((s) => ({ ...s, [k]: true }));

  useEffect(() => {
    db.done.get(n).then((d) => setDone(!!d));
  }, [n]);

  if (!data) return <Loading error={error} />;
  if (!lesson) return <Loading error={`Lesson ${n} does not exist.`} />;
  const week = data.course.weeks.find((w) => w.week === lesson.week);
  const grammar = lesson.grammar ? data.grammar.get(lesson.grammar) : undefined;
  const words = lesson.words.map((id) => data.words.get(id)).filter(Boolean) as Word[];
  const kanji = lesson.kanji.map((k) => data.kanji.get(k)).filter(Boolean) as Kanji[];
  const required = lesson.kind === "n4" ? ["grammar"] : ["refresh", "words", "kanji", ...(grammar ? ["grammar"] : []), "practice"];
  const ready = required.every((k) => steps[k]);
  const next = data.course.lessons.find((l) => l.n === n + 1);

  const complete = async () => {
    await db.done.put({ n, at: Date.now() });
    setDone(true);
  };

  return (
    <div className="grid gap-6 py-8">
      <header className="grid gap-2">
        <span className="label-mono">Week {lesson.week} · day {lesson.day} · {week?.label}{week?.theme ? ` · ${week.theme.ja}` : ""}</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Lesson {lesson.n} · {lesson.title}</h1>
        {lesson.n === 1 && <p className="text-muted-foreground">Do the <a className="text-primary-strong underline underline-offset-4" href={url("/placement/")}>N4 placement</a> first if you haven't.</p>}
        {lesson.kind === "n3" && <p className="text-muted-foreground">Topic words first, then the most common everyday N3 words. {done && "You've completed this lesson. You can go through it again."}</p>}
      </header>

      <Checklist lesson={lesson} words={words} data={data} steps={steps} />

      {lesson.kind === "n3" && (
        <>
          <Refresh lesson={lesson} data={data} onDone={() => mark("refresh")} />
          <NewWords lesson={lesson} words={words} onDone={() => mark("words")} />
          <KanjiStep lesson={lesson} kanji={kanji} data={data} onDone={() => mark("kanji")} />
        </>
      )}
      {grammar ? <GrammarStep lessonId={grammar.id} data={data} onDone={() => mark("grammar")} /> : lesson.grammar && (
        <Panel label="Grammar"><p className="text-muted-foreground">Grammar lesson <Ja>{lesson.grammar}</Ja> is not written yet. Today's lesson counts without it.</p></Panel>
      )}
      {lesson.kind === "n3" && <Practice words={words} data={data} lessonN={n} onDone={() => mark("practice")} />}

      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="h-11 px-5" disabled={!ready && !done} onClick={complete}>{done ? "Lesson done" : "Mark lesson done"}</Button>
          {!ready && !done && <span className="text-sm text-muted-foreground">Finish each step above first.</span>}
          {next && done && <a className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")} href={url("/")}>Back to Today</a>}
        </div>
      </Panel>
    </div>
  );
}

function Checklist({ lesson, words, data, steps }: { lesson: L; words: Word[]; data: Data; steps: Record<string, boolean> }) {
  const g = lesson.grammar ? data.grammar.get(lesson.grammar) : undefined;
  return (
    <Panel label="今日の表現 · today's checklist">
      <ul className="flex flex-wrap gap-2">
        {words.map((w) => <li key={w.id} className={cn("rounded-full px-3 py-1 text-sm", steps.words ? "bg-moss" : "bg-muted")}><Ja>{w.w}</Ja></li>)}
        {lesson.kanji.map((k) => <li key={k} className={cn("rounded-full px-3 py-1 text-sm", steps.kanji ? "bg-moss" : "bg-heather")}><Ja>{k}</Ja></li>)}
        {g?.patterns.map((p) => <li key={p.id} className={cn("rounded-full px-3 py-1 text-sm", steps.grammar ? "bg-moss" : "bg-fjord")}><Ja>{p.p}</Ja></li>)}
      </ul>
    </Panel>
  );
}

function Refresh({ lesson, data, onDone }: { lesson: L; data: Data; onDone: () => void }) {
  const ws = useMemo(() => lesson.n4.map((id) => data.words.get(id)).filter(Boolean) as Word[], [lesson, data]);
  const [answers, setAnswers] = useState<Record<string, "ok" | "miss">>({});
  const all = ws.every((w) => answers[w.id]);
  useEffect(() => { if (all) onDone(); }, [all]);
  const answer = async (w: Word, a: "ok" | "miss") => {
    setAnswers((s) => ({ ...s, [w.id]: a }));
    if (a === "miss") await addCards("w", [w.id], lesson.n);
  };
  return (
    <Panel label="Step 1 · N4 recheck" title="Words you should already know">
      <p className="text-sm text-muted-foreground">Read each word. Tap whether you knew its reading and meaning. Missed words become cards.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ws.map((w) => (
          <div key={w.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="grid">
              <Ja className="text-xl">{w.w}</Ja>
              {answers[w.id] && <span className="text-sm text-muted-foreground"><Ja>{w.r}</Ja> · {w.m}</span>}
            </div>
            <div className="ml-auto flex gap-1">
              {answers[w.id] ? <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", answers[w.id] === "ok" ? "bg-moss" : "bg-sand")}>{answers[w.id] === "ok" ? "Knew it" : "Card added"}</span> : (
                <>
                  <Button size="sm" className="h-11" onClick={() => answer(w, "ok")}>Knew it</Button>
                  <Button size="sm" variant="outline" className="h-11" onClick={() => answer(w, "miss")}>Missed</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {!ws.length && <p className="text-sm text-muted-foreground">No N4 words for this lesson.</p>}
    </Panel>
  );
}

function NewWords({ lesson, words, onDone }: { lesson: L; words: Word[]; onDone: () => void }) {
  const [added, setAdded] = useState<number | null>(null);
  return (
    <Panel label="Step 2 · new N3 words" title={`${words.length} words`}>
      <ul className="grid gap-2">
        {words.map((w) => (
          <li key={w.id} className="grid gap-1 rounded-lg border border-border p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <div className="grid">
              <Ja className="text-xl font-medium">{w.w}</Ja>
              <Ja className="text-sm text-primary-strong">{w.r}</Ja>
            </div>
            <div className="grid text-sm">
              <span>{w.m}</span>
              {w.ex && <span className="text-muted-foreground"><Ja>{w.ex.ja}</Ja> {w.ex.en}</span>}
            </div>
            <div className="flex items-center gap-1">
              <SpeakButton text={w.ex?.ja ?? w.w} />
              <FlagButton refId={w.id} note={`word ${w.w}`} />
            </div>
          </li>
        ))}
      </ul>
      <Button className="h-11 w-fit px-5" disabled={added !== null} onClick={async () => { setAdded(await addCards("w", words.map((w) => w.id), lesson.n)); onDone(); }}>
        {added === null ? `Add ${words.length} words to my cards` : `Added ${added} cards`}
      </Button>
    </Panel>
  );
}

function KanjiStep({ lesson, kanji, data, onDone }: { lesson: L; kanji: Kanji[]; data: Data; onDone: () => void }) {
  const [added, setAdded] = useState<number | null>(null);
  useEffect(() => { if (!kanji.length) onDone(); }, [kanji.length]);
  if (!kanji.length) return null;
  return (
    <Panel label="Step 3 · kanji" title={<Ja>{kanji.map((k) => k.k).join("　")}</Ja>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {kanji.map((k) => (
          <article key={k.k} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg border border-border p-3">
            <Ja className="text-6xl leading-none">{k.k}</Ja>
            <div className="grid content-start gap-1 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{k.st} strokes · N{k.lvl}</span>
              <Ja>音 {k.on.join("、") || "–"}　訓 {k.kun.join("、") || "–"}</Ja>
              <span>{k.m.join(", ")}</span>
              <ul className="grid gap-0.5">
                {k.w.map((id) => data.words.get(id)).filter(Boolean).map((w) => <li key={w!.id}><Ja className="font-medium">{w!.w}</Ja> <Ja className="text-muted-foreground">{w!.r}</Ja> {w!.m.slice(0, 40)}</li>)}
              </ul>
            </div>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Write each kanji three times, on paper or in the air, before adding it.</p>
      <Button className="h-11 w-fit px-5" disabled={added !== null} onClick={async () => { setAdded(await addCards("k", kanji.map((k) => k.k), lesson.n)); onDone(); }}>
        {added === null ? `Add ${kanji.length} kanji cards` : `Added ${added} cards`}
      </Button>
    </Panel>
  );
}

function GrammarStep({ lessonId, data, onDone }: { lessonId: string; data: Data; onDone: () => void }) {
  const g = data.grammar.get(lessonId)!;
  const [known, setKnown] = useState(false);
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => { getSetting<string[]>("n4GrammarKnown", []).then((k) => setKnown(k.includes(lessonId))); }, [lessonId]);
  const items = useMemo(() => {
    const structured = g.patterns.flatMap((p) => p.ex.map((_, i) => structuredItem(p, g.patterns, i))).filter(Boolean) as Item[];
    const tests = g.patterns.map(grammarTestItem).filter(Boolean) as Item[];
    return [...shuffle(structured), ...tests];
  }, [g, round]);
  return (
    <Panel label={`Step ${g.level === 4 ? 1 : 4} · grammar`} title={<><Ja>{g.titleJa}</Ja> · {g.title}</>}>
      {known && <p className="rounded-lg bg-moss p-3 text-sm">You got this group right in placement. Skim it and do the check.</p>}
      <GrammarView lesson={g} />
      <div className="grid gap-3 rounded-xl bg-muted/50 p-4">
        <span className="label-mono">Check · meaning first, then the form</span>
        {results ? <Summary results={results} onRetry={() => { setResults(null); setRound((r) => r + 1); }} /> : (
          <Quiz key={round} items={items} title="Grammar" onDone={async (r) => {
            await db.attempts.add({ kind: "practice", ref: lessonId, type: "grammar", ok: r.filter((x) => x.ok).length, total: r.length, ms: r.reduce((s, x) => s + x.ms, 0), at: Date.now() });
            setResults(r); onDone();
          }} />
        )}
      </div>
    </Panel>
  );
}

function Practice({ words, data, lessonN, onDone }: { words: Word[]; data: Data; lessonN: number; onDone: () => void }) {
  const [round, setRound] = useState(0);
  const items = useMemo(() => dailyPractice(words, data), [words, data, round]);
  const [results, setResults] = useState<QuizResult[] | null>(null);
  return (
    <Panel label="Step 5 · れんしゅう" title="Daily practice">
      {results ? <Summary results={results} onRetry={() => { setResults(null); setRound((r) => r + 1); }} /> : (
        <Quiz key={round} items={items} title="Practice" onDone={async (r) => {
          await db.attempts.add({ kind: "practice", ref: `lesson-${lessonN}`, type: "vocab", ok: r.filter((x) => x.ok).length, total: r.length, ms: r.reduce((s, x) => s + x.ms, 0), at: Date.now() });
          setResults(r); onDone();
        }} />
      )}
      {results && <span className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4" aria-hidden="true" /> Practice saved</span>}
    </Panel>
  );
}
