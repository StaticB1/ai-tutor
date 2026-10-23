import Link from "next/link";
import { ITEMS } from "@/content/items";
import { subjects } from "@/lib/tutor/catalog";
import { renderInline } from "@/lib/render-maths";

export default async function Home({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const all = subjects();
  const shown = subject ? ITEMS.filter((i) => i.subject === subject) : ITEMS;

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="eyebrow">Any subject · Form 1 to 4</p>
        <h1 className="text-4xl sm:text-5xl text-ink">
          A tutor that helps you <span className="text-navy">work it out.</span>
        </h1>
        <p className="text-lg text-text-2 max-w-2xl">
          Pick a question and answer it in your own words. The tutor checks each step against the mark scheme, asks questions and gives hints. It will not hand you the answer, even if you ask.
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="questions">
        <h2 id="questions" className="text-2xl">
          Questions
        </h2>
        <nav className="flex flex-wrap gap-2" aria-label="Subjects">
          <Link href="/" className="pill no-underline" aria-pressed={!subject}>
            All
          </Link>
          {all.map((s) => (
            <Link key={s} href={`/?subject=${encodeURIComponent(s)}`} className="pill no-underline" aria-pressed={subject === s}>
              {s}
            </Link>
          ))}
        </nav>
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((i) => (
            <li key={i.id}>
              <Link href={`/tutor/${i.id}`} className="card block p-4 no-underline text-ink hover:border-navy h-full">
                <p className="eyebrow">
                  {i.subject} · {i.level}
                </p>
                <p className="font-display font-semibold mt-1">{i.topic}</p>
                <p className="text-sm text-text-2 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: renderInline(i.question) }} />
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">These are sample questions written for this demo, not past exam papers.</p>
      </section>

      <section className="space-y-4" aria-labelledby="how">
        <h2 id="how" className="text-2xl">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            ["Safety first", "Every message is screened by a Nemotron safety check before the tutor sees it. A learner who mentions harm gets a fixed message pointing to a trusted adult and Childline, never a generated one."],
            ["Marked against the scheme", "Nemotron reads the message against the hidden mark scheme, one point at a time, and names any common mistake. Final answers are checked by code, not by the model."],
            ["Code decides the move", "Ask a question, give the next hint, show one worked step, or bring the learner back. The rules live in code, so a learner cannot talk the tutor out of them."],
            ["Checked before it is sent", "Each reply is checked for the answer and for points the learner has not reached. If it gives too much away, it is rewritten or replaced by a pre-written hint."],
          ].map(([t, d], n) => (
            <li key={t} className="card p-4">
              <p className="eyebrow">Step {n + 1}</p>
              <p className="font-display font-semibold mt-1">{t}</p>
              <p className="text-sm text-text-2 mt-1">{d}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          Runs on NVIDIA Nemotron open models served by Nebius Token Factory. The design follows studies in which tutors that held back the answer helped learners, and open answer-giving chat did not.
        </p>
      </section>
    </div>
  );
}
