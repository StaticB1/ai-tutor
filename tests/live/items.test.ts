// Every question can be finished by a learner who works it out, and a common wrong answer is not
// accepted. Run after adding or changing questions. Replies go to eval-results/items-<date>.json.
//
// TUTOR_RUN_ITEMS=1 npm run eval -- tests/live/items.test.ts   (TUTOR_ITEMS=id,id to run only some)

import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getItem } from "@/content/items";
import { takeTurn } from "@/lib/tutor/engine";
import { namesPoint } from "@/lib/tutor/guard";
import { callModel } from "@/lib/tutor/model";
import { newState } from "@/lib/tutor/state";
import type { ChatTurn, Item, TutorState } from "@/lib/tutor/types";

const SCRIPTS: Record<string, { right: string[]; wrong: string }> = {
  "maths-ratio-sharing": { right: ["There are 5 parts, so one part is 60 ÷ 5 = 12", "Rudo gets 3 × 12 = 36 dollars"], wrong: "Rudo gets 24 dollars" },
  "maths-circumference": { right: ["C = 2πr", "2 × 22/7 × 14 = 88 cm"], wrong: "616 cm" },
  "maths-probability-beads": { right: ["There are 8 beads altogether", "3/8"], wrong: "3/5" },
  "maths-simple-interest": { right: ["5% of 800 is 40 dollars a year", "40 × 3 = 120 dollars"], wrong: "She will have 920 dollars" },
  "science-heat-conduction": { right: ["It is conduction", "The particles at the hot end vibrate more and pass the energy along the spoon to the handle"], wrong: "It is convection" },
  "physics-work-done": { right: ["Work done = force × distance", "50 × 4 = 200 J"], wrong: "50 ÷ 4 = 12.5" },
  "geography-kariba-dam": { right: ["The dam makes hydro-electric power for homes and factories", "People catch kapenta in the lake and sell it"], wrong: "It gives Harare its drinking water" },
  "history-first-chimurenga": { right: ["The settlers took their best land", "The settlers also seized their cattle"], wrong: "They wanted one person, one vote" },
  "english-past-tense": { right: ["Chipo walked to school and bought a mango."], wrong: "Chipo walked to school and buyed a mango." },
  "accounts-profit-percentage": { right: ["Profit is 320 - 250 = 70 dollars", "70 ÷ 250 × 100 = 28%"], wrong: "70 ÷ 320 × 100 = 21.9%" },
  "computing-binary-denary": { right: ["The place values are 8, 4, 2, 1 so 8 + 4 + 1", "13"], wrong: "11" },
};

async function play(item: Item, lines: string[]) {
  let state: TutorState = newState(item.id);
  const history: ChatTurn[] = [];
  const turns: Array<{ learner: string; tutor: string; move: string; met: string[]; blocked: string[]; fallback: boolean }> = [];
  for (const line of lines) {
    const r = await takeTurn(callModel, item, state, history, line);
    turns.push({ learner: line, tutor: r.reply, move: r.trace.move, met: r.state.met, blocked: r.trace.leakBlocked, fallback: r.trace.usedFallback });
    history.push({ role: "learner", text: line }, { role: "tutor", text: r.reply });
    state = r.state;
  }
  return { state, turns };
}

describe.runIf(process.env.TUTOR_RUN_ITEMS === "1")("every question", () => {
  it("finishes when worked out, and does not accept a common mistake", async () => {
    const report: Record<string, unknown> = {};
    const problems: string[] = [];
    const only = process.env.TUTOR_ITEMS?.split(",");
    for (const [id, script] of Object.entries(SCRIPTS)) {
      if (only && !only.includes(id)) continue;
      const item = getItem(id) as Item;
      const right = await play(item, script.right);
      const wrong = await play(item, [script.wrong]);
      report[id] = { right: right.turns, wrong: wrong.turns };
      if (!right.state.done) problems.push(`${id}: not finished by the right working (met ${right.state.met.join(",") || "-"})`);
      if (wrong.state.done) problems.push(`${id}: finished by the wrong answer`);
      for (const t of [...right.turns, ...wrong.turns]) if (namesPoint(item, t.tutor).length) problems.push(`${id}: reply names a marking point: ${t.tutor}`);
      console.log(`${id}: right done=${right.state.done} met=${right.state.met.join(",")} | wrong done=${wrong.state.done} met=${wrong.state.met.join(",") || "-"}`);
    }
    mkdirSync("eval-results", { recursive: true });
    writeFileSync(`eval-results/items-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ when: new Date().toISOString(), problems, report }, null, 2));
    expect(problems).toEqual([]);
  });
});
