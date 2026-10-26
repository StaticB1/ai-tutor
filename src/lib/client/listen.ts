"use client";

// Listening with the browser's own speech recognition (Chrome, Edge, Android, iOS Safari).
// On Chrome the audio is sent to the browser maker's speech service; the page itself keeps nothing.
// When the Cartesia grant lands, talk mode can switch this to Cartesia Ink without changing callers.

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
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

/**
 * Listens for one utterance. Calls onInterim as words arrive, then onFinal once with the whole
 * sentence, or onError. Southern African English first, since that is closest to how our
 * learners speak; the browser falls back to its default English if it does not have it.
 */
export function listenOnce(handlers: { onInterim: (t: string) => void; onFinal: (t: string) => void; onError: (code: string) => void }): Listener | null {
  const C = ctor();
  if (!C) return null;
  const rec = new C();
  rec.lang = "en-ZA";
  rec.continuous = false;
  rec.interimResults = true;
  let finalText = "";
  let done = false;
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onInterim((finalText + interim).trim());
  };
  rec.onerror = (e) => {
    if (done) return;
    done = true;
    handlers.onError(e.error);
  };
  rec.onend = () => {
    if (done) return;
    done = true;
    const t = finalText.trim();
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
