"use client";

import Link from "next/link";
import { Icon } from "./icons";
import { store, useStore } from "@/lib/client/store";

export interface ItemMeta {
  id: string;
  subject: string;
  topic: string;
  art: string;
}

const TIPS = [
  { icon: Icon.pen, title: "Answer in your own words", text: "Type your working, a step, or what you think. Half an idea is fine." },
  { icon: Icon.bulb, title: "Stuck? Ask for a hint", text: "Hints come one at a time, then worked steps. After those, the full answer opens." },
  { icon: Icon.trophy, title: "Earn every point", text: "Each mark in the question is a point. Get them all and the full working opens." },
];

export function LearnerDashboard({ items }: { items: ItemMeta[] }) {
  const prefs = useStore(store.prefs);
  const finished = useStore(store.finished);
  const open = useStore(store.openSessions);
  const streak = useStore(store.streak);
  if (!prefs || !finished || !open || streak === null) return <div className="min-h-[56px]" />;

  const done = Object.values(finished);
  const points = done.reduce((a, f) => a + f.points, 0);
  const latest = open.find((s) => items.some((i) => i.id === s.itemId));
  const latestItem = latest ? items.find((i) => i.id === latest.itemId) : undefined;
  const started = done.length > 0 || open.length > 0;

  return (
    <div className="space-y-3">
      {latest && latestItem && (
        <Link href={`/tutor/${latestItem.id}`} className="card card-link p-3 sm:p-4 flex items-center gap-4 no-underline text-ink">
          <span className="art-tile rounded-xl shrink-0 overflow-hidden">
            <img src={latestItem.art} alt="" width={56} height={56} className="h-14 w-14" loading="lazy" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="eyebrow block">Continue where you left off</span>
            <span className="font-display font-semibold block truncate">{latestItem.topic}</span>
            <span className="text-sm text-text-2">
              {latest.progress.met} of {latest.progress.needed} points so far
            </span>
          </span>
          <span className="btn btn-sm hidden sm:inline-flex">
            Continue <Icon.arrowRight size={15} />
          </span>
          <Icon.arrowRight size={20} className="text-navy shrink-0 sm:hidden" />
        </Link>
      )}

      {started ? (
        <dl className="grid grid-cols-3 gap-2">
          {[
            { label: "Questions done", value: done.length, icon: Icon.check },
            { label: "Points earned", value: points, icon: Icon.trophy },
            { label: streak === 1 ? "Day in a row" : "Days in a row", value: streak, icon: Icon.flame },
          ].map(({ label, value, icon: I }) => (
            <div key={label} className="rounded-xl bg-paper-2 p-3 flex items-center gap-3">
              <I size={18} className="text-navy shrink-0 hidden sm:block" />
              <div>
                <dd className="font-display text-2xl font-semibold leading-7 tabular-nums text-navy">{value}</dd>
                <dt className="text-[11px] leading-[15px] text-muted">{label}</dt>
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <Link href="/progress" className="group rounded-[20px] bg-paper-2 hover:bg-tint-1 transition-colors px-6 py-4 min-h-[64px] flex items-center justify-between gap-3 no-underline">
          <span className="text-[1rem] text-text-2 flex items-center gap-2.5">
            <Icon.flame size={16} className="text-navy shrink-0" /> Your progress starts with your first question.
          </span>
          <span className="font-semibold whitespace-nowrap text-navy inline-flex items-center gap-1.5">
            My progress <Icon.arrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      <details className="group rounded-[20px] border border-line bg-paper">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-6 h-14 text-[1rem] font-semibold text-navy">
          <span className="inline-flex items-center gap-2">
            <Icon.info size={16} /> New here? How to use your tutor
          </span>
          <Icon.chevronDown size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <ol className="grid gap-4 sm:grid-cols-3 px-4 pb-4 pt-1">
          {TIPS.map(({ icon: I, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 text-navy">
                <I size={18} />
              </span>
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-sm text-text-2">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
