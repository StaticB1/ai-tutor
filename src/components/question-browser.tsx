"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon, SubjectIcon } from "./icons";
import { store, useStore } from "@/lib/client/store";

export interface BrowserItem {
  id: string;
  subject: string;
  level: string;
  topic: string;
  marks: number;
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
    <section className="space-y-4" aria-labelledby="questions">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="questions" className="text-2xl">
          Choose a question
        </h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={surprise}>
          <Icon.shuffle size={16} /> Surprise me
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="composer flex items-center gap-2 px-3 flex-1">
          <Icon.search size={18} className="text-muted shrink-0" />
          <span className="sr-only">Search questions</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a topic, e.g. percentages, erosion, binary"
            className="w-full bg-transparent py-2.5 outline-none"
          />
        </label>
        <select
          value={level ?? ""}
          onChange={(e) => setLevel(e.target.value || null)}
          className="composer px-3 py-2.5 bg-paper text-ink"
          aria-label="Form level"
        >
          <option value="">All forms</option>
          {levels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="chip-scroll" role="group" aria-label="Subjects">
        <button type="button" className="pill" aria-pressed={!subject} onClick={() => setSubject(null)}>
          All subjects
        </button>
        {subjects.map((s) => (
          <button key={s} type="button" className="pill" aria-pressed={subject === s} onClick={() => setSubject(subject === s ? null : s)}>
            <SubjectIcon subject={s} size={15} /> {s}
          </button>
        ))}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-text-2 cursor-pointer">
        <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-4 w-4 accent-[var(--st-navy)]" />
        Hide questions I have finished
      </label>

      {shown.length === 0 ? (
        <div className="card p-6 text-center space-y-2">
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => {
            const done = finished[i.id];
            const going = !done && openIds.has(i.id);
            return (
              <li key={i.id}>
                <Link href={`/tutor/${i.id}`} className="card card-link flex flex-col gap-2 p-4 no-underline text-ink h-full">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-paper-2 text-navy shrink-0">
                      <SubjectIcon subject={i.subject} size={18} />
                    </span>
                    {done ? (
                      <span className="status status-done inline-flex items-center gap-1">
                        <Icon.check size={12} /> {done.withHelp ? "Done with help" : "Done"}
                      </span>
                    ) : going ? (
                      <span className="status status-going">In progress</span>
                    ) : (
                      <span className="status">New</span>
                    )}
                  </div>
                  <div>
                    <p className="eyebrow">
                      {i.subject} · {i.level}
                    </p>
                    <p className="font-display font-semibold mt-0.5">{i.topic}</p>
                  </div>
                  <p className="text-sm text-text-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: i.questionHtml }} />
                  <p className="text-xs text-muted mt-auto">
                    {i.marks} marks{done ? ` · ${done.points}/${done.needed} points, ${done.hintsUsed} ${done.hintsUsed === 1 ? "hint" : "hints"}` : ""}
                  </p>
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
