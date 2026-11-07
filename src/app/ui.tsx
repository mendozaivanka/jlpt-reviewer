import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Volume2, Flag, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadData, type Data } from "./data";
import { speak, canSpeak } from "./speak";
import { db } from "./db";
import type { Item } from "./gen";
import { toast } from "@/lib/toast";

export function useData() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadData().then(setData, (e) => setError(String(e?.message ?? e)));
  }, []);
  return { data, error };
}

export function Loading({ error }: { error?: string | null }) {
  return <p className="py-16 text-muted-foreground">{error ? `Something went wrong: ${error}` : "Loading…"}</p>;
}

export const Ja = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span lang="ja" className={className}>{children}</span>
);

export function SpeakButton({ text, className }: { text: string; className?: string }) {
  if (!canSpeak()) return null;
  return (
    <Button type="button" variant="outline" size="icon-lg" className={cn("size-11 rounded-lg", className)} aria-label="Play audio" onClick={() => speak(text)}>
      <Volume2 aria-hidden="true" />
    </Button>
  );
}

export async function flagItem(ref: string, note: string) {
  await db.flags.put({ id: ref, note, at: Date.now() });
  const card = await db.cards.get(`w:${ref}`) ?? await db.cards.get(`k:${ref}`);
  if (card) await db.cards.update(card.id, { suspended: 1 });
  toast.success("Flagged. The item leaves your cards and drills until you clear the flag on the Progress page.");
}

export function FlagButton({ refId, note }: { refId: string; note: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-11 text-muted-foreground" onClick={() => flagItem(refId, note)}>
      <Flag aria-hidden="true" /> Flag as wrong
    </Button>
  );
}

export function Panel({ title, label, children, className }: { title?: ReactNode; label?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6", className)}>
      {(label || title) && (
        <header className="grid gap-1">
          {label && <span className="label-mono">{label}</span>}
          {title && <h2 className="font-heading text-xl font-semibold">{title}</h2>}
        </header>
      )}
      {children}
    </section>
  );
}

function Prompt({ item }: { item: Item }) {
  if (!item.focus || !item.prompt.includes(item.focus)) {
    return <Ja className="text-2xl leading-relaxed">{item.prompt.split("（　）").flatMap((p, i) => (i ? [<span key={i} className="mx-1 inline-block min-w-16 border-b-2 border-foreground align-baseline">&nbsp;</span>, p] : [p]))}</Ja>;
  }
  const [a, ...rest] = item.prompt.split(item.focus);
  return (
    <Ja className="text-2xl leading-relaxed">
      {a}<span className="underline decoration-rosas-4 decoration-2 underline-offset-8">{item.focus}</span>{rest.join(item.focus)}
    </Ja>
  );
}

export type QuizResult = { item: Item; chosen: number; ok: boolean; ms: number };

/** Runs a list of items one at a time with feedback, then calls onDone with the results. */
export function Quiz({ items, onDone, title }: { items: Item[]; onDone: (r: QuizResult[]) => void; title?: string }) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const started = useRef(Date.now());
  const item = items[i];

  useEffect(() => {
    started.current = Date.now();
  }, [i]);

  const choose = (k: number) => {
    if (chosen !== null) return;
    setChosen(k);
    setResults((r) => [...r, { item, chosen: k, ok: k === item.a, ms: Date.now() - started.current }]);
  };
  const next = () => {
    if (i + 1 >= items.length) onDone([...results]);
    else { setI(i + 1); setChosen(null); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= item.opts.length) choose(n - 1);
      if (e.key === "Enter" && chosen !== null) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item) return null;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-mono">{title ? `${title} · ` : ""}{item.type} · {i + 1} / {items.length}</span>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full bg-rosas-4" style={{ width: `${(i / items.length) * 100}%` }} />
        </div>
      </div>
      <Prompt item={item} />
      <div className={cn("grid gap-2", item.opts.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2")} role="group" aria-label="Options">
        {item.opts.map((o, k) => {
          const isRight = chosen !== null && k === item.a;
          const isWrong = chosen === k && k !== item.a;
          return (
            <button
              key={k}
              type="button"
              onClick={() => choose(k)}
              disabled={chosen !== null}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-lg border px-4 py-2 text-left text-base transition-colors",
                chosen === null && "border-border bg-background hover:bg-muted",
                isRight && "border-transparent bg-moss font-semibold",
                isWrong && "border-transparent bg-rosas-2",
                chosen !== null && !isRight && !isWrong && "border-border opacity-60",
              )}
            >
              <span className="font-mono text-xs text-muted-foreground">{k + 1}</span>
              <Ja>{o}</Ja>
              {isRight && <Check className="ml-auto size-4" aria-label="correct" />}
              {isWrong && <X className="ml-auto size-4" aria-label="your answer" />}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <div className="grid gap-3 rounded-lg bg-muted p-4">
          <p className="text-sm">
            <strong>{chosen === item.a ? "Correct." : "Not quite."}</strong> <Ja>{item.explain}</Ja>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" className="h-11 px-5" onClick={next}>{i + 1 >= items.length ? "See results" : "Next"}</Button>
            {item.say && <SpeakButton text={item.say} />}
            <FlagButton refId={item.ref} note={`${item.type}: ${item.prompt}`} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Summary({ results, onRetry }: { results: QuizResult[]; onRetry?: () => void }) {
  const byType = useMemo(() => {
    const m = new Map<string, { ok: number; total: number }>();
    for (const r of results) {
      const t = m.get(r.item.type) ?? { ok: 0, total: 0 };
      t.total++; if (r.ok) t.ok++;
      m.set(r.item.type, t);
    }
    return [...m.entries()];
  }, [results]);
  const ok = results.filter((r) => r.ok).length;
  return (
    <div className="grid gap-4">
      <p className="font-heading text-3xl font-semibold">{ok} / {results.length}</p>
      <ul className="grid gap-1 text-sm">
        {byType.map(([t, s]) => (
          <li key={t} className="flex justify-between border-b border-border py-1.5"><Ja>{t}</Ja><span className="font-mono">{s.ok} / {s.total}</span></li>
        ))}
      </ul>
      {results.some((r) => !r.ok) && (
        <div className="grid gap-1 text-sm">
          <span className="label-mono">Missed</span>
          {results.filter((r) => !r.ok).map((r, k) => <Ja key={k} className="text-muted-foreground">{r.item.explain}</Ja>)}
        </div>
      )}
      {onRetry && <Button type="button" variant="outline" className="h-11 w-fit" onClick={onRetry}>Try a new set</Button>}
    </div>
  );
}
