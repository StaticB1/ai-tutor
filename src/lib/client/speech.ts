"use client";

import { mathsToWords } from "@/lib/speech-text";
import type { Line } from "@/lib/talk-lines";

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

/**
 * The natural voice for a line (Cartesia or Murf, via /api/speak), or null if none can speak now.
 * A fixed line is asked for by name, so the CDN and the browser can keep it.
 */
async function naturalVoice(line: Line): Promise<Blob | null> {
  if (Date.now() < skipServerUntil) return null;
  try {
    const res = line.key
      ? await fetch(`/api/speak?line=${encodeURIComponent(line.key)}`)
      : await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: line.text }) });
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

// Fixed lines fetched ahead of time (the fillers, the opening), by key, so they can play at once.
const early = new Map<string, Promise<Blob | null>>();
const ready = new Map<string, Blob>();

/** Starts fetching fixed lines that will be needed soon. */
export function prefetch(lines: Line[]) {
  for (const line of lines) {
    const key = line.key;
    if (!key || early.has(key)) continue;
    early.set(
      key,
      naturalVoice(line).then((b) => {
        if (b) ready.set(key, b);
        else early.delete(key);
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

/** Says one of these fixed lines at once if its audio is already here; otherwise stays quiet. */
export function fill(lines: Line[]) {
  if (current) return;
  const options = lines.filter((l) => l.key && ready.has(l.key) && l.key !== lastFill);
  if (options.length === 0) return;
  const key = options[Math.floor(Math.random() * options.length)].key as string;
  lastFill = key;
  const p = play(ready.get(key) as Blob).finally(() => {
    if (filling === p) filling = null;
  });
  filling = p;
}

/**
 * Speaks and resolves when finished. Tries the tutor's natural voice (Cartesia or Murf, /api/speak) first; if the
 * server answers without audio, uses the phone's voice and waits as long as the server asks
 * (X-Voice-Retry-After, at most an hour) before trying the natural voice again.
 */
export async function speakAsync(said: string | Line): Promise<void> {
  const line = typeof said === "string" ? { text: said } : said;
  const blob = await ((line.key && early.get(line.key)) || naturalVoice(line));
  if (filling) await filling;
  if (blob) return play(blob);
  await new Promise<void>((resolve) => {
    if (!speechAvailable()) return resolve();
    speak(line.text, () => resolve());
  });
}

export function stopSpeaking() {
  current?.pause();
  current = null;
  if (speechAvailable()) window.speechSynthesis.cancel();
}
