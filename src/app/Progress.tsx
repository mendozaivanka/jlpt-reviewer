import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { db, exportAll, getSetting, importAll, setSetting, type AttemptRow, type FlagRow } from "./db";
import { addCards, reviewMinutes, trueRetention } from "./srs";
import { band } from "./gen";
import { speak } from "./speak";
import { Ja, Loading, Panel, useData } from "./ui";
import { toast } from "@/lib/toast";

export default function Progress() {
  const { data, error } = useData();
  const [start, setStart] = useState("");
  const [retention, setRetention] = useState(0.9);
  const [newPerDay, setNewPerDay] = useState(25);
  const [stats, setStats] = useState<{ cards: number; byState: number[]; reviews: number; minutes: number; ret: number | null; extraAdded: number } | null>(null);
  const [tests, setTests] = useState<AttemptRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      setStart((await getSetting<string | null>("start", null)) ?? "");
      setRetention(await getSetting("retention", 0.9));
      setNewPerDay(await getSetting("newPerDay", 25));
      const cards = await db.cards.toArray();
      const byState = [0, 1, 2, 3].map((s) => cards.filter((c) => c.fsrs.state === s).length);
      setStats({ cards: cards.length, byState, reviews: await db.reviews.count(), minutes: await reviewMinutes(7), ret: await trueRetention(30), extraAdded: await getSetting("extraAdded", 0) });
      setTests(await db.attempts.where("kind").equals("test").toArray());
      setFlags(await db.flags.toArray());
    })();
  }, [tick]);

  if (!data || !stats) return <Loading error={error} />;
  const extra = data.course.extra;
  const testWeeks = [...new Set(tests.map((t) => t.ref))].sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));

  return (
    <div className="grid gap-6 py-8">
      <header className="grid gap-2">
        <span className="label-mono">Stored in this browser only</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Progress</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel label="Schedule">
          <label className="grid gap-1 text-sm">
            <span>Course start date. Day 1 of week 1.</span>
            <input type="date" value={start} onChange={async (e) => { setStart(e.target.value); await setSetting("start", e.target.value || null); }}
              className="min-h-11 w-fit rounded-lg border border-input bg-background px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Desired retention for FSRS: {retention.toFixed(2)}. Use 0.90, raise to 0.93–0.95 in weeks 21–24.</span>
            <input type="range" min={0.85} max={0.95} step={0.01} value={retention} onChange={async (e) => { const v = Number(e.target.value); setRetention(v); await setSetting("retention", v); }} className="w-full accent-[var(--primary-strong)]" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>New cards a day: {newPerDay}. Lesson cards come first, then the placement backlog. Keep it near 20–25.</span>
            <input type="range" min={5} max={60} step={5} value={newPerDay} onChange={async (e) => { const v = Number(e.target.value); setNewPerDay(v); await setSetting("newPerDay", v); }} className="w-full accent-[var(--primary-strong)]" />
          </label>
          <Button variant="outline" className="h-11 w-fit" onClick={() => speak("日本語の音声のテストです。")}>Test Japanese audio</Button>
        </Panel>

        <Panel label="Deck">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Cards" value={stats.cards} />
            <Stat label="Reviews logged" value={stats.reviews} />
            <Stat label="New · learning · review · relearning" value={stats.byState.join(" · ")} />
            <Stat label="True retention 30 d" value={stats.ret === null ? "–" : stats.ret.toFixed(2)} />
            <Stat label="Review minutes a day, 7 d" value={stats.minutes.toFixed(0)} />
            <Stat label="Optional words added" value={`${stats.extraAdded} / ${extra.length}`} />
          </dl>
          <Button variant="outline" className="h-11 w-fit" disabled={stats.minutes > 25 || stats.extraAdded >= extra.length} onClick={async () => {
            const batch = extra.slice(stats.extraAdded, stats.extraAdded + 14);
            await addCards("w", batch, 0);
            await setSetting("extraAdded", stats.extraAdded + batch.length);
            toast.success(`Added ${batch.length} optional N3 words`);
            setTick((t) => t + 1);
          }}>Add 14 optional N3 words</Button>
          {stats.minutes > 25 && <p className="text-sm text-muted-foreground">Optional words unlock when reviews average under 25 minutes a day.</p>}
        </Panel>
      </div>

      <Panel label="Weekly tests · first attempt counts">
        {!testWeeks.length && <p className="text-sm text-muted-foreground">No tests yet.</p>}
        <ul className="grid gap-1 text-sm">
          {testWeeks.map((ref) => {
            const rows = tests.filter((t) => t.ref === ref);
            const ok = rows.reduce((s, r) => s + r.ok, 0), total = rows.reduce((s, r) => s + r.total, 0);
            const pct = Math.round((ok / total) * 100);
            return (
              <li key={ref} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
                <span className="font-semibold">{ref.replace("week-", "Week ").replace("-retake", " retake")}</span>
                <span className="text-muted-foreground"><Ja>{rows.map((r) => `${r.type} ${r.ok}/${r.total}`).join(" · ")}</Ja></span>
                <span className="font-mono">{pct}% · band {band(pct)}</span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel label="Flagged items">
        {!flags.length && <p className="text-sm text-muted-foreground">Nothing flagged.</p>}
        <ul className="grid gap-1 text-sm">
          {flags.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5">
              <Ja>{f.note}</Ja>
              <Button variant="ghost" className="h-11" onClick={async () => {
                await db.flags.delete(f.id);
                for (const id of [`w:${f.id}`, `k:${f.id}`]) if (await db.cards.get(id)) await db.cards.update(id, { suspended: 0 });
                setTick((t) => t + 1);
              }}>Clear</Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel label="Backup">
        <p className="text-sm text-muted-foreground">Progress lives in this browser. Export it regularly, and import it on another device.</p>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 px-5" onClick={async () => {
            const blob = new Blob([JSON.stringify(await exportAll())], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `jlpt-reviewer-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}>Export progress</Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted">
            Import a backup
            <input type="file" accept="application/json" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (!confirm("Importing replaces all progress in this browser. Continue?")) return;
              try { await importAll(JSON.parse(await f.text())); toast.success("Backup imported"); setTick((t) => t + 1); }
              catch (err) { toast.error(String((err as Error).message)); }
            }} />
          </label>
        </div>
      </Panel>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div><dt className="text-muted-foreground">{label}</dt><dd className="font-mono text-xl font-semibold">{value}</dd></div>
);
