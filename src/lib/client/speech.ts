"use client";

import { mathsToWords } from "@/lib/speech-text";

// Read-aloud with the device's own voice (Web Speech API): free, offline on most phones, and
// nothing leaves the device. Maths is turned into words so "$3x - 12$" is read as "3x minus 12".

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, onEnd?: () => void) {
  if (!speechAvailable()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(mathsToWords(text));
  const voices = synth.getVoices();
  u.voice = voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  u.rate = 0.95;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  synth.speak(u);
}

let current: HTMLAudioElement | null = null;

// When the server says the natural voice is paused, don't ask again until it says to.
let skipServerUntil = 0;

/** The natural voice for a line (Cartesia or Murf, via /api/speak), or null if none can speak now. */
async function naturalVoice(text: string): Promise<Blob | null> {
  if (Date.now() < skipServerUntil) return null;
  try {
    const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (res.status === 204) {
      const retry = Number(res.headers.get("X-Voice-Retry-After") ?? 60);
      skipServerUntil = Date.now() + Math.min(retry, 3600) * 1000;
    }
    if (res.status === 200) return await res.blob();
  } catch {
    // no natural voice this time
  }
  return null;
}

// Lines fetched ahead of time (the fillers, the opening), so they can play at once.
const early = new Map<string, Promise<Blob | null>>();
const ready = new Map<string, Blob>();

/** Starts fetching lines that will be needed soon. */
export function prefetch(texts: string[]) {
  for (const t of texts) {
    if (early.has(t)) continue;
    early.set(
      t,
      naturalVoice(t).then((b) => {
        if (b) ready.set(t, b);
        else early.delete(t);
        return b;
      }),
    );
  }
}

function play(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  return new Promise<void>((resolve) => {
    const a = new Audio(url);
    current = a;
    // ended, failed or paused by an interruption: all count as finished
    a.onended = a.onerror = a.onpause = () => {
      URL.revokeObjectURL(url);
      if (current === a) current = null;
      resolve();
    };
    a.play().catch(() => resolve());
  });
}

// A filler playing now; the reply waits for it to finish rather than talking over it.
let filling: Promise<void> | null = null;
let lastFill = "";

/** Says one of these lines at once if its audio is already here; otherwise stays quiet. */
export function fill(lines: string[]) {
  if (current) return;
  const options = lines.filter((l) => ready.has(l) && l !== lastFill);
  if (options.length === 0) return;
  const line = options[Math.floor(Math.random() * options.length)];
  lastFill = line;
  const p = play(ready.get(line) as Blob).finally(() => {
    if (filling === p) filling = null;
  });
  filling = p;
}

/**
 * Speaks and resolves when finished. Tries the tutor's natural voice (Cartesia or Murf, /api/speak) first; if the
 * server answers without audio, uses the phone's voice and waits as long as the server asks
 * (X-Voice-Retry-After, at most an hour) before trying the natural voice again.
 */
export async function speakAsync(text: string): Promise<void> {
  const blob = await (early.get(text) ?? naturalVoice(text));
  if (filling) await filling;
  if (blob) return play(blob);
  await new Promise<void>((resolve) => {
    if (!speechAvailable()) return resolve();
    speak(text, () => resolve());
  });
}

export function stopSpeaking() {
  current?.pause();
  current = null;
  if (speechAvailable()) window.speechSynthesis.cancel();
}
