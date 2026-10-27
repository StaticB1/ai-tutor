// Every reply is checked before the learner sees it. Code catches the final answer and listed
// give-away words; a second model catches paraphrases of marking points the learner has not shown.

import type { ModelCall } from "./model";
import { parseJson } from "./model";
import { containsAnswer, numbersIn } from "./numeric";
import type { Item, TutorState } from "./types";

export interface LeakCheck {
  leak: boolean;
  why: string[];
}

function norm(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Deterministic part: the final answer, or a give-away word for a point not yet shown that is not already in the question or the learner's own words. */
export function codeLeaks(item: Item, state: TutorState, reply: string, learnerWords: string, permitted = ""): string[] {
  const why: string[] = [];
  const answerMet = item.markingPoints.some((p) => p.answer && state.met.includes(p.id));
  if (item.finalAnswer && !answerMet) {
    // The learner's own words do not excuse the answer: "is it 12 or 17?" must not get a confirmation.
    if (containsAnswer(reply, item.finalAnswer, numbersIn(item.question + " " + permitted))) why.push("final answer");
  }
  const allowed = norm(item.question + " " + learnerWords + " " + permitted);
  const r = norm(reply);
  for (const p of item.markingPoints) {
    if (state.met.includes(p.id)) continue;
    for (const term of p.leak ?? []) {
      const t = norm(term);
      if (r.includes(t) && !allowed.includes(t)) why.push(`term "${term}"`);
    }
  }
  return why;
}

export async function modelLeaks(call: ModelCall, item: Item, state: TutorState, reply: string, permitted = ""): Promise<string[]> {
  const unmet = item.markingPoints.filter((p) => !state.met.includes(p.id));
  if (unmet.length === 0) return [];
  const prompt = [
    "You check a tutor's message before a school learner sees it. The learner must work each point out themselves.",
    `Question: ${item.question}`,
    `Points the learner has not worked out yet:\n${unmet.map((p) => `- "${p.id}": ${p.text}`).join("\n")}`,
    permitted ? `The tutor was allowed to share this, so repeating or rephrasing it is not a leak: "${permitted}"` : "",
    `Tutor's message:\n<<<\n${reply}\n>>>`,
    "For each point: does the tutor's message itself state it, or hand it over as a fill-in-the-blank? Asking a question that points the way is NOT stating it.",
    `Reply with JSON only: {"stated": {${unmet.map((p) => `"${p.id}": true|false`).join(", ")}}}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    const { text } = await call("checker", [{ role: "user", content: prompt }], { json: true, maxTokens: 120, temperature: 0 });
    const j = parseJson(text) as { stated?: Record<string, unknown> } | null;
    return unmet.filter((p) => j?.stated?.[p.id] === true || j?.stated?.[p.id] === "true").map((p) => `point ${p.id}`);
  } catch {
    return [];
  }
}

/** `permitted` is text the move allowed the tutor to share (a pre-written hint or a worked step). */
export async function checkReply(call: ModelCall, item: Item, state: TutorState, reply: string, learnerWords: string, permitted = ""): Promise<LeakCheck> {
  const fromCode = codeLeaks(item, state, reply, learnerWords, permitted);
  if (fromCode.length) return { leak: true, why: fromCode };
  const fromModel = await modelLeaks(call, item, state, reply, permitted);
  return { leak: fromModel.length > 0, why: fromModel };
}
