"use client";

// Listening with the browser's own speech recognition (Chrome, Edge, Android, iOS Safari).
// On Chrome the audio is sent to the browser maker's speech service; the page itself keeps nothing.
// When the Cartesia grant lands, talk mode can switch this to Cartesia Ink without changing callers.

import { spokenMaths } from "@/lib/spoken-maths";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; length: number; [i: number]: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function listeningAvailable(): boolean {
  return ctor() !== null;
}

export interface Listener {
  stop(): void;
}

/** How much of a heard phrase is maths: digits and symbols once written as maths. */
function mathsScore(t: string): number {
  return (spokenMaths(t).match(/[0-9=+\-×÷²³√%^/]/g) ?? []).length;
}

/** The browser's best guess, unless one of its other guesses reads as more maths. */
function bestAlternative(r: { length: number; [i: number]: { transcript: string } }, maths: boolean): string {
  let best = r[0].transcript;
  if (!maths) return best;
  let score = mathsScore(best);
  for (let i = 1; i < r.length; i++) {
    const s = mathsScore(r[i].transcript);
    if (s > score) {
      best = r[i].transcript;
      score = s;
    }
  }
  return best;
}

/**
 * Listens for one utterance. Calls onInterim as words arrive, then onFinal once with the whole
 * sentence, or onError. Southern African English first, since that is closest to how our
 * learners speak; the browser falls back to its default English if it does not have it.
 * With maths on, spoken maths is written as maths ("three x minus twelve" -> "3x - 12").
 */
export function listenOnce(handlers: {
  maths?: boolean;
  onInterim: (t: string) => void;
  onFinal: (t: string) => void;
  onError: (code: string) => void;
}): Listener | null {
  const C = ctor();
  if (!C) return null;
  const rec = new C();
  rec.lang = "en-ZA";
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = handlers.maths ? 3 : 1;
  const write = (t: string) => (handlers.maths ? spokenMaths(t) : t.trim());
  let finalText = "";
  let done = false;
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += bestAlternative(r, !!handlers.maths) + " ";
      else interim += r[0].transcript;
    }
    handlers.onInterim(write(finalText + interim));
  };
  rec.onerror = (e) => {
    if (done) return;
    done = true;
    handlers.onError(e.error);
  };
  rec.onend = () => {
    if (done) return;
    done = true;
    const t = write(finalText);
    if (t) handlers.onFinal(t);
    else handlers.onError("no-speech");
  };
  rec.start();
  return {
    stop: () => {
      done = true;
      try {
        rec.abort();
      } catch {
        // already stopped
      }
    },
  };
}
