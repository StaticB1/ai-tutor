"use client";

import Link from "next/link";
import { Icon, SubjectIcon } from "./icons";
import { store, useStore } from "@/lib/client/store";

export interface ItemMeta {
  id: string;
  subject: string;
  topic: string;
}

const TIPS = [
  { icon: Icon.pen, title: "Answer in your own words", text: "Type your working, a step, or what you think. Half an idea is fine." },
  { icon: Icon.bulb, title: "Stuck? Ask for a hint", text: "Hints come one at a time. After a few tries you get one worked step." },
  { icon: Icon.trophy, title: "Earn every point", text: "Each mark in the mark scheme is a point. Get them all and the full solution opens." },
];

export function LearnerDashboard({ items }: { items: ItemMeta[] }) {
  const prefs = useStore(store.prefs);
  const finished = useStore(store.finished);
  const open = useStore(store.openSessions);
  const streak = useStore(store.streak);
  if (!prefs || !finished || !open || streak === null) return <div className="min-h-[1px]" />;

  const done = Object.values(finished);
  const points = done.reduce((a, f) => a + f.points, 0);
  const latest = open.find((s) => items.some((i) => i.id === s.itemId));
  const latestItem = latest ? items.find((i) => i.id === latest.itemId) : undefined;

  return (
    <div className="space-y-4">
      {!prefs.welcomed && (
        <section className="card p-5 space-y-4" aria-labelledby="welcome">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">First time here?</p>
              <h2 id="welcome" className="text-xl mt-1">
                How to use your tutor
              </h2>
            </div>
            <button type="button" className="icon-btn" aria-label="Close tips" onClick={() => store.setPrefs({ welcomed: true })}>
              <Icon.close size={18} />
            </button>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {TIPS.map(({ icon: I, title, text }, n) => (
              <li key={title} className="flex gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 text-navy">
                  <I size={18} />
                </span>
                <div>
                  <p className="font-medium">
                    {n + 1}. {title}
                  </p>
                  <p className="text-sm text-text-2">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-sm" onClick={() => store.setPrefs({ welcomed: true })}>
            Got it
          </button>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        {latest && latestItem ? (
          <Link href={`/tutor/${latestItem.id}`} className="card card-link p-4 flex items-center gap-4 no-underline text-ink">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-paper">
              <SubjectIcon subject={latestItem.subject} size={20} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="eyebrow block">Continue where you left off</span>
              <span className="font-display font-semibold block truncate">{latestItem.topic}</span>
              <span className="text-sm text-text-2">
                {latest.progress.met} of {latest.progress.needed} points so far
              </span>
            </span>
            <Icon.arrowRight size={20} className="text-navy shrink-0" />
          </Link>
        ) : (
          <div className="card p-4 flex items-center gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper-2 text-navy">
              <Icon.book size={20} />
            </span>
            <span>
              <span className="font-display font-semibold block">{done.length ? "Ready for the next one?" : "Pick your first question below"}</span>
              <span className="text-sm text-text-2">Your progress is saved on this device.</span>
            </span>
          </div>
        )}
        <dl className="card p-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Questions done", value: done.length, icon: Icon.check },
            { label: "Points earned", value: points, icon: Icon.trophy },
            { label: streak === 1 ? "Day in a row" : "Days in a row", value: streak, icon: Icon.flame },
          ].map(({ label, value, icon: I }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <I size={16} className="text-navy" />
              <dd className="font-display text-2xl font-semibold leading-none mt-1">{value}</dd>
              <dt className="text-xs text-text-2 leading-tight">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
