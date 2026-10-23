"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "./icons";
import { store, useStore } from "@/lib/client/store";

export interface BrowserItem {
  id: string;
  subject: string;
  level: string;
  topic: string;
  marks: number;
  /** this question's own illustration */
  art: string;
  /** question text already rendered to HTML on the server */
  questionHtml: string;
}

const NO_FINISHED: ReturnType<typeof store.finished> = {};
const NO_OPEN: ReturnType<typeof store.openSessions> = [];

export function QuestionBrowser({ items, subjects, levels }: { items: BrowserItem[]; subjects: string[]; levels: string[] }) {
  const router = useRouter();
  const finished = useStore(store.finished) ?? NO_FINISHED;
  const open = useStore(store.openSessions) ?? NO_OPEN;
  const [subject, setSubject] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hideDone, setHideDone] = useState(false);

  const openIds = useMemo(() => new Set(open.map((s) => s.itemId)), [open]);
  const anyDone = Object.keys(finished).length > 0;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!subject || i.subject === subject) &&
        (!level || i.level === level) &&
        (!hideDone || !finished[i.id]) &&
        (!q || `${i.subject} ${i.topic} ${i.level} ${i.questionHtml.replace(/<[^>]+>/g, " ")}`.toLowerCase().includes(q)),
    );
  }, [items, subject, level, query, hideDone, finished]);

  function surprise() {
    const pool = items.filter((i) => !finished[i.id] && (!subject || i.subject === subject));
    const from = pool.length ? pool : items;
    router.push(`/tutor/${from[Math.floor(Math.random() * from.length)].id}`);
  }

  return (
    <section id="questions" className="space-y-6 scroll-mt-24" aria-labelledby="questions-title">
      <div className="flex items-end justify-between gap-3">
        <h2 id="questions-title" className="text-[2.2rem] sm:text-[3.2rem] tracking-[-0.045em] font-extrabold text-navy">
          Choose a question
        </h2>
        <button type="button" className="btn btn-secondary" onClick={surprise}>
          <Icon.shuffle size={18} /> Surprise me
        </button>
      </div>

      <div className="space-y-2">
        <label className="composer flex items-center gap-3.5 px-6 h-16">
          <Icon.search size={22} className="text-lift shrink-0" />
          <span className="sr-only">Search questions</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a topic: percentages, erosion, binary…"
            className="w-full bg-transparent outline-none text-[1.1rem]"
          />
        </label>

        {/* Phones: two plain selects, nothing hidden off-screen. */}
        <div className="grid grid-cols-2 gap-2 md:hidden">
          <select value={subject ?? ""} onChange={(e) => setSubject(e.target.value || null)} className="composer h-12 px-3 bg-paper text-ink" aria-label="Subject">
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={level ?? ""} onChange={(e) => setLevel(e.target.value || null)} className="composer h-12 px-3 bg-paper text-ink" aria-label="Form">
            <option value="">All forms</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Larger screens: every subject visible as a pill, form as pills too. */}
        <div className="hidden md:flex flex-wrap items-center gap-3 pt-3" role="group" aria-label="Subjects and forms">
          <button type="button" className="pill" aria-pressed={!subject} onClick={() => setSubject(null)}>
            All subjects
          </button>
          {subjects.map((s) => (
            <button key={s} type="button" className="pill" aria-pressed={subject === s} onClick={() => setSubject(subject === s ? null : s)}>
              {s}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-paper-3" aria-hidden="true" />
          {levels.map((l) => (
            <button key={l} type="button" className="pill" aria-pressed={level === l} onClick={() => setLevel(level === l ? null : l)}>
              {l}
            </button>
          ))}
        </div>

        {anyDone && (
          <label className="inline-flex items-center gap-2 text-sm text-text-2 cursor-pointer min-h-11">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-4 w-4 accent-[var(--st-navy)]" />
            Hide questions I have finished
          </label>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="card p-6 text-center space-y-3">
          <p className="font-display font-semibold">No questions match.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setQuery("");
              setSubject(null);
              setLevel(null);
              setHideDone(false);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shown.map((i) => {
            const done = finished[i.id];
            const going = !done && openIds.has(i.id);
            return (
              <li key={i.id}>
                <Link href={`/tutor/${i.id}`} className="card card-link flex flex-col h-full no-underline text-ink overflow-hidden">
                  <div className="relative flex items-center justify-center h-48 sm:h-56 px-8 pt-7 pb-1">
                    <img src={i.art} alt="" width={240} height={240} className="h-full w-auto max-w-[80%] object-contain" loading="lazy" decoding="async" />
                    {done && (
                      <span className="status status-done absolute right-4 top-4 inline-flex items-center gap-1">
                        <Icon.check size={12} /> Done
                      </span>
                    )}
                    {going && <span className="status absolute right-4 top-4 bg-paper">In progress</span>}
                  </div>
                  <div className="flex-1 px-7 pt-5 pb-5">
                    <p className="eyebrow text-[0.78rem]! truncate">
                      {i.subject} · {i.level}
                    </p>
                    <p className="font-display font-extrabold text-[1.6rem] leading-tight tracking-[-0.03em] text-navy mt-2">{i.topic}</p>
                    <p className="mt-2.5 line-clamp-3 text-[1.05rem] leading-relaxed text-text-2" dangerouslySetInnerHTML={{ __html: i.questionHtml }} />
                  </div>
                  <div className="mx-7 border-t border-line py-5 flex items-center justify-between gap-2">
                    <span className="text-[0.98rem] text-text-2">
                      {done ? `${done.points}/${done.needed} points${done.withHelp ? " · with help" : ""}` : `${i.marks} marks`}
                    </span>
                    <span className="text-[0.98rem] font-bold text-navy inline-flex items-center gap-2">
                      {done ? "Try again" : going ? "Continue" : "Start question"} <Icon.arrowRight size={16} />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm text-muted">These are sample questions written for this demo, not past exam papers.</p>
    </section>
  );
}
