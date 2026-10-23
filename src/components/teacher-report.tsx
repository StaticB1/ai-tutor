"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

interface Report {
  facts: { label: string; value: string }[];
  misconceptions: string[];
  flagged: boolean;
  summary: string;
  summaryHtml: string;
  misconceptionsHtml: string[];
}

/** A report the learner can show or print for their teacher. Opened as a modal dialog. */
export function TeacherReport({
  onClose,
  token,
  history,
  title,
  subtitle,
}: {
  onClose: () => void;
  token: string | null;
  history: { role: "learner" | "tutor"; text: string }[];
  title: string;
  subtitle: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Mounted fresh each time it opens, so it starts loading and fetches once.
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(Boolean(token));
  const [error, setError] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (!token) return;
    let gone = false;
    fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, history }) })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r: Report) => !gone && setReport(r))
      .catch(() => !gone && setError(true))
      .finally(() => !gone && setBusy(false));
    return () => {
      gone = true;
    };
    // the report covers the chat as it was when opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog ref={ref} className="sheet print-area" onClose={onClose} aria-labelledby="report-title">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Report for my teacher</p>
            <h2 id="report-title" className="text-xl mt-1">
              {title}
            </h2>
            <p className="text-sm text-text-2">{subtitle}</p>
          </div>
          <button type="button" className="icon-btn no-print" aria-label="Close" onClick={onClose}>
            <Icon.close size={18} />
          </button>
        </div>

        {!token && <p className="text-text-2">Send a message first, then the report will show how you are doing.</p>}
        {busy && (
          <p className="text-text-2 flex items-center gap-2">
            <span className="typing" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Writing the report…
          </p>
        )}
        {error && <p className="text-text-2">The report could not be written just now. Please try again.</p>}

        {report && !busy && (
          <div className="space-y-4 text-sm">
            {report.flagged && (
              <p className="card p-3 font-semibold">A safeguarding message was shown in this session. Please check in with the learner.</p>
            )}
            {report.summaryHtml && <div className="text-base" dangerouslySetInnerHTML={{ __html: report.summaryHtml }} />}
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
              {report.facts.map((f) => (
                <div key={f.label} className="contents">
                  <dt className="text-text-2">{f.label}</dt>
                  <dd className="font-medium text-right">{f.value}</dd>
                </div>
              ))}
            </dl>
            {report.misconceptions.length > 0 && (
              <div>
                <p className="eyebrow mb-1">Mistakes seen</p>
                <ul className="list-disc pl-5 space-y-1">
                  {report.misconceptionsHtml.map((m) => (
                    <li key={m} dangerouslySetInnerHTML={{ __html: m }} />
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted">
              Written by AI Tutor on {new Date().toLocaleDateString()}. The AI can make mistakes; please check the learner&apos;s work.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 no-print">
          <button type="button" className="btn btn-sm" onClick={() => window.print()} disabled={!report}>
            <Icon.printer size={16} /> Print or save as PDF
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
