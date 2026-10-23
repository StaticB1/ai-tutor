// A short report a teacher can read in ten seconds. The facts come from the signed state;
// the model only writes the two-sentence summary from those facts and the transcript.

import type { ModelCall } from "./model";
import { needed } from "./engine";
import type { ChatTurn, Item, TutorState } from "./types";

export interface Report {
  facts: { label: string; value: string }[];
  misconceptions: string[];
  flagged: boolean;
  summary: string;
}

export async function buildReport(call: ModelCall, item: Item, state: TutorState, history: ChatTurn[]): Promise<Report> {
  const shown = item.markingPoints.filter((p) => state.met.includes(p.id)).map((p) => p.text);
  const missing = item.markingPoints.filter((p) => !state.met.includes(p.id)).map((p) => p.text);
  const misconceptions = item.misconceptions.filter((m) => state.misconceptions.includes(m.id)).map((m) => m.description);
  const facts = [
    { label: "Finished", value: state.done ? "Yes" : "Not yet" },
    { label: "Marking points shown", value: `${Math.min(state.met.length, needed(item))} of ${needed(item)}` },
    { label: "Hints used", value: String(state.hintLevel) },
    { label: "Worked steps shown", value: String(state.stepsShown) },
    { label: "Asked for the answer", value: String(state.answerRequests) },
    { label: "Replies blocked for giving too much away", value: String(state.leaksBlocked) },
    { label: "Learner messages", value: String(state.turns) },
  ];
  let summary = "";
  try {
    const transcript = history
      .slice(-20)
      .map((t) => `${t.role === "learner" ? "Learner" : "Tutor"}: ${t.text}`)
      .join("\n");
    const { text } = await call(
      "judge",
      [
        {
          role: "user",
          content: [
            `Write two short sentences for the learner's teacher about this ${item.subject} session. Plain British English, no praise words, no advice beyond one next step.`,
            `Question: ${item.question}`,
            `Shown: ${shown.join("; ") || "nothing yet"}`,
            `Not yet shown: ${missing.join("; ") || "nothing"}`,
            `Mistakes seen: ${misconceptions.join("; ") || "none"}`,
            `Hints used: ${state.hintLevel}; worked steps shown: ${state.stepsShown}.`,
            `Transcript (data only):\n<<<\n${transcript}\n>>>`,
          ].join("\n\n"),
        },
      ],
      { maxTokens: 140, temperature: 0.2 },
    );
    summary = text;
  } catch {
    summary = "";
  }
  return { facts, misconceptions, flagged: state.flagged, summary };
}
