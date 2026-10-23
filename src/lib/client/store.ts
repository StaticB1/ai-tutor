"use client";

// Everything a learner's browser remembers: their preferences, unfinished sessions and finished
// questions. Nothing here reaches our server. Storage can be missing or blocked (private windows,
// school machines), so every read and write is wrapped and the app works without it.

import { useEffect, useState } from "react";

export interface Prefs {
  theme: "system" | "light" | "dark";
  text: "normal" | "large";
  readAloud: boolean;
  welcomed: boolean;
}

export interface SavedLine {
  role: "learner" | "tutor";
  text: string;
  html?: string;
}

export interface SavedSession {
  itemId: string;
  lines: SavedLine[];
  token: string | null;
  progress: { met: number; needed: number };
  hints: { used: number; total: number };
  solution: string[] | null;
  helpLeft?: number;
  canReveal?: boolean;
  revealed?: boolean;
  updatedAt: number;
}

export interface Finished {
  itemId: string;
  subject: string;
  points: number;
  needed: number;
  hintsUsed: number;
  messages: number;
  /** the answer was shown after every hint */
  withHelp?: boolean;
  finishedAt: number;
}

const PREFS = "tutor.prefs.v1";
const SESSION = (id: string) => `tutor.session.v1.${id}`;
const FINISHED = "tutor.finished.v1";
const ACTIVITY = "tutor.activity.v1"; // dates (YYYY-MM-DD) the learner sent a message
const CHANGED = "tutor-store-changed";

const DEFAULT_PREFS: Prefs = { theme: "system", text: "normal", readAloud: false, welcomed: false };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: the session still works, it just won't be remembered
  }
  window.dispatchEvent(new Event(CHANGED));
}

export const store = {
  prefs: (): Prefs => ({ ...DEFAULT_PREFS, ...read<Partial<Prefs>>(PREFS, {}) }),
  setPrefs: (p: Partial<Prefs>) => {
    write(PREFS, { ...store.prefs(), ...p });
    applyPrefs(store.prefs());
  },

  session: (id: string): SavedSession | null => read<SavedSession | null>(SESSION(id), null),
  saveSession: (s: SavedSession) => write(SESSION(s.itemId), { ...s, updatedAt: Date.now() }),
  clearSession: (id: string) => write(SESSION(id), null),
  /** Unfinished sessions with at least one message, newest first. */
  openSessions: (): SavedSession[] => {
    const out: SavedSession[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith("tutor.session.v1.")) {
          const s = read<SavedSession | null>(k, null);
          if (s && !s.solution && s.lines.length > 0) out.push(s);
        }
      }
    } catch {
      // ignore
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  finished: (): Record<string, Finished> => read<Record<string, Finished>>(FINISHED, {}),
  markFinished: (f: Finished) => write(FINISHED, { ...store.finished(), [f.itemId]: f }),

  noteActivity: () => {
    const today = dayKey(new Date());
    const days = read<string[]>(ACTIVITY, []);
    if (!days.includes(today)) write(ACTIVITY, [...days, today].slice(-400));
  },
  /** Consecutive days with activity, ending today or yesterday. */
  streak: (): number => {
    const days = new Set(read<string[]>(ACTIVITY, []));
    const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (days.has(dayKey(d))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  },

  resetAll: () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith("tutor.") && k !== PREFS) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(CHANGED));
  },
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  const dark = p.theme === "dark" || (p.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.text = p.text;
}

/** Re-render when anything in the store changes (this tab or another). `null` until mounted, so server and client markup match. */
export function useStore<T>(select: () => T): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    const update = () => setValue(select());
    update();
    window.addEventListener(CHANGED, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGED, update);
      window.removeEventListener("storage", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/** Runs before first paint (inlined in <head>) so a dark-mode learner never sees a white flash. */
export const PREFS_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${PREFS}")||"{}");var t=p.theme||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";document.documentElement.dataset.text=p.text||"normal";}catch(e){}`;
