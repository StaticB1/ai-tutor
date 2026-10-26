"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Composer, type ComposerHandle } from "./composer";
import { Icon } from "./icons";
import { TeacherReport } from "./teacher-report";
import { TalkMode } from "./talk-mode";
import { listeningAvailable } from "@/lib/client/listen";
import { store, useStore, type SavedLine, type SavedSession } from "@/lib/client/store";
import { speak, speechAvailable, stopSpeaking } from "@/lib/client/speech";
import type { PublicItem } from "@/lib/tutor/types";

interface Meta {
  id: string;
  subject: string;
  topic: string;
  art: string;
}

const MAX_CHARS = 1200;
const GREETING = "Hello. Have a go at the question, or tell me where you would start. I'll help with questions and hints. If you get really stuck, the full answer opens once you've tried every hint.";

/** Short messages that are clearly a line of working ("3x − 12 = 2x + 5") are set in the maths face. */
function looksLikeMaths(text: string): boolean {
  return text.length <= 60 && /[=<>≤≥]/.test(text) && /^[\d\sa-z+\-−×÷*/^().,=<>≤≥²³√π%°$]+$/i.test(text);
}

interface Props {
  item: PublicItem;
  questionHtml: string;
  all: Meta[];
}

/** Waits until the browser has read any saved session, then starts the chat from it. */
export function TutorSession(props: Props) {
  const saved = useStore(() => ({ session: store.session(props.item.id), canSpeak: speechAvailable() }));
  if (!saved) return <div className="min-h-[70vh]" aria-busy="true" />;
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
  const [talking, setTalking] = useState(false);
  const canTalk = canSpeak && listeningAvailable();
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

  const read = useCallback(
    (n: number, text: string) => {
      if (speaking === n) {
        stopSpeaking();
        setSpeaking(null);
        return;
      }
      setSpeaking(n);
      speak(text, () => setSpeaking((cur) => (cur === n ? null : cur)));
    },
    [speaking],
  );

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
      setLines((l) => [...l, { role: "tutor" as const, text: data.reply, html: data.replyHtml, gain: gained > 0 ? gained : undefined }]);
      // In talk mode the talk panel speaks every reply itself.
      if (prefs?.readAloud && speechAvailable() && !talking) {
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
    if (learnerCount === 0) return ["Where do I start?", "Give me a hint", "Explain the question"];
    return ["Give me a hint", "Check my step", "Explain it another way"];
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

  const segments = (cls = "") => (
    <div className={`segments ${cls}`} role="progressbar" aria-valuemin={0} aria-valuemax={progress.needed} aria-valuenow={progress.met} aria-label="Points earned">
      {Array.from({ length: progress.needed }, (_, n) => (
        <span key={`${n}-${popFrom}`} className={`${n < progress.met ? "on" : ""} ${popFrom !== null && n >= popFrom && n < progress.met ? "pop" : ""}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <Link href="/#questions" className="inline-flex items-center gap-2 text-[1.05rem] font-semibold underline underline-offset-4 decoration-2 decoration-navy/30 hover:decoration-navy no-print">
        <Icon.arrowLeft size={22} /> All questions
      </Link>

      {/* Phones: once the chat starts, a slim bar keeps the topic and points in view. */}
      {learnerCount > 0 && (
        <div className="lg:hidden sticky top-16 z-20 -mx-4 px-4 py-2.5 bg-paper backdrop-blur-md border-b border-line flex items-center gap-3 no-print -mt-6">
          <img src={item.art} alt="" width={36} height={36} className="h-9 w-9 rounded-xl art-tile object-contain p-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{item.topic}</p>
            <div className="mt-1.5 flex items-center gap-2">
              {segments("segments-sm flex-1")}
              <span className="text-xs font-semibold text-navy tabular-nums">
                {progress.met}/{progress.needed}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setQuestionOpen(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Question
          </button>
        </div>
      )}

      <div className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] items-stretch lg:h-[min(900px,calc(100dvh-10rem))]">
        {/* Question */}
        <section className="card p-5 sm:p-6 lg:p-7 flex flex-col lg:overflow-y-auto" aria-labelledby="q-title">
          <div className="flex lg:flex-col gap-4 lg:gap-6">
            <div className="art-tile rounded-2xl shrink-0 w-24 h-24 sm:w-28 sm:h-28 lg:w-full lg:h-52 flex items-center justify-center lg:bg-transparent!">
              <img src={item.art} alt="" width={220} height={220} className="h-full w-auto max-w-[70%] object-contain p-1.5 lg:p-0" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">
                {item.subject} · {item.level}
              </p>
              <h1 id="q-title" className="text-[1.6rem] sm:text-[2.2rem] lg:text-[clamp(2.6rem,3.4vw,3.1rem)] tracking-[-0.045em] font-extrabold text-navy mt-2">
                {item.topic}
              </h1>
              <button
                type="button"
                className="lg:hidden mt-1 text-sm font-medium inline-flex items-center gap-1"
                aria-expanded={questionOpen}
                aria-controls="q-body"
                onClick={() => setQuestionOpen((o) => !o)}
              >
                {questionOpen ? "Hide question" : "Show question"}
                <Icon.chevronDown size={16} className={`transition-transform ${questionOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          <div id="q-body" className={`${questionOpen ? "block" : "hidden"} lg:block mt-5`}>
            <div className="question text-[1.3rem] sm:text-[1.7rem] lg:text-[2.05rem] leading-snug text-ink" dangerouslySetInnerHTML={{ __html: questionHtml }} />
            <div className="border-t border-line mt-5 pt-4 text-text-2">{item.marks} marks</div>
          </div>

          <div className="panel-tint p-5 sm:p-6 mt-6 space-y-3.5">
            <div className="flex items-center justify-between font-semibold text-[1.05rem]">
              <span>Points</span>
              <span className="text-navy tabular-nums">
                {progress.met} of {progress.needed}
              </span>
            </div>
            {segments()}
            <p className="border-t border-line pt-3 text-[0.95rem] text-text-2">
              {hints.used} of {hints.total || "—"} hints used
              {!solution && helpLeft !== null && helpLeft > 0 && learnerCount > 0 && <span className="text-muted"> · answer opens after {helpLeft} more</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-6 lg:mt-auto lg:pt-8 no-print">
            <button type="button" className="btn btn-outline" onClick={() => setReportOpen(true)} disabled={!token}>
              <Icon.flag size={18} /> Report for my teacher
            </button>
            <button type="button" className="btn btn-outline" onClick={restart} disabled={!lines.length}>
              <Icon.refresh size={18} /> Start again
            </button>
          </div>
        </section>

        {/* Chat */}
        <section className="card flex flex-col min-h-[60vh] lg:min-h-0 overflow-hidden" aria-label="Chat with your tutor">
          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto px-4 sm:px-7 pt-6 sm:pt-7 pb-4 space-y-6">
            <div className="space-y-6" aria-live="polite" aria-relevant="additions">
              <TutorBubble canSpeak={canSpeak} n={-1} text={GREETING} speaking={speaking} onRead={read} />
              {lines.map((l, n) =>
                l.role === "tutor" ? (
                  <div key={n} className="space-y-3">
                    <TutorBubble canSpeak={canSpeak} n={n} text={l.text} html={l.html} speaking={speaking} onRead={read} />
                    {l.gain ? (
                      <span className="reward reward-in ml-[3.75rem]">
                        <Icon.sparkle size={20} className="text-lift" /> {l.gain === 1 ? "+1 point" : `+${l.gain} points`}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div key={n} className={`bubble bubble-learner bubble-in whitespace-pre-wrap ${looksLikeMaths(l.text) ? "bubble-maths" : ""}`}>
                    {looksLikeMaths(l.text) ? l.text.replace(/(\s)-(\s|\d)/g, "$1−$2").replace(/^-/, "−") : l.text}
                  </div>
                ),
              )}
              {busy && (
                <div className="flex items-start gap-3 bubble-in" aria-label="The tutor is thinking">
                  <span className="avatar" aria-hidden="true">
                    <Icon.bulbRays size={22} />
                  </span>
                  <div className="bubble bubble-tutor w-fit">
                    <span className="typing">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {errorText && (
              <div role="alert" className="panel-tint p-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{errorText}</p>
                {failed && (
                  <button type="button" className="btn btn-sm" onClick={() => send(failed)} disabled={busy}>
                    <Icon.refresh size={15} /> Try again
                  </button>
                )}
              </div>
            )}

            {solution && (
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
            )}
            <div ref={endRef} className="scroll-mb-72 lg:scroll-mb-4" />
          </div>

          {(!solution || talking) && (
            <div className="sticky bottom-0 lg:static bg-paper px-4 sm:px-7 pt-4 border-t border-line lg:border-t-0 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-7 no-print [[data-theme=dark]_&]:bg-[#14181F]">
              {revealable && (
                <div className="panel-tint p-3.5 mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">You&apos;ve used every hint. Keep trying, or see the answer with the full working.</p>
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => send("Please show me the answer.", "reveal")}>
                    <Icon.bulb size={15} /> Show me the answer
                  </button>
                </div>
              )}
              {talking ? (
                <TalkMode
                  reply={(() => {
                    for (let i = lines.length - 1; i >= 0; i--) if (lines[i].role === "tutor") return { index: i, text: lines[i].text };
                    return null;
                  })()}
                  busy={busy}
                  finished={Boolean(solution)}
                  maths={/math|physics|science|accounting/i.test(item.subject)}
                  onSay={sendLearner}
                  onClose={() => setTalking(false)}
                />
              ) : (
                <>
                  {canTalk && (
                    <button type="button" className="btn w-full mb-3 h-12!" onClick={() => setTalking(true)} disabled={busy}>
                      <Icon.mic size={18} /> Talk to your tutor
                    </button>
                  )}
                  <Composer ref={composer} busy={busy} quickReplies={quickReplies} onSend={sendLearner} maxLength={MAX_CHARS} />
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Keep going */}
      <section className="relative mt-20! rounded-[24px] bg-gradient-to-r from-tint-1 to-tint-2 grid grid-cols-1 md:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] items-end no-print md:min-h-[400px]">
        <div className="p-7 sm:p-12 space-y-5 self-center relative z-10">
          <p className="eyebrow">Keep going</p>
          <h2 className="text-[2.2rem] sm:text-[clamp(3.25rem,4.2vw,4rem)] tracking-[-0.05em] font-extrabold text-navy leading-[0.96] max-w-[26rem]">Practise more subjects</h2>
          <p className="text-text-2 text-[1.2rem] leading-relaxed max-w-[25rem]">Try questions in maths, science, history and more. Hints are there whenever you need them.</p>
          {next ? (
            <Link href={`/tutor/${next.id}`} className="btn btn-lg">
              Next: {next.topic} <Icon.arrowRight size={18} />
            </Link>
          ) : (
            <Link href="/#questions" className="btn btn-lg">
              Choose a question <Icon.arrowRight size={18} />
            </Link>
          )}
        </div>
        <div className="relative hidden md:block self-stretch">
          <div className="absolute right-6 left-0 top-10 bottom-6 rounded-[28px] bg-tint-2/70" aria-hidden="true" />
          {/* The frame reaches above the band so her head breaks the top edge; it clips the chair and legs at the bottom. */}
          <div className="absolute -top-12 bottom-0 -left-[6%] right-0 overflow-hidden rounded-br-[24px]">
            <img src="/illustrations/hero.webp" alt="" width={700} height={565} className="absolute right-0 -bottom-[22%] w-[108%] max-w-none h-auto mix-blend-multiply dark:mix-blend-normal" loading="lazy" />
          </div>
        </div>
      </section>

      {toast && (
        <div key={toast.id} className="toast" role="status">
          <span className="inline-flex items-center gap-1.5">
            <Icon.sparkle size={16} /> {toast.text}
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
    <div className="flex items-start gap-3 bubble-in">
      <span className="avatar" aria-hidden="true">
        <Icon.bulbRays size={22} />
      </span>
      <div className="bubble bubble-tutor">{html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p>{text}</p>}</div>
      {canSpeak && (
        <button
          type="button"
          className={`icon-btn shrink-0 self-end no-print opacity-60 hover:opacity-100 focus-visible:opacity-100 ${speaking === n ? "text-navy! opacity-100" : ""}`}
          onClick={() => onRead(n, text)}
          aria-label={speaking === n ? "Stop reading" : "Read aloud"}
          title={speaking === n ? "Stop" : "Listen"}
        >
          {speaking === n ? <Icon.stop size={16} /> : <Icon.speaker size={16} />}
        </button>
      )}
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
    <div className="space-y-4 pt-2">
      <section className="panel-tint p-5 sm:p-6 space-y-5" aria-labelledby="done-title">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <img
            src={revealed ? "/illustrations/finish-with-help.webp" : "/illustrations/finish-complete.webp"}
            alt=""
            width={180}
            height={135}
            className="w-[160px] h-auto self-center sm:self-auto mix-blend-multiply dark:mix-blend-normal"
          />
          <div>
            <h2 id="done-title" className="text-[1.8rem] tracking-[-0.04em] font-extrabold text-navy">
              {revealed ? "Done with help" : "Question complete"}
            </h2>
            <p className="text-text-2 mt-1">{praise}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Points", `${progress.met}/${progress.needed}`],
            ["Hints", String(hintsUsed)],
            ["Messages", String(messages)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-paper py-3 dark:bg-[#14181F]">
              <dd className="font-display text-2xl font-bold text-navy">{v}</dd>
              <dt className="text-xs text-text-2">{l}</dt>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2.5 no-print">
          {next ? (
            <Link href={`/tutor/${next.id}`} className="btn">
              Next: {next.topic} <Icon.arrowRight size={16} />
            </Link>
          ) : (
            <Link href="/progress" className="btn">
              See my progress <Icon.arrowRight size={16} />
            </Link>
          )}
          <button type="button" className="btn btn-outline" onClick={onReport}>
            <Icon.flag size={16} /> Report for my teacher
          </button>
          <button type="button" className="btn btn-outline" onClick={onRestart}>
            <Icon.refresh size={16} /> Try again
          </button>
        </div>
      </section>

      <section className="card p-5 sm:p-6 space-y-3" aria-labelledby="sol-title">
        <h2 id="sol-title" className="eyebrow">
          Worked solution
        </h2>
        <ol className="space-y-3">
          {solution.map((s, n) => (
            <li key={n} className="flex gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint-2 text-navy text-sm font-semibold mt-0.5">{n + 1}</span>
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
