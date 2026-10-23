"use client";

import { useRef, useState } from "react";
import type { PublicItem } from "@/lib/tutor/types";

interface Line {
  role: "learner" | "tutor";
  text: string;
  html?: string;
}

interface Report {
  facts: { label: string; value: string }[];
  misconceptions: string[];
  flagged: boolean;
  summary: string;
}

export function TutorChat({ item }: { item: PublicItem }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ met: 0, needed: item.pointsNeeded });
  const [solution, setSolution] = useState<string[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
    const history = lines.map(({ role, text }) => ({ role, text }));
    setLines((l) => [...l, { role: "learner", text: message }]);
    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, token, message, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setToken(data.token);
      setProgress(data.progress);
      setLines((l) => [...l, { role: "tutor", text: data.reply, html: data.replyHtml }]);
      if (data.solutionHtml) setSolution(data.solutionHtml);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLines((l) => l.slice(0, -1));
      setDraft(message);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    }
  }

  async function loadReport() {
    if (!token) return;
    setReportBusy(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, history: lines.map(({ role, text }) => ({ role, text })) }),
      });
      if (res.ok) setReport(await res.json());
    } finally {
      setReportBusy(false);
    }
  }

  const done = solution !== null;

  return (
    <section className="space-y-4" aria-label="Tutor">
      <div className="flex items-center gap-2" aria-label={`${progress.met} of ${progress.needed} marking points shown`}>
        <span className="eyebrow">Progress</span>
        {Array.from({ length: progress.needed }, (_, n) => (
          <span key={n} className={`dot ${n < progress.met ? "dot-on" : ""}`} />
        ))}
      </div>

      <div className="space-y-3" aria-live="polite">
        {lines.length === 0 && (
          <div className="bubble bubble-tutor">
            <p>Hello. Have a go at the question above, or tell me where you would start. I will help you get there, but I will not give you the answer.</p>
          </div>
        )}
        {lines.map((l, n) =>
          l.role === "tutor" ? (
            <div key={n} className="bubble bubble-tutor" dangerouslySetInnerHTML={{ __html: l.html ?? "" }} />
          ) : (
            <div key={n} className="bubble bubble-learner whitespace-pre-wrap">
              {l.text}
            </div>
          ),
        )}
        {busy && <div className="bubble bubble-tutor text-muted">Thinking…</div>}
        <div ref={endRef} />
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-ink">
          {error}
        </p>
      )}

      {done ? (
        <div className="card p-5 space-y-3">
          <p className="eyebrow">Worked solution</p>
          <ol className="list-decimal pl-5 space-y-2">
            {solution.map((s, n) => (
              <li key={n} dangerouslySetInnerHTML={{ __html: s }} />
            ))}
          </ol>
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="msg" className="sr-only">
            Your answer or question
          </label>
          <textarea
            id="msg"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={3}
            maxLength={1200}
            placeholder="Type your working or your answer…"
            className="w-full rounded-xl border border-paper-3 bg-paper p-3 focus:border-navy"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn" disabled={busy || !draft.trim()}>
              Send
            </button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => send("I'm stuck. Can I have a hint?")}>
              I&apos;m stuck
            </button>
          </div>
        </form>
      )}

      {token && (
        <details className="card p-4" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && !report && loadReport()}>
          <summary className="cursor-pointer font-display font-semibold">Teacher view</summary>
          {reportBusy && <p className="text-sm text-muted mt-3">Writing the report…</p>}
          {report && (
            <div className="mt-3 space-y-3 text-sm">
              {report.flagged && <p className="font-semibold">A safeguarding message was shown in this session. Please check in with the learner.</p>}
              {report.summary && <p>{report.summary}</p>}
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                {report.facts.map((f) => (
                  <div key={f.label} className="contents">
                    <dt className="text-text-2">{f.label}</dt>
                    <dd className="font-medium text-right">{f.value}</dd>
                  </div>
                ))}
              </dl>
              {report.misconceptions.length > 0 && (
                <div>
                  <p className="eyebrow">Mistakes seen</p>
                  <ul className="list-disc pl-5">
                    {report.misconceptions.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button type="button" className="btn btn-secondary" onClick={loadReport} disabled={reportBusy}>
                Refresh
              </button>
            </div>
          )}
        </details>
      )}
    </section>
  );
}
