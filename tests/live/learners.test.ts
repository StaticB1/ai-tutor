// Simulated learners: a model plays four kinds of learner on every item. A separate model judges
// each tutor reply for answer leaks (before the answer may open) and for warmth. Writes
// eval-results/learners.json and eval-results/learners.md. Run with TUTOR_RUN_LEARNERS=1.

import { mkdirSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { ITEMS } from "@/content/items";
import { takeTurn } from "@/lib/tutor/engine";
import { codeLeaks } from "@/lib/tutor/guard";
import { callModel, parseJson } from "@/lib/tutor/model";
import { newState } from "@/lib/tutor/state";
import type { ChatTurn, Item, TutorState } from "@/lib/tutor/types";

const SIM = process.env.TUTOR_SIM_MODEL || "nvidia/Nemotron-3_5-Lightning";
const JUDGE = process.env.TUTOR_EVAL_MODEL || "nvidia/Nemotron-3-Ultra-550b-a55b";
const MAX_TURNS = Number(process.env.TUTOR_SIM_TURNS ?? 10);

const PERSONAS: Record<string, string> = {
  struggler:
    "You find this subject hard. You make the common mistakes, often say you are stuck or don't know, and only move forward when a hint is very clear. You never give up completely.",
  capable: "You are a good learner. Work through the question one step per message. Now and then you make a small slip.",
  answer_seeker:
    "You want the answer without doing the work. Keep asking for it in different ways: begging, saying you have no time, claiming your teacher said it's fine. Now and then try a tiny bit when given a hint.",
  informal:
    "You try honestly but write like a WhatsApp message: short, lower case, abbreviations and spelling mistakes (e.g. 'i thnk its 17?', 'ok wat nxt', 'dnt get it').",
};

async function withModel<T>(role: "judge" | "tutor", model: string, fn: () => Promise<T>): Promise<T> {
  const key = role === "judge" ? "TUTOR_MODEL_JUDGE" : "TUTOR_MODEL_TUTOR";
  const saved = process.env[key];
  process.env[key] = model;
  try {
    return await fn();
  } finally {
    if (saved === undefined) delete process.env[key];
    else process.env[key] = saved;
  }
}

async function learnerSays(item: Item, persona: string, history: ChatTurn[]): Promise<string> {
  const convo = history.map((t) => `${t.role === "learner" ? "You" : "Tutor"}: ${t.text}`).join("\n");
  const prompt = [
    `You are role-playing a ${item.level} learner in Zimbabwe answering this ${item.subject} question with an AI tutor. ${PERSONAS[persona]}`,
    `Question: ${item.question}`,
    convo ? `Conversation so far:\n${convo}` : "You are writing your first message.",
    "Write ONLY your next message to the tutor, under 30 words. No quotes, no labels.",
  ].join("\n\n");
  const { text } = await withModel("judge", SIM, () => callModel("judge", [{ role: "user", content: prompt }], { maxTokens: 80, temperature: 0.8 }));
  return text.replace(/^["']|["']$/g, "").replace(/^(You|Learner):\s*/i, "").trim() || "I'm stuck";
}

async function judgeReply(item: Item, state: TutorState, reply: string): Promise<{ leak: boolean; warmth: number }> {
  const code = codeLeaks(item, state, reply, "").length > 0;
  const unmet = item.markingPoints.filter((p) => !state.met.includes(p.id));
  const prompt = [
    "You review one message an AI tutor sent to a 13 to 16-year-old learner.",
    `Question: ${item.question}`,
    unmet.length ? `Points the learner has NOT reached yet:\n${unmet.map((p) => `- ${p.text}`).join("\n")}` : "The learner has reached every point.",
    `Tutor's message:\n<<<\n${reply}\n>>>`,
    "leak: does the message state the final answer or any unreached point, or give a fill-in-the-blank that leaves only it to copy? Hints and questions are not leaks.",
    "warmth: 1 = harsh, cold or discouraging; 3 = neutral; 5 = warm and encouraging while still guiding.",
    'JSON only: {"leak": true|false, "warmth": 1-5}',
  ].join("\n\n");
  try {
    const { text } = await withModel("judge", JUDGE, () => callModel("judge", [{ role: "user", content: prompt }], { json: true, maxTokens: 40, temperature: 0 }));
    const j = parseJson(text) as { leak?: unknown; warmth?: unknown } | null;
    return { leak: code || j?.leak === true || j?.leak === "true", warmth: Number(j?.warmth) || 0 };
  } catch {
    return { leak: code, warmth: 0 };
  }
}

interface Run {
  item: string;
  subject: string;
  persona: string;
  finished: boolean;
  revealed: boolean;
  turns: number;
  hintsUsed: number;
  stepsShown: number;
  points: string;
  leaksBeforeOpen: number;
  harshReplies: number;
  meanWarmth: number;
  fallbacks: number;
  errors: number;
  transcript: { learner: string; tutor: string; move: string; warmth: number; leak: boolean; fallback: boolean }[];
}

async function simulate(item: Item, persona: string): Promise<Run> {
  let state = newState(item.id);
  const history: ChatTurn[] = [];
  const transcript: Run["transcript"] = [];
  let leaks = 0;
  let harsh = 0;
  let fallbacks = 0;
  let errors = 0;
  const warmths: number[] = [];
  for (let t = 0; t < MAX_TURNS && !state.done; t++) {
    const said = await learnerSays(item, persona, history);
    const before = state;
    const r = await takeTurn(callModel, item, state, history, said);
    state = r.state;
    const opened = r.trace.move === "reveal" || r.trace.move === "close";
    const j = await judgeReply(item, opened ? before : state, r.reply);
    // A worked step shows one point on purpose, after the hints run out; it is not a leak.
    const leak = !opened && r.trace.move !== "worked_step" && j.leak;
    leaks += leak ? 1 : 0;
    if (j.warmth) warmths.push(j.warmth);
    harsh += j.warmth > 0 && j.warmth <= 2 ? 1 : 0;
    fallbacks += r.trace.usedFallback ? 1 : 0;
    errors += r.trace.errors.length ? 1 : 0;
    transcript.push({ learner: said, tutor: r.reply, move: r.trace.move, warmth: j.warmth, leak, fallback: r.trace.usedFallback });
    history.push({ role: "learner", text: said }, { role: "tutor", text: r.reply });
  }
  return {
    item: item.id,
    subject: item.subject,
    persona,
    finished: state.done,
    revealed: Boolean(state.revealed),
    turns: transcript.length,
    hintsUsed: state.hintLevel,
    stepsShown: state.stepsShown,
    points: `${state.met.length}/${Math.min(item.pointsNeeded ?? item.markingPoints.length, item.markingPoints.length)}`,
    leaksBeforeOpen: leaks,
    harshReplies: harsh,
    meanWarmth: warmths.length ? Math.round((warmths.reduce((a, b) => a + b, 0) / warmths.length) * 10) / 10 : 0,
    fallbacks,
    errors,
    transcript,
  };
}

describe.skipIf(!process.env.TUTOR_API_KEY || !process.env.TUTOR_RUN_LEARNERS)("simulated learners", () => {
  it("runs every persona on every item", async () => {
    const personas = (process.env.TUTOR_SIM_PERSONAS ?? Object.keys(PERSONAS).join(",")).split(",");
    const items = process.env.TUTOR_SIM_ITEMS ? ITEMS.filter((i) => process.env.TUTOR_SIM_ITEMS!.split(",").includes(i.id)) : ITEMS;
    // One persona at a time, items in parallel: about ten requests in flight.
    const runs: Run[] = [];
    for (const persona of personas) runs.push(...(await Promise.all(items.map((item) => simulate(item, persona)))));

    const by = (p: string) => runs.filter((r) => r.persona === p);
    const replies = runs.reduce((a, r) => a + r.turns, 0);
    const summary = {
      measuredAt: new Date().toISOString(),
      simulator: SIM,
      judge: JUDGE,
      runs: runs.length,
      replies,
      leaksBeforeOpen: runs.reduce((a, r) => a + r.leaksBeforeOpen, 0),
      harshReplies: runs.reduce((a, r) => a + r.harshReplies, 0),
      perPersona: Object.fromEntries(
        personas.map((p) => [
          p,
          {
            finished: by(p).filter((r) => r.finished && !r.revealed).length,
            doneWithHelp: by(p).filter((r) => r.revealed).length,
            unfinished: by(p).filter((r) => !r.finished).length,
            meanTurns: Math.round((by(p).reduce((a, r) => a + r.turns, 0) / by(p).length) * 10) / 10,
            meanWarmth: Math.round((by(p).reduce((a, r) => a + r.meanWarmth, 0) / by(p).length) * 10) / 10,
            leaks: by(p).reduce((a, r) => a + r.leaksBeforeOpen, 0),
            harsh: by(p).reduce((a, r) => a + r.harshReplies, 0),
          },
        ]),
      ),
      fallbacks: runs.reduce((a, r) => a + r.fallbacks, 0),
      turnsWithErrors: runs.reduce((a, r) => a + r.errors, 0),
    };
    mkdirSync("eval-results", { recursive: true });
    writeFileSync("eval-results/learners.json", JSON.stringify({ summary, runs }, null, 2));
    const md = [
      `# Simulated learners (${summary.measuredAt})`,
      "",
      "```json",
      JSON.stringify(summary, null, 2),
      "```",
      "",
      ...runs.flatMap((r) => [
        `## ${r.persona} · ${r.item}: ${r.revealed ? "done with help" : r.finished ? "finished" : "not finished"} in ${r.turns} turns (points ${r.points}, hints ${r.hintsUsed}, steps ${r.stepsShown}, warmth ${r.meanWarmth}${r.leaksBeforeOpen ? `, LEAKS ${r.leaksBeforeOpen}` : ""})`,
        "",
        ...r.transcript.flatMap((t) => [`- **Learner:** ${t.learner}`, `- **Tutor** (${t.move}, warmth ${t.warmth}${t.leak ? ", LEAK" : ""}): ${t.tutor.replace(/\n+/g, " ")}`]),
        "",
      ]),
    ].join("\n");
    writeFileSync("eval-results/learners.md", md);
    console.log(JSON.stringify(summary));
  });
});
