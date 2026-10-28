"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { listenOnce, type Listener } from "@/lib/client/listen";
import { fill, prefetch, speakAsync, stopSpeaking } from "@/lib/client/speech";
import { STILL_THINKING, THINKING, type Line } from "@/lib/talk-lines";

type Phase = "listening" | "checking" | "thinking" | "speaking" | "paused" | "done";

// On maths, what was heard waits this long on screen before it is sent, so a misheard number can be said again.
const CHECK_MS = 4000;
// If the reply is still not ready this long after sending, say so once.
const STILL_MS = 6000;

const ERRORS: Record<string, string> = {
  "not-allowed": "Allow the microphone in your browser to talk to the tutor.",
  "service-not-allowed": "Allow the microphone in your browser to talk to the tutor.",
  "no-speech": "I didn't hear anything. Tap the button and speak.",
  "audio-capture": "No microphone was found on this device.",
  network: "Speech needs an internet connection. Check your data and try again.",
};

/**
 * Hands-free conversation: the tutor speaks first, then it listens to the learner, sends what they
 * said, speaks the reply and listens again, until they stop or finish the question. While a reply is
 * being worked out it says a short line ("Let me look at that"), so the wait is not silent.
 */
export function TalkMode({
  opening,
  reply,
  busy,
  finished,
  maths = false,
  onSay,
  onClose,
}: {
  /** said when talk mode opens, before it listens */
  opening: Line;
  /** the newest tutor message; a new index means a new reply to speak */
  reply: { index: number; text: string } | null;
  busy: boolean;
  finished: boolean;
  /** write spoken maths as maths, and show it for a moment before sending */
  maths?: boolean;
  onSay: (text: string) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("paused");
  const [heard, setHeard] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const listener = useRef<Listener | null>(null);
  const spokenIndex = useRef<number | null>(reply?.index ?? null);
  const alive = useRef(true);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped whenever the learner cuts the tutor off, so speech that was interrupted does not
  // start listening a second time when it ends.
  const speech = useRef(0);
  const openingRef = useRef(opening);
  const finishedRef = useRef(finished);
  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);
  // The parent passes a new onSay function on every render; keep the latest in a ref so that
  // listening is never restarted (and the learner cut off) just because the page re-rendered.
  const sayRef = useRef(onSay);
  useEffect(() => {
    sayRef.current = onSay;
  }, [onSay]);

  const send = useCallback((t: string) => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = null;
    setPhase("thinking");
    sayRef.current(t);
    fill(THINKING);
    if (stillTimer.current) clearTimeout(stillTimer.current);
    stillTimer.current = setTimeout(() => fill(STILL_THINKING), STILL_MS);
  }, []);

  const clearStill = () => {
    if (stillTimer.current) clearTimeout(stillTimer.current);
    stillTimer.current = null;
  };

  const listen = useCallback(() => {
    if (!alive.current) return;
    if (checkTimer.current) clearTimeout(checkTimer.current);
    setNote(null);
    setHeard("");
    setPhase("listening");
    listener.current = listenOnce({
      maths,
      onInterim: (t) => setHeard(t),
      onFinal: (t) => {
        setHeard(t);
        if (!maths) return send(t);
        setPhase("checking");
        checkTimer.current = setTimeout(() => send(t), CHECK_MS);
      },
      onError: (code) => {
        setPhase("paused");
        setNote(ERRORS[code] ?? "I couldn't hear that. Tap the button and try again.");
      },
    });
    if (!listener.current) {
      setPhase("paused");
      setNote("This browser can't listen. Try Chrome, or type your answer.");
    }
  }, [maths, send]);

  // Speak first when talk mode opens, then listen. The fillers are fetched now so they are ready
  // by the time the learner has said something.
  useEffect(() => {
    alive.current = true;
    prefetch([...THINKING, ...STILL_THINKING]);
    const t = setTimeout(async () => {
      if (finishedRef.current) return setPhase("done");
      const mine = ++speech.current;
      setPhase("speaking");
      await speakAsync(openingRef.current);
      if (alive.current && speech.current === mine) listen();
    }, 150);
    return () => {
      alive.current = false;
      clearTimeout(t);
      if (checkTimer.current) clearTimeout(checkTimer.current);
      clearStill();
      listener.current?.stop();
      stopSpeaking();
    };
  }, [listen]);

  // A new tutor reply: say it, then listen again (or stop if the question is finished).
  // Keyed on the reply's index, not the object, so a re-render never cancels speech midway;
  // only closing talk mode (alive = false) stops the loop.
  const replyIndex = reply?.index ?? null;
  const replyText = reply?.text ?? "";
  useEffect(() => {
    if (!busy) clearStill();
    if (replyIndex === null || replyIndex === spokenIndex.current || busy) return;
    spokenIndex.current = replyIndex;
    (async () => {
      const mine = ++speech.current;
      setPhase("speaking");
      await speakAsync(replyText);
      if (!alive.current || speech.current !== mine) return;
      if (finishedRef.current) setPhase("done");
      else listen();
    })();
  }, [replyIndex, replyText, busy, listen]);

  function tapOrb() {
    if (phase === "speaking") {
      speech.current++;
      stopSpeaking();
      listen();
    } else if (phase === "listening") {
      listener.current?.stop();
      setPhase("paused");
    } else if (phase === "paused" || phase === "checking") {
      listen();
    }
  }

  const label = {
    listening: heard ? "Listening…" : "Listening. Say your working or your answer.",
    checking: "Is this what you said?",
    thinking: "Thinking…",
    speaking: "Speaking. Tap to interrupt.",
    paused: "Tap to speak",
    done: "Question complete",
  }[phase];

  return (
    <div className="panel-tint p-5 sm:p-6 flex flex-col items-center text-center gap-4" aria-label="Talk mode">
      <button
        type="button"
        onClick={tapOrb}
        disabled={phase === "thinking" || phase === "done"}
        className={`talk-orb talk-${phase}`}
        aria-label={phase === "listening" ? "Stop listening" : phase === "speaking" ? "Interrupt and speak" : phase === "checking" ? "Say it again" : "Start speaking"}
      >
        {phase === "speaking" ? <Icon.speaker size={30} /> : phase === "thinking" ? <span className="typing"><span /><span /><span /></span> : <Icon.mic size={30} />}
      </button>
      <div role="status" aria-live="polite" className="min-h-[3.5rem] space-y-1">
        <p className="font-semibold text-navy">{label}</p>
        {heard && phase !== "speaking" && phase !== "checking" && <p className="text-text-2 text-sm italic max-w-md">&ldquo;{heard}&rdquo;</p>}
        {phase === "checking" && (
          <>
            <p className="bubble-maths text-lg max-w-md">{heard.replace(/(\s)-(\s|\d)/g, "$1−$2").replace(/^-/, "−")}</p>
            <div className="talk-check-bar" style={{ animationDuration: `${CHECK_MS}ms` }} aria-hidden />
          </>
        )}
        {note && <p className="text-sm text-ink">{note}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {phase === "checking" && (
          <>
            <button type="button" className="btn btn-sm" onClick={() => send(heard)}>
              <Icon.send size={16} /> Send
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={listen}>
              <Icon.mic size={16} /> Say it again
            </button>
          </>
        )}
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
          <Icon.keypad size={16} /> Type instead
        </button>
      </div>
      <p className="text-xs text-muted max-w-sm">Your voice is turned into text by your browser&apos;s speech service; we don&apos;t record or keep audio.</p>
    </div>
  );
}
