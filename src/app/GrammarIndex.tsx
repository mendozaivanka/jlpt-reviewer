import { useState } from "react";
import { cn } from "@/lib/utils";
import GrammarView from "./GrammarView";
import { Ja, Loading, Panel, useData } from "./ui";

export default function GrammarIndex() {
  const { data, error } = useData();
  const [level, setLevel] = useState<3 | 4>(4);
  if (!data) return <Loading error={error} />;
  const lessons = [...data.grammar.values()].filter((g) => g.level === level);
  return (
    <div className="grid gap-6 py-8">
      <header className="grid gap-2">
        <span className="label-mono">Three look-alike patterns per lesson</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Grammar</h1>
        <p className="max-w-[70ch] text-muted-foreground">Every pattern is written for this review. If an example looks wrong, flag it and it leaves your drills until it's fixed.</p>
      </header>
      <div role="tablist" className="flex w-fit gap-1 rounded-xl bg-muted p-1">
        {([4, 3] as const).map((l) => (
          <button key={l} role="tab" aria-selected={level === l} type="button" onClick={() => setLevel(l)} className={cn("min-h-11 rounded-lg px-4 text-sm font-semibold", level === l ? "bg-card" : "text-muted-foreground")}>N{l}</button>
        ))}
      </div>
      {lessons.map((g) => (
        <Panel key={g.id} label={g.id} title={<><Ja>{g.titleJa}</Ja> · {g.title}</>}>
          <GrammarView lesson={g} />
        </Panel>
      ))}
      {level === 3 && <p className="text-sm text-muted-foreground">{lessons.length} of 60 N3 grammar lessons are written. The rest are added one course week ahead of study.</p>}
    </div>
  );
}
