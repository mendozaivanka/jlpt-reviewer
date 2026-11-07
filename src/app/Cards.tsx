import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { db, type CardRow } from "./db";
import { dueCards, previews, review, type Grade } from "./srs";
import { url, type Data } from "./data";
import { speak } from "./speak";
import { FlagButton, Ja, Loading, Panel, SpeakButton, useData } from "./ui";

export default function Cards() {
  const { data, error } = useData();
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [shown, setShown] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const started = useRef(Date.now());
  const card = queue?.[0];

  useEffect(() => { dueCards().then(setQueue); }, []);
  useEffect(() => {
    started.current = Date.now();
    setShown(false);
    if (card) previews(card).then(setLabels);
  }, [card?.id, count]);

  const reveal = () => {
    setShown(true);
    if (card && data) {
      const w = card.kind === "w" ? data.words.get(card.ref) : null;
      if (w) speak(w.w);
    }
  };
  const rate = async (g: Grade) => {
    if (!card) return;
    await review(card, g, Date.now() - started.current);
    setCount((c) => c + 1);
    const updated = await db.cards.get(card.id);
    setQueue((q) => {
      const rest = (q ?? []).slice(1);
      // cards rated Again come back in this session once their short step is due
      if (updated && updated.due - Date.now() < 20 * 60000) rest.push(updated);
      return rest;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); if (!shown) reveal(); }
      if (shown && ["1", "2", "3", "4"].includes(e.key)) rate(Number(e.key) as Grade);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!data || !queue) return <Loading error={error} />;
  return (
    <div className="grid gap-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid gap-1">
          <span className="label-mono">FSRS review · space to reveal · 1–4 to rate</span>
          <h1 className="font-heading text-4xl font-bold tracking-tight">Cards</h1>
        </div>
        <span className="font-mono text-sm text-muted-foreground">{count} done · {queue.length} left</span>
      </header>
      {!card ? (
        <Panel>
          <p>No cards are due. {count > 0 ? "Good work." : ""} New cards arrive with each lesson.</p>
          <a className="text-primary-strong underline underline-offset-4" href={url("/")}>Back to Today</a>
        </Panel>
      ) : (
        <Panel className="min-h-[420px]">
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-primary-foreground">{card.kind === "w" ? "Word" : "Kanji"}</span>
            <span className="rounded-full bg-secondary px-2.5 py-0.5">{card.lesson ? `Lesson ${card.lesson}` : "N4 placement"}</span>
            {card.fsrs.state === 0 && <span className="rounded-full bg-sand px-2.5 py-0.5">New</span>}
            {card.fsrs.lapses > 0 && <span className="rounded-full bg-rosas-1 px-2.5 py-0.5">{card.fsrs.lapses} lapse{card.fsrs.lapses > 1 ? "s" : ""}</span>}
          </div>
          <Face card={card} data={data} shown={shown} />
          {!shown ? (
            <Button className="h-12 w-fit place-self-center px-8" onClick={reveal}>Show answer</Button>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["Again", "Hard", "Good", "Easy"] as const).map((name, i) => (
                <Button key={name} variant={name === "Good" ? "default" : "outline"} className="h-14 flex-col gap-0" onClick={() => rate((i + 1) as Grade)}>
                  <span className="font-semibold">{name}</span>
                  <span className="font-mono text-[11px] opacity-80">{labels[i]} · {i + 1}</span>
                </Button>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function Face({ card, data, shown }: { card: CardRow; data: Data; shown: boolean }) {
  if (card.kind === "w") {
    const w = data.words.get(card.ref);
    if (!w) return <p>Missing word {card.ref}</p>;
    return (
      <div className="grid gap-4 py-6">
        <Ja className="text-center text-6xl font-medium">{w.w}</Ja>
        {shown && (
          <div className="grid gap-3">
            <div className="flex items-center justify-center gap-3"><Ja className="text-2xl text-primary-strong">{w.r}</Ja><SpeakButton text={w.w} /></div>
            <p className="text-center text-lg font-semibold">{w.m}</p>
            {w.ex && (
              <div className="grid gap-1 rounded-lg bg-muted p-3">
                <div className="flex items-start gap-2"><Ja className="text-lg">{w.ex.ja}</Ja><SpeakButton text={w.ex.ja} className="ml-auto shrink-0" /></div>
                <span className="text-sm text-muted-foreground">{w.ex.en} · Tatoeba, CC BY</span>
              </div>
            )}
            <FlagButton refId={w.id} note={`card ${w.w}`} />
          </div>
        )}
      </div>
    );
  }
  const k = data.kanji.get(card.ref);
  if (!k) return <p>Missing kanji {card.ref}</p>;
  return (
    <div className="grid gap-4 py-6">
      <Ja className="text-center text-8xl">{k.k}</Ja>
      {!shown && <p className="text-center text-sm text-muted-foreground">Recall its readings, meaning and one word that uses it.</p>}
      {shown && (
        <div className="grid gap-2 text-center">
          <Ja className="text-lg">音 {k.on.join("、") || "–"}　訓 {k.kun.join("、") || "–"}</Ja>
          <p className="font-semibold">{k.m.join(", ")}</p>
          <ul className="grid gap-1">
            {k.w.map((id) => data.words.get(id)).filter(Boolean).map((w) => <li key={w!.id}><Ja className="font-medium">{w!.w}</Ja> <Ja className="text-muted-foreground">{w!.r}</Ja> · {w!.m.slice(0, 50)}</li>)}
          </ul>
          <FlagButton refId={k.k} note={`kanji ${k.k}`} />
        </div>
      )}
    </div>
  );
}
