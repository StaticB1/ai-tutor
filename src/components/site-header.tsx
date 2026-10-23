"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { applyPrefs, store, useStore, type Prefs } from "@/lib/client/store";

const NAV = [
  { href: "/#questions", match: "/", label: "Questions", icon: Icon.book },
  { href: "/progress", match: "/progress", label: "My progress", icon: Icon.chart },
  { href: "/how-it-works", match: "/how-it-works", label: "How it works", icon: Icon.info },
];

export function SiteHeader() {
  const path = usePathname();
  const prefs = useStore(store.prefs);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // Follow the device's theme while the learner has chosen "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyPrefs(store.prefs());
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !panel.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const set = (p: Partial<Prefs>) => store.setPrefs(p);

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md no-print">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10 h-16 sm:h-[80px] flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 font-display font-extrabold text-[1.35rem] sm:text-[1.65rem] tracking-[-0.035em] text-ink no-underline shrink-0">
          <span className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-[12px] bg-navy text-paper shadow-sm">
            <Icon.bulbRays size={24} />
          </span>
          AI Tutor
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
          {NAV.map(({ href, match, label, icon: I }) => {
            const active = match === "/" ? path === "/" || path.startsWith("/tutor") : path.startsWith(match);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3 sm:px-4 h-10 text-[1rem] no-underline transition-colors ${active ? "text-navy font-semibold" : "text-navy/75 font-medium hover:text-navy"}`}
              >
                <I size={18} className="sm:hidden" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sr-only sm:hidden">{label}</span>
              </Link>
            );
          })}
          <div className="relative" ref={panel}>
            <button type="button" className="icon-btn font-display font-bold text-ink" aria-label="Display settings" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <span className="text-[12px] leading-none mr-0.5 self-end mb-[11px]">A</span>
              <span className="text-[19px] leading-none self-end mb-[10px]">A</span>
            </button>
            {open && prefs && (
              <div className="float-card absolute right-0 top-12 w-72 p-4 space-y-4" role="dialog" aria-label="Display settings">
                <fieldset>
                  <legend className="eyebrow mb-2">Theme</legend>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["system", "Auto", Icon.monitor],
                        ["light", "Light", Icon.sun],
                        ["dark", "Dark", Icon.moon],
                      ] as const
                    ).map(([v, l, I]) => (
                      <button key={v} type="button" className="pill h-10! px-0! justify-center" aria-pressed={prefs.theme === v} onClick={() => set({ theme: v })}>
                        <I size={14} /> {l}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="eyebrow mb-2">Text size</legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" className="pill h-10! justify-center" aria-pressed={prefs.text === "normal"} onClick={() => set({ text: "normal" })}>
                      Normal
                    </button>
                    <button type="button" className="pill h-10! justify-center text-base!" aria-pressed={prefs.text === "large"} onClick={() => set({ text: "large" })}>
                      Large
                    </button>
                  </div>
                </fieldset>
                <label className="flex items-center justify-between gap-3 text-sm cursor-pointer">
                  <span>
                    Read the tutor&apos;s replies aloud
                    <span className="block text-muted text-xs">Uses your device&apos;s own voice</span>
                  </span>
                  <input type="checkbox" className="h-5 w-5 accent-[var(--st-navy)]" checked={prefs.readAloud} onChange={(e) => set({ readAloud: e.target.checked })} />
                </label>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
