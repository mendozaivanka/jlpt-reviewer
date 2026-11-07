import type { GrammarLesson } from "./data";
import { FlagButton, Ja, SpeakButton } from "./ui";

/** A grammar lesson laid out the Sou Matome way: three look-alike patterns, each with form, paraphrase and examples. */
export default function GrammarView({ lesson }: { lesson: GrammarLesson }) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        <Ja className="font-semibold text-foreground">{lesson.titleJa}</Ja> · {lesson.title}. These three patterns look alike. Notice what tells them apart.
      </p>
      {lesson.patterns.map((p) => (
        <article key={p.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_240px] sm:gap-5">
          <div className="grid content-start gap-3">
            <h3 className="font-heading text-2xl font-semibold"><Ja>{p.p}</Ja></h3>
            {p.ex.map((x, i) => {
              const [a, ...rest] = x.ja.split(x.hit);
              return (
                <div key={i} className="grid gap-1">
                  <div className="flex items-start gap-2">
                    <Ja className="text-lg leading-relaxed">{a}<span className="font-semibold underline decoration-rosas-4 decoration-2 underline-offset-6">{x.hit}</span>{rest.join(x.hit)}</Ja>
                    <SpeakButton text={x.ja} className="ml-auto shrink-0" />
                  </div>
                  <span className="text-sm text-muted-foreground">{x.en}</span>
                </div>
              );
            })}
          </div>
          <aside className="grid content-start gap-2 rounded-lg bg-fjord p-3 text-sm">
            <Ja className="font-mono text-xs">{p.form}</Ja>
            <span className="font-semibold">{p.meaning}</span>
            <Ja>＝ {p.plain}</Ja>
            {p.note && <span className="text-[13px]">{p.note}</span>}
            <FlagButton refId={p.id} note={`grammar ${p.p}`} />
          </aside>
        </article>
      ))}
    </div>
  );
}
