"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { listenOnce, type Listener } from "@/lib/client/listen";
import { speakAsync, stopSpeaking } from "@/lib/client/speech";

type Phase = "listening" | "checking" | "thinking" | "speaking" | "paused" | "done";

// On maths, what was heard waits this long on screen before it is sent, so a misheard number can be said again.
const CHECK_MS = 4000;

const ERRORS: Record<string, string> = {
  "not-allowed": "Allow the microphone in your browser to talk to the tutor.",
  "service-not-allowed": "Allow the microphone in your browser to talk to the tutor.",
  "no-speech": "I didn't hear anything. Tap the button and speak.",
  "audio-capture": "No microphone was found on this device.",
  network: "Speech needs an internet connection. Check your data and try again.",
};

/**
 * Hands-free conversation: listen to the learner, send what they said, speak the tutor's reply,
 * then listen again, until they stop or finish the question.
 */
export function TalkMode({
  reply,
  busy,
  finished,
  maths = false,
  onSay,
  onClose,
}: {
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
  }, []);

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

  // Start listening as soon as talk mode opens.
  useEffect(() => {
    alive.current = true;
    const t = setTimeout(listen, 150);
    return () => {
      alive.current = false;
      clearTimeout(t);
      if (checkTimer.current) clearTimeout(checkTimer.current);
      listener.current?.stop();
      stopSpeaking();
    };
  }, [listen]);

  // A new tutor reply: say it, then listen again (or stop if the question is finished).
  // Keyed on the reply's index, not the object, so a re-render never cancels speech midway;
  // only closing talk mode (alive = false) stops the loop.
  const replyIndex = reply?.index ?? null;
  const replyText = reply?.text ?? "";
  const finishedRef = useRef(finished);
  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);
  useEffect(() => {
    if (replyIndex === null || replyIndex === spokenIndex.current || busy) return;
    spokenIndex.current = replyIndex;
    (async () => {
      setPhase("speaking");
      await speakAsync(replyText);
      if (!alive.current) return;
      if (finishedRef.current) setPhase("done");
      else listen();
    })();
  }, [replyIndex, replyText, busy, listen]);

  function tapOrb() {
    if (phase === "speaking") {
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
