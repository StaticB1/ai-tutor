"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon, SubjectIcon } from "./icons";
import { store, useStore } from "@/lib/client/store";
import { subjectArt } from "@/lib/art";

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
    <section id="questions" className="space-y-4 scroll-mt-20" aria-labelledby="questions-title">
      <div className="flex items-end justify-between gap-3">
        <h2 id="questions-title" className="text-xl sm:text-2xl">
          Choose a question
        </h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={surprise}>
          <Icon.shuffle size={16} /> Surprise me
        </button>
      </div>

      <div className="space-y-2">
        <label className="composer flex items-center gap-2 px-4 h-12">
          <Icon.search size={18} className="text-muted shrink-0" />
          <span className="sr-only">Search questions</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a topic: percentages, erosion, binary…"
            className="w-full bg-transparent outline-none text-base"
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
        <div className="hidden md:flex flex-wrap items-center gap-2" role="group" aria-label="Subjects and forms">
          <button type="button" className="pill h-9" aria-pressed={!subject} onClick={() => setSubject(null)}>
            All subjects
          </button>
          {subjects.map((s) => (
            <button key={s} type="button" className="pill h-9" aria-pressed={subject === s} onClick={() => setSubject(subject === s ? null : s)}>
              <SubjectIcon subject={s} size={15} /> {s}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-paper-3" aria-hidden="true" />
          {levels.map((l) => (
            <button key={l} type="button" className="pill h-9" aria-pressed={level === l} onClick={() => setLevel(level === l ? null : l)}>
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
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((i) => {
            const done = finished[i.id];
            const going = !done && openIds.has(i.id);
            return (
              <li key={i.id}>
                <Link href={`/tutor/${i.id}`} className="card card-link flex flex-col justify-between p-4 no-underline text-ink h-full sm:min-h-[200px] rounded-2xl">
                  <div className="grid grid-cols-[minmax(0,1fr)_72px] md:grid-cols-[minmax(0,1fr)_88px] gap-3">
                    <div className="min-w-0">
                      <p className="eyebrow text-[10px]! text-muted! truncate">
                        {i.subject} · {i.level}
                      </p>
                      <p className="font-display font-semibold text-[17px] leading-[22px] text-navy mt-1">{i.topic}</p>
                      <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-text-2" dangerouslySetInnerHTML={{ __html: i.questionHtml }} />
                    </div>
                    <span className="art-tile rounded-xl overflow-hidden h-[72px] w-[72px] md:h-[88px] md:w-[88px]">
                      <img src={subjectArt(i.subject)} alt="" width={88} height={88} className="h-full w-full object-contain" loading="lazy" decoding="async" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {done ? `${done.points}/${done.needed} points${done.withHelp ? " · with help" : ""}` : `${i.marks} marks`}
                    </span>
                    {done ? (
                      <span className="status status-done inline-flex items-center gap-1">
                        <Icon.check size={12} /> Done
                      </span>
                    ) : (
                      <span className="text-[13px] font-semibold text-navy inline-flex items-center gap-1">
                        {going ? "Continue" : "Start question"} <Icon.arrowRight size={14} />
                      </span>
                    )}
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
