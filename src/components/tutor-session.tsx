"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Composer, type ComposerHandle } from "./composer";
import { Icon, SubjectIcon } from "./icons";
import { TeacherReport } from "./teacher-report";
import { store, useStore, type SavedLine, type SavedSession } from "@/lib/client/store";
import { speak, speechAvailable, stopSpeaking } from "@/lib/client/speech";
import type { PublicItem } from "@/lib/tutor/types";

interface Meta {
  id: string;
  subject: string;
  topic: string;
}

const MAX_CHARS = 1200;
const NUMERIC_SUBJECTS = new Set(["Mathematics", "Physics", "Principles of Accounting", "Computer Science"]);

interface Props {
  item: PublicItem;
  questionHtml: string;
  all: Meta[];
}

/** Waits until the browser has read any saved session, then starts the chat from it. */
export function TutorSession(props: Props) {
  const saved = useStore(() => ({ session: store.session(props.item.id), canSpeak: speechAvailable() }));
  if (!saved) return <div className="min-h-[60vh]" aria-busy="true" />;
  return <Session {...props} saved={saved.session} canSpeak={saved.canSpeak} />;
}

function Session({ item, questionHtml, all, saved, canSpeak }: Props & { saved: SavedSession | null; canSpeak: boolean }) {
  const [lines, setLines] = useState<SavedLine[]>(saved?.lines ?? []);
  const [token, setToken] = useState<string | null>(saved?.token ?? null);
  const [progress, setProgress] = useState(saved?.progress ?? { met: 0, needed: item.pointsNeeded });
  const [hints, setHints] = useState(saved?.hints ?? { used: 0, total: 0 });
  const [solution, setSolution] = useState<string[] | null>(saved?.solution ?? null);
  const [helpLeft, setHelpLeft] = useState<number | null>(saved?.helpLeft ?? null);
  const [revealable, setRevealable] = useState(saved?.canReveal ?? false);
  const [revealed, setRevealed] = useState(saved?.revealed ?? false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [popFrom, setPopFrom] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [questionOpen, setQuestionOpen] = useState(!saved?.lines.length);
  const [celebrate, setCelebrate] = useState(false);
  const prefs = useStore(store.prefs);
  const finished = useStore(store.finished);
  const composer = useRef<ComposerHandle>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => stopSpeaking(), []);

  // Save after every change, so a refresh or a dropped connection loses nothing.
  useEffect(() => {
    if (lines.length === 0 && !token) return;
    store.saveSession({ itemId: item.id, lines, token, progress, hints, solution, helpLeft: helpLeft ?? undefined, canReveal: revealable, revealed, updatedAt: Date.now() });
  }, [item.id, lines, token, progress, hints, solution, helpLeft, revealable, revealed]);

  // "/" jumps to the answer box, as on many learning sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["TEXTAREA", "INPUT", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        composer.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const scrollDown = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));

  const read = useCallback((n: number, text: string) => {
    if (speaking === n) {
      stopSpeaking();
      setSpeaking(null);
      return;
    }
    setSpeaking(n);
    speak(text, () => setSpeaking((cur) => (cur === n ? null : cur)));
  }, [speaking]);

  async function send(message: string, action: "message" | "reveal" = "message") {
    if (busy || solution) return;
    setBusy(true);
    setFailed(null);
    setErrorText(null);
    setQuestionOpen(false);
    const history = lines.map(({ role, text }) => ({ role, text }));
    setLines((l) => [...l, { role: "learner", text: message }]);
    scrollDown();
    store.noteActivity();
    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, token, message, history, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      const gained = data.progress.met - progress.met;
      setToken(data.token);
      setProgress(data.progress);
      if (data.hints) setHints(data.hints);
      if (typeof data.helpLeft === "number") setHelpLeft(data.helpLeft);
      setRevealable(Boolean(data.canReveal));
      if (data.revealed) setRevealed(true);
      setLines((l) => [...l, { role: "tutor" as const, text: data.reply, html: data.replyHtml }]);
      if (prefs?.readAloud && speechAvailable()) {
        // the learner's line went in at index lines.length, so the reply lands one after it
        const at = lines.length + 1;
        setSpeaking(at);
        speak(data.reply, () => setSpeaking((cur) => (cur === at ? null : cur)));
      }
      if (gained > 0) {
        setPopFrom(progress.met);
        setToast({ id: Date.now(), text: gained === 1 ? "+1 point" : `+${gained} points` });
      }
      if (data.solutionHtml) {
        setSolution(data.solutionHtml);
        if (!data.revealed) setCelebrate(true);
        store.markFinished({
          itemId: item.id,
          subject: item.subject,
          points: data.progress.met,
          needed: data.progress.needed,
          hintsUsed: data.hints?.used ?? hints.used,
          messages: lines.filter((l) => l.role === "learner").length + 1,
          withHelp: Boolean(data.revealed),
          finishedAt: Date.now(),
        });
      }
    } catch (e) {
      setLines((l) => l.slice(0, -1));
      setFailed(message);
      setErrorText(e instanceof Error ? e.message : "Something went wrong.");
      composer.current?.setText(message);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  function restart() {
    if (lines.length && !window.confirm("Start this question again? Your chat for it will be cleared.")) return;
    stopSpeaking();
    store.clearSession(item.id);
    setLines([]);
    setToken(null);
    setProgress({ met: 0, needed: item.pointsNeeded });
    setHints({ used: 0, total: 0 });
    setSolution(null);
    setHelpLeft(null);
    setRevealable(false);
    setRevealed(false);
    setCelebrate(false);
    setQuestionOpen(true);
    setFailed(null);
    setErrorText(null);
  }

  const learnerCount = lines.filter((l) => l.role === "learner").length;
  const quickReplies = useMemo(() => {
    if (solution) return [];
    if (learnerCount === 0) return ["Where do I start?", "Explain the question in simpler words", "I'm stuck"];
    return ["I'm stuck", "Check my working so far", "What does that mean?", "Explain it another way"];
  }, [solution, learnerCount]);
  const sendLearner = (t: string) => send(t);

  const next = useMemo(() => {
    const done = finished ?? {};
    const idx = all.findIndex((i) => i.id === item.id);
    const after = [...all.slice(idx + 1), ...all.slice(0, idx)].filter((i) => !done[i.id] && i.id !== item.id);
    return after.find((i) => i.subject === item.subject) ?? after[0] ?? null;
  }, [all, finished, item.id, item.subject]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2300);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="grid gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
      {/* Question */}
      <aside className="lg:sticky lg:top-20 space-y-3">
        <Link href="/" className="text-sm inline-flex items-center gap-1 no-print">
          <Icon.arrowLeft size={15} /> All questions
        </Link>
        <section className="card p-5 space-y-3" aria-labelledby="q-title">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-paper">
              <SubjectIcon subject={item.subject} size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="eyebrow">
                {item.subject} · {item.level}
              </p>
              <h1 id="q-title" className="text-xl mt-0.5">
                {item.topic}
              </h1>
            </div>
            <button
              type="button"
              className="icon-btn lg:hidden"
              aria-expanded={questionOpen}
              aria-controls="q-body"
              aria-label={questionOpen ? "Hide the question" : "Show the question"}
              onClick={() => setQuestionOpen((o) => !o)}
            >
              <Icon.chevronDown size={18} className={`transition-transform ${questionOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          {!questionOpen && (
            <button type="button" className="question text-left w-full line-clamp-2 text-text-2 lg:hidden" onClick={() => setQuestionOpen(true)} aria-label="Show the whole question">
              <span dangerouslySetInnerHTML={{ __html: questionHtml }} />
            </button>
          )}
          <div id="q-body" className={`${questionOpen ? "block" : "hidden"} lg:block space-y-3`}>
            <div className="question text-lg" dangerouslySetInnerHTML={{ __html: questionHtml }} />
            <p className="text-sm text-text-2">{item.marks} marks</p>
          </div>

          {/* Progress */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Points {progress.met} of {progress.needed}
              </span>
              {hints.total > 0 && (
                <span className="text-text-2 inline-flex items-center gap-1">
                  <Icon.bulb size={14} /> {hints.used} of {hints.total} hints used
                </span>
              )}
            </div>
            {!solution && helpLeft !== null && helpLeft > 0 && learnerCount > 0 && (
              <p className="text-xs text-muted">
                Stuck? The full answer opens after {helpLeft} more {helpLeft === 1 ? "hint or step" : "hints or steps"}. Tap &ldquo;I&apos;m stuck&rdquo; to get them.
              </p>
            )}
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={progress.needed} aria-valuenow={progress.met} aria-label="Points earned">
              {Array.from({ length: progress.needed }, (_, n) => (
                <span key={`${n}-${popFrom}`} className={`${n < progress.met ? "on" : ""} ${popFrom !== null && n >= popFrom && n < progress.met ? "pop" : ""}`} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 no-print">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReportOpen(true)} disabled={!token}>
              <Icon.clipboard size={15} /> Report for my teacher
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={restart} disabled={!lines.length}>
              <Icon.refresh size={15} /> Start again
            </button>
          </div>
        </section>
      </aside>

      {/* Chat */}
      <section className="flex flex-col gap-4 min-h-[60vh]" aria-label="Chat with your tutor">
        <div className="space-y-3" aria-live="polite" aria-relevant="additions">
          <TutorBubble canSpeak={canSpeak} n={-1} text="Hello. Have a go at the question, or tell me where you would start. I will help you get there, but I will not give you the answer." speaking={speaking} onRead={read} />
          {lines.map((l, n) =>
            l.role === "tutor" ? (
              <TutorBubble canSpeak={canSpeak} key={n} n={n} text={l.text} html={l.html} speaking={speaking} onRead={read} />
            ) : (
              <div key={n} className="bubble bubble-learner bubble-in whitespace-pre-wrap">
                {l.text}
              </div>
            ),
          )}
          {busy && (
            <div className="bubble bubble-tutor bubble-in w-fit" aria-label="The tutor is thinking">
              <span className="typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
          <div ref={endRef} className="scroll-mb-64" />
        </div>

        {errorText && (
          <div role="alert" className="card p-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{errorText}</p>
            {failed && (
              <button type="button" className="btn btn-sm" onClick={() => send(failed)} disabled={busy}>
                <Icon.refresh size={15} /> Try again
              </button>
            )}
          </div>
        )}

        {solution ? (
          <Finished
            revealed={revealed}
            progress={progress}
            hintsUsed={hints.used}
            messages={learnerCount}
            solution={solution}
            next={next}
            onReport={() => setReportOpen(true)}
            onRestart={restart}
          />
        ) : (
          <div className="sticky bottom-0 bg-paper pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] no-print">
            {revealable && (
              <div className="card p-3 mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">You&apos;ve used every hint. Keep trying, or see the answer with the full working.</p>
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => send("Please show me the answer.", "reveal")}>
                  <Icon.bulb size={15} /> Show me the answer
                </button>
              </div>
            )}
            <Composer ref={composer} busy={busy} quickReplies={quickReplies} showKeypadByDefault={false} onSend={sendLearner} maxLength={MAX_CHARS} />
            {NUMERIC_SUBJECTS.has(item.subject) && learnerCount === 0 && (
              <p className="text-xs text-muted mt-2 flex items-center gap-1">
                <Icon.keypad size={13} /> Tap the keypad button for maths symbols like × ÷ ² √
              </p>
            )}
          </div>
        )}
      </section>

      {toast && (
        <div key={toast.id} className="toast" role="status">
          <span className="inline-flex items-center gap-1.5">
            <Icon.trophy size={16} /> {toast.text}
          </span>
        </div>
      )}
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      {reportOpen && (
        <TeacherReport
        onClose={() => setReportOpen(false)}
        token={token}
        history={lines.map(({ role, text }) => ({ role, text }))}
        title={item.topic}
        subtitle={`${item.subject} · ${item.level}`}
        />
      )}
    </div>
  );
}

function TutorBubble({ n, text, html, speaking, onRead, canSpeak }: { n: number; text: string; html?: string; speaking: number | null; onRead: (n: number, text: string) => void; canSpeak: boolean }) {
  return (
    <div className="flex items-start gap-2 bubble-in">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-paper mt-0.5" aria-hidden="true">
        <Icon.bulb size={15} />
      </span>
      <div className="bubble bubble-tutor flex-1 sm:flex-none">
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p>{text}</p>}
        {canSpeak && (
          <button
            type="button"
            className="mt-1 -ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-text-2 hover:text-ink hover:bg-paper-3 no-print"
            onClick={() => onRead(n, text)}
            aria-label={speaking === n ? "Stop reading" : "Read aloud"}
          >
            {speaking === n ? <Icon.stop size={13} /> : <Icon.speaker size={13} />}
            {speaking === n ? "Stop" : "Listen"}
          </button>
        )}
      </div>
    </div>
  );
}

function Finished({
  revealed,
  progress,
  hintsUsed,
  messages,
  solution,
  next,
  onReport,
  onRestart,
}: {
  revealed: boolean;
  progress: { met: number; needed: number };
  hintsUsed: number;
  messages: number;
  solution: string[];
  next: Meta | null;
  onReport: () => void;
  onRestart: () => void;
}) {
  const praise = revealed
    ? "You kept going through every hint, and that effort counts. Read the working below, then try the next one on your own."
    : hintsUsed === 0
      ? "You worked it out without a single hint."
      : hintsUsed === 1
        ? "You needed just one hint."
        : `You worked through it with ${hintsUsed} hints.`;
  return (
    <div className="space-y-4">
      <section className="card p-5 space-y-4 border-navy" aria-labelledby="done-title">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy text-paper">
            {revealed ? <Icon.bulb size={24} /> : <Icon.trophy size={24} />}
          </span>
          <div>
            <h2 id="done-title" className="text-2xl">
              {revealed ? "Done with help" : "Question complete"}
            </h2>
            <p className="text-text-2">{praise}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Points", `${progress.met}/${progress.needed}`],
            ["Hints", String(hintsUsed)],
            ["Messages", String(messages)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-paper-2 py-3">
              <dd className="font-display text-xl font-semibold">{v}</dd>
              <dt className="text-xs text-text-2">{l}</dt>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 no-print">
          {next ? (
            <Link href={`/tutor/${next.id}`} className="btn">
              Next: {next.topic} <Icon.arrowRight size={16} />
            </Link>
          ) : (
            <Link href="/progress" className="btn">
              See my progress <Icon.arrowRight size={16} />
            </Link>
          )}
          <button type="button" className="btn btn-secondary" onClick={onReport}>
            <Icon.clipboard size={16} /> Report for my teacher
          </button>
          <button type="button" className="btn btn-secondary" onClick={onRestart}>
            <Icon.refresh size={16} /> Try again
          </button>
        </div>
      </section>

      <section className="card p-5 space-y-3" aria-labelledby="sol-title">
        <h2 id="sol-title" className="eyebrow">
          Worked solution
        </h2>
        <ol className="space-y-2">
          {solution.map((s, n) => (
            <li key={n} className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-3 text-xs font-semibold mt-0.5">{n + 1}</span>
              <div dangerouslySetInnerHTML={{ __html: s }} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Confetti({ onDone }: { onDone: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 9) * 0.08}s`,
        color: ["var(--st-navy)", "var(--st-lift)", "var(--st-text-2)"][i % 3],
      })),
    [],
  );
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: p.left, animationDelay: p.delay, background: p.color }} />
      ))}
    </div>
  );
}
