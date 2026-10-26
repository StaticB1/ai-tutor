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

/**
 * Speaks and resolves when finished. Tries the tutor's natural voice (Cartesia) first; if the
 * server answers without audio, uses the phone's voice and waits as long as the server asks
 * (X-Voice-Retry-After, at most an hour) before trying the natural voice again.
 */
// When the server says the natural voice is paused, don't ask again until it says to.
let skipServerUntil = 0;

export async function speakAsync(text: string): Promise<void> {
  try {
    if (Date.now() < skipServerUntil) throw new Error("natural voice paused");
    const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (res.status === 204) {
      const retry = Number(res.headers.get("X-Voice-Retry-After") ?? 60);
      skipServerUntil = Date.now() + Math.min(retry, 3600) * 1000;
    }
    if (res.status === 200) {
      const url = URL.createObjectURL(await res.blob());
      await new Promise<void>((resolve) => {
        current = new Audio(url);
        // ended, failed or paused by an interruption: all count as finished
        current.onended = current.onerror = current.onpause = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        current.play().catch(() => resolve());
      });
      return;
    }
  } catch {
    // fall through to the phone voice
  }
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
