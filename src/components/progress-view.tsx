"use client";

import Link from "next/link";
import { Icon, SubjectIcon } from "./icons";
import { store, useStore } from "@/lib/client/store";

interface Meta {
  id: string;
  subject: string;
  topic: string;
  level: string;
}

export function ProgressView({ items, subjects }: { items: Meta[]; subjects: string[] }) {
  const finished = useStore(store.finished);
  const open = useStore(store.openSessions);
  const streak = useStore(store.streak);
  if (!finished || !open || streak === null) return null;

  const done = Object.values(finished).sort((a, b) => b.finishedAt - a.finishedAt);
  const points = done.reduce((a, f) => a + f.points, 0);
  const hints = done.reduce((a, f) => a + f.hintsUsed, 0);
  const noHint = done.filter((f) => f.hintsUsed === 0 && !f.withHelp).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Questions done", value: `${done.length} of ${items.length}`, icon: Icon.check, href: "#history" },
          { label: "Points earned", value: points, icon: Icon.trophy, href: "#history" },
          { label: "Solved without a hint", value: noHint, icon: Icon.bulb, href: "#history" },
          { label: streak === 1 ? "Day in a row" : "Days in a row", value: streak, icon: Icon.flame, href: "/#questions" },
        ].map(({ label, value, icon: I, href }) => (
          <Link key={label} href={href} className="card card-link p-4 no-underline text-ink block">
            <I size={18} className="text-navy" />
            <span className="block font-display text-2xl font-semibold mt-2">{value}</span>
            <span className="block text-sm text-text-2">{label}</span>
          </Link>
        ))}
      </div>

      <section className="space-y-3" aria-labelledby="by-subject">
        <h2 id="by-subject" className="text-2xl">
          By subject
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {subjects.map((s) => {
            const all = items.filter((i) => i.subject === s);
            const got = all.filter((i) => finished[i.id]).length;
            const pct = all.length ? Math.round((got / all.length) * 100) : 0;
            const next = all.find((i) => !finished[i.id]);
            return (
              <li key={s}>
                <Link href={next ? `/tutor/${next.id}` : "/#questions"} className="card card-link p-4 space-y-3 block no-underline text-ink h-full">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-paper-2 text-navy">
                    <SubjectIcon subject={s} size={18} />
                  </span>
                  <div className="flex-1">
                    <p className="font-display font-semibold">{s}</p>
                    <p className="text-sm text-text-2">
                      {got} of {all.length} done
                    </p>
                  </div>
                  {next ? (
                    <span className="btn btn-secondary btn-sm">
                      {got ? "Next" : "Start"} <Icon.arrowRight size={15} />
                    </span>
                  ) : (
                    <span className="status status-done">All done</span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-paper-3 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${s} progress`}>
                  <div className="h-full bg-navy rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {open.length > 0 && (
        <section className="space-y-3" aria-labelledby="unfinished">
          <h2 id="unfinished" className="text-2xl">
            Not finished yet
          </h2>
          <ul className="card divide-y divide-paper-3">
            {open.map((s) => {
              const it = items.find((i) => i.id === s.itemId);
              if (!it) return null;
              return (
                <li key={s.itemId}>
                  <Link href={`/tutor/${it.id}`} className="flex items-center gap-3 p-4 no-underline text-ink hover:bg-paper-2">
                    <SubjectIcon subject={it.subject} size={18} className="text-navy" />
                    <span className="flex-1">
                      {it.topic} <span className="text-text-2 text-sm">· {it.subject}</span>
                    </span>
                    <span className="text-sm text-text-2">
                      {s.progress.met}/{s.progress.needed}
                    </span>
                    <Icon.arrowRight size={16} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="history">
        <h2 id="history" className="text-2xl scroll-mt-28">
          Finished questions
        </h2>
        {done.length === 0 ? (
          <p className="text-text-2">
            Nothing yet. <Link href="/">Pick your first question.</Link>
          </p>
        ) : (
          <ul className="card divide-y divide-paper-3">
            {done.map((f) => {
              const it = items.find((i) => i.id === f.itemId);
              return (
                <li key={f.itemId} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
                  <SubjectIcon subject={f.subject} size={18} className="text-navy" />
                  <span className="flex-1 min-w-[10rem]">{it?.topic ?? f.itemId}</span>
                  <span className="text-sm text-text-2">
                    {f.withHelp ? "Done with help · " : ""}
                    {f.points}/{f.needed} points · {f.hintsUsed} {f.hintsUsed === 1 ? "hint" : "hints"}
                  </span>
                  <span className="text-xs text-muted">{new Date(f.finishedAt).toLocaleDateString()}</span>
                </li>
              );
            })}
          </ul>
        )}
        {hints > 0 && (
          <p className="text-sm text-muted">
            You used {hints} {hints === 1 ? "hint" : "hints"} in total. Using a hint is fine: it is how the tutor helps.
          </p>
        )}
      </section>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          if (window.confirm("Clear all your progress on this device? This cannot be undone.")) store.resetAll();
        }}
      >
        <Icon.refresh size={15} /> Clear my progress
      </button>
    </div>
  );
}
