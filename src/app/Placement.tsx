import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db, getSetting, setSetting, type CardKind } from "./db";
import { addCards } from "./srs";
import { url, type Data, type Word } from "./data";
import { shuffle, structuredItem, type Item } from "./gen";
import { Ja, Loading, Panel, Quiz, Summary, useData, type QuizResult } from "./ui";
import type { Placement as P } from "./status";

type Tab = "words" | "kanji" | "grammar";

export default function Placement() {
  const { data, error } = useData();
  const [placement, setPlacement] = useState<P | null>(null);
  const [tab, setTab] = useState<Tab>("words");
  const retest = typeof location !== "undefined" && new URLSearchParams(location.search).has("retest");

  useEffect(() => {
    getSetting<P>("placement", { words: false, kanji: false, grammar: false }).then((p) => {
      setPlacement(p);
      setTab(!p.words ? "words" : !p.kanji ? "kanji" : "grammar");
    });
  }, []);

  if (!data || !placement) return <Loading error={error} />;
  if (retest) return <Retest data={data} />;

  const finish = async (k: Tab) => {
    const p = { ...placement, [k]: true };
    await setSetting("placement", p);
    setPlacement(p);
    const order: Tab[] = ["words", "kanji", "grammar"];
    const nextTab = order.find((t) => !p[t]);
    if (nextTab) setTab(nextTab);
  };

  return (
    <div className="grid gap-6 py-8">
      <header className="grid gap-2">
        <span className="label-mono">Weeks 1–2 · N4 bridge</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">N4 placement</h1>
        <p className="max-w-[65ch] text-muted-foreground">Mark what you already know. Words and kanji you're unsure of become cards. Grammar groups you miss stay in the N4 refresh lessons. One in ten "known" words is retested in week 3.</p>
      </header>
      <div role="tablist" aria-label="Placement parts" className="flex w-fit flex-wrap gap-1 rounded-xl bg-muted p-1">
        {(["words", "kanji", "grammar"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)}
            className={cn("min-h-11 rounded-lg px-4 text-sm font-semibold capitalize", tab === t ? "bg-card" : "text-muted-foreground")}>
            {t} {placement[t] && "✓"}
          </button>
        ))}
      </div>
      {tab === "words" && <Sort key="w" kind="w" data={data} done={placement.words} onFinish={() => finish("words")} />}
      {tab === "kanji" && <Sort key="k" kind="k" data={data} done={placement.kanji} onFinish={() => finish("kanji")} />}
      {tab === "grammar" && <GrammarCheck data={data} done={placement.grammar} onFinish={() => finish("grammar")} />}
      {placement.words && placement.kanji && placement.grammar && (
        <Panel>
          <p>Placement is complete. Start the N4 refresh lessons from <a className="text-primary-strong underline underline-offset-4" href={url("/")}>Today</a>.</p>
        </Panel>
      )}
    </div>
  );
}

function Sort({ kind, data, done, onFinish }: { kind: CardKind; data: Data; done: boolean; onFinish: () => void }) {
  const items = useMemo(
    () => (kind === "w" ? data.wordList.filter((w) => w.lvl === 4).map((w) => ({ id: w.id, front: w.w, back: `${w.r} · ${w.m}`, say: w.w })) : data.kanjiList.filter((k) => k.lvl === 4).map((k) => ({ id: k.k, front: k.k, back: `${[...k.on, ...k.kun].join("、")} · ${k.m.join(", ")}`, say: "" }))),
    [kind, data],
  );
  const [sorted, setSorted] = useState<Set<string> | null>(null);
  const [last, setLast] = useState<{ front: string; back: string; answer: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = async () => setSorted(new Set((await db.sorted.where("kind").equals(kind).toArray()).map((r) => r.id)));

  useEffect(() => {
    db.sorted.where("kind").equals(kind).toArray().then((rows) => setSorted(new Set(rows.map((r) => r.id))));
  }, [kind]);

  const queue = useMemo(() => (sorted ? items.filter((x) => !sorted.has(x.id)) : []), [items, sorted]);
  const cur = queue[0];

  const answer = async (a: "know" | "unsure" | "dont") => {
    if (!cur || busy) return;
    setBusy(true);
    await db.sorted.put({ id: cur.id, kind, answer: a, retest: a === "know" && Math.random() < 0.1 ? 1 : 0, at: Date.now() });
    if (a !== "know") await addCards(kind, [cur.id], 0);
    setLast({ front: cur.front, back: cur.back, answer: a });
    await reload();
    setBusy(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") answer("know");
      if (e.key === "2") answer("unsure");
      if (e.key === "3") answer("dont");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!sorted) return <Loading />;
  const total = items.length;
  if (!cur) {
    return (
      <Panel title={`${kind === "w" ? "Words" : "Kanji"} sorted`}>
        <p className="text-muted-foreground">All {total} N4 {kind === "w" ? "words" : "kanji"} are sorted.</p>
        {!done && <Button className="h-11 w-fit px-5" onClick={onFinish}>Continue</Button>}
      </Panel>
    );
  }
  return (
    <Panel label={`${total - queue.length + 1} / ${total} · keys 1, 2, 3`}>
      <div className="grid place-items-center gap-2 py-8">
        <Ja className="text-6xl font-medium">{cur.front}</Ja>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button className="h-12" disabled={busy} onClick={() => answer("know")}>I know it</Button>
        <Button variant="outline" className="h-12" disabled={busy} onClick={() => answer("unsure")}>Unsure</Button>
        <Button variant="outline" className="h-12" disabled={busy} onClick={() => answer("dont")}>Don't know</Button>
      </div>
      {last && (
        <p className="rounded-lg bg-muted p-3 text-sm">
          Last: <Ja className="font-semibold">{last.front}</Ja> <Ja>{last.back}</Ja> · {last.answer === "know" ? "marked known" : "added to cards"}
        </p>
      )}
      <Button variant="ghost" className="h-11 w-fit text-muted-foreground" disabled={busy} onClick={async () => {
        setBusy(true);
        const rest = queue.map((x) => x.id);
        await db.sorted.bulkPut(rest.map((id) => ({ id, kind, answer: "dont" as const, retest: 0 as const, at: Date.now() })));
        await addCards(kind, rest, 0);
        await reload();
        setBusy(false);
      }}>Add all remaining as cards</Button>
    </Panel>
  );
}

function GrammarCheck({ data, done, onFinish }: { data: Data; done: boolean; onFinish: () => void }) {
  const lessons = useMemo(() => [...data.grammar.values()].filter((g) => g.level === 4), [data]);
  const items = useMemo(() => shuffle(lessons.flatMap((g) => g.patterns.map((p) => structuredItem(p, g.patterns, 0)).filter(Boolean) as Item[])), [lessons]);
  const [results, setResults] = useState<QuizResult[] | null>(null);

  if (!lessons.length) return <Panel><p>No N4 grammar lessons are written yet.</p></Panel>;
  if (results) {
    return (
      <Panel title="Grammar check">
        <Summary results={results} />
        {!done && <Button className="h-11 w-fit px-5" onClick={onFinish}>Save and continue</Button>}
      </Panel>
    );
  }
  return (
    <Panel label="Read each sentence and choose what the underlined part means">
      <Quiz items={items} title="N4 grammar" onDone={async (r) => {
        const known: string[] = [];
        for (const g of lessons) {
          const mine = r.filter((x) => g.patterns.some((p) => p.id === x.item.ref));
          const ok = mine.filter((x) => x.ok).length;
          await db.attempts.add({ kind: "placement-grammar", ref: g.id, type: "意味理解", ok, total: mine.length, ms: mine.reduce((s, x) => s + x.ms, 0), at: Date.now() });
          if (mine.length && ok === mine.length) known.push(g.id);
        }
        await setSetting("n4GrammarKnown", known);
        setResults(r);
      }} />
    </Panel>
  );
}

function Retest({ data }: { data: Data }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [results, setResults] = useState<QuizResult[] | null>(null);
  useEffect(() => {
    (async () => {
      const rows = await db.sorted.where("retest").equals(1).toArray();
      const pool = data.wordList.filter((w) => w.lvl === 4);
      const ws = rows.map((r) => data.words.get(r.id)).filter(Boolean) as Word[];
      setItems(ws.map((w) => {
        const opts = shuffle([w.m, ...shuffle(pool.filter((x) => x.id !== w.id)).slice(0, 3).map((x) => x.m)]);
        return { type: "意味", prompt: w.w, opts, a: opts.indexOf(w.m), explain: `${w.w}（${w.r}）: ${w.m}`, ref: w.id, say: w.w } as Item;
      }));
    })();
  }, [data]);
  if (!items) return <Loading />;
  return (
    <div className="grid gap-6 py-8">
      <h1 className="font-heading text-4xl font-bold tracking-tight">Retest of known N4 words</h1>
      <Panel>
        {!items.length && <p>Nothing to retest.</p>}
        {items.length > 0 && !results && (
          <Quiz items={items} title="Retest" onDone={async (r) => {
            const missed = r.filter((x) => !x.ok).map((x) => x.item.ref);
            await addCards("w", missed, 0);
            await db.sorted.bulkPut((await db.sorted.bulkGet(r.map((x) => x.item.ref))).filter(Boolean).map((s) => ({ ...s!, retest: 0 as const })));
            await db.attempts.add({ kind: "retest", ref: "n4-known", type: "意味", ok: r.length - missed.length, total: r.length, ms: r.reduce((s, x) => s + x.ms, 0), at: Date.now() });
            setResults(r);
          }} />
        )}
        {results && <><Summary results={results} /><p className="text-sm text-muted-foreground">Missed words are now cards. If you missed more than one in five, consider re-sorting the N4 words.</p></>}
      </Panel>
    </div>
  );
}

