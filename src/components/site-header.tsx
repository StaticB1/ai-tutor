"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { applyPrefs, store, useStore, type Prefs } from "@/lib/client/store";

const NAV = [
  { href: "/", label: "Questions", icon: Icon.book },
  { href: "/progress", label: "My progress", icon: Icon.chart },
  { href: "/how-it-works", label: "How it works", icon: Icon.info },
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
    <header className="border-b border-paper-3 sticky top-0 z-30 bg-paper/90 backdrop-blur no-print">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-ink no-underline shrink-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-paper">
            <Icon.bulb size={16} />
          </span>
          AI Tutor
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          {NAV.map(({ href, label, icon: I }) => {
            const active = href === "/" ? path === "/" || path.startsWith("/tutor") : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm no-underline ${active ? "bg-paper-3 text-ink font-medium" : "text-text-2 hover:text-ink"}`}
              >
                <I size={16} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sr-only sm:hidden">{label}</span>
              </Link>
            );
          })}
          <div className="relative" ref={panel}>
            <button type="button" className="icon-btn" aria-label="Display settings" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <Icon.type size={18} />
            </button>
            {open && prefs && (
              <div className="card absolute right-0 top-11 w-72 p-4 space-y-4 shadow-lg" role="dialog" aria-label="Display settings">
                <fieldset>
                  <legend className="eyebrow mb-2">Theme</legend>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        ["system", "Auto", Icon.monitor],
                        ["light", "Light", Icon.sun],
                        ["dark", "Dark", Icon.moon],
                      ] as const
                    ).map(([v, l, I]) => (
                      <button key={v} type="button" className="pill justify-center" aria-pressed={prefs.theme === v} onClick={() => set({ theme: v })}>
                        <I size={14} /> {l}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="eyebrow mb-2">Text size</legend>
                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" className="pill justify-center" aria-pressed={prefs.text === "normal"} onClick={() => set({ text: "normal" })}>
                      Normal
                    </button>
                    <button type="button" className="pill justify-center text-base" aria-pressed={prefs.text === "large"} onClick={() => set({ text: "large" })}>
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
