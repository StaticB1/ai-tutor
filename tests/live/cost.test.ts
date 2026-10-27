// What does one tutored question cost, and how long does a turn take? Three scripted learners
// work three questions to the end, once with the safety screen on Super VL (the old routing) and
// once on Lightning (chosen in tests/live/routing). Every model call is counted by job.
// Results go to eval-results/cost-<date>.json.
//
// TUTOR_RUN_COST=1 npm run eval -- tests/live/cost.test.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { ITEMS } from "@/content/items";
import { takeTurn } from "@/lib/tutor/engine";
import { callWith, costOf, MODELS, type ModelCall, type Role, type Usage } from "@/lib/tutor/model";
import { newState } from "@/lib/tutor/state";
import type { ChatTurn } from "@/lib/tutor/types";

const SCRIPTS: Record<string, string[]> = {
  "maths-linear-equation": ["I don't know where to start", "3x - 12 = 2x + 5", "3x - 2x = 5 + 12", "x = 17"],
  "science-photosynthesis": ["carbon dioxide + water → glucose + oxygen", "it needs light", "and chlorophyll"],
  "accounts-equation": ["is it assets plus liabilities?", "oh, capital = assets − liabilities", "12000 − 4500 = 7500, so US$7 500"],
};

const ROUTINGS: Record<string, Partial<Record<Role, string>>> = {
  "Super VL screen (screen and marker in parallel)": { tutor: MODELS.ultra, marker: MODELS.superVl, checker: MODELS.superVl, safety: MODELS.superVl },
  "Lightning screen (screen and marker in parallel)": { tutor: MODELS.ultra, marker: MODELS.superVl, checker: MODELS.superVl, safety: MODELS.lightning },
};

type Logged = Usage & { role: Role };

function logging(call: ModelCall, log: Logged[]): ModelCall {
  return async (role, messages, opts) => {
    const out = await call(role, messages, opts);
    log.push({ ...out.usage, role });
    return out;
  };
}

describe.runIf(process.env.TUTOR_RUN_COST === "1")("cost per question", () => {
  it("plays scripted sessions under each routing", async () => {
    const report: Record<string, unknown> = {};
    for (const [name, models] of Object.entries(ROUTINGS)) {
      const log: Logged[] = [];
      const call = logging(callWith(models), log);
      const turnMs: number[] = [];
      let finished = 0;
      for (const [id, lines] of Object.entries(SCRIPTS)) {
        const item = ITEMS.find((i) => i.id === id);
        if (!item) throw new Error(id);
        let state = newState(item.id);
        const history: ChatTurn[] = [];
        for (const line of lines) {
          const t0 = Date.now();
          const r = await takeTurn(call, item, state, history, line);
          turnMs.push(Date.now() - t0);
          history.push({ role: "learner", text: line }, { role: "tutor", text: r.reply });
          state = r.state;
          if (state.done) break;
        }
        if (state.done) finished++;
      }
      const byRole: Record<string, { calls: number; promptTokens: number; cachedTokens: number; usd: number }> = {};
      for (const u of log) {
        const b = (byRole[u.role] ??= { calls: 0, promptTokens: 0, cachedTokens: 0, usd: 0 });
        b.calls++;
        b.promptTokens += u.promptTokens;
        b.cachedTokens += u.cachedTokens;
        b.usd += costOf(u);
      }
      const total = log.reduce((a, u) => a + costOf(u), 0);
      const sorted = [...turnMs].sort((a, b) => a - b);
      report[name] = {
        questions: Object.keys(SCRIPTS).length,
        finished,
        turns: turnMs.length,
        usdPerQuestion: Number((total / Object.keys(SCRIPTS).length).toFixed(5)),
        turnMsMedian: sorted[Math.floor(sorted.length / 2)],
        turnMsMax: sorted[sorted.length - 1],
        byRole,
      };
      console.log(name, JSON.stringify(report[name]));
    }
    mkdirSync("eval-results", { recursive: true });
    writeFileSync(`eval-results/cost-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ when: new Date().toISOString(), report }, null, 2));
  });
});
