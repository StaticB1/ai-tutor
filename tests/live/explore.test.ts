// "Where you'll see this" for every question: the live Tavily search and the cards Nemotron writes
// from it, printed so a person can judge whether they fit. Results go to eval-results/explore-<date>.json.
//
// TUTOR_RUN_EXPLORE=1 npm run eval -- tests/live/explore.test.ts   (needs TAVILY_API_KEY and TUTOR_API_KEY)

import { mkdirSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { ITEMS } from "@/content/items";
import { exploreQuery, search, writeCards } from "@/lib/tutor/explore";
import { callModel } from "@/lib/tutor/model";

describe.runIf(process.env.TUTOR_RUN_EXPLORE === "1")("real-life cards", () => {
  it("searches and writes cards for every question", async () => {
    const key = process.env.TAVILY_API_KEY as string;
    const only = process.env.TUTOR_ITEMS?.split(",");
    const report: Record<string, unknown> = {};
    for (const item of ITEMS.filter((i) => !only || only.includes(i.id))) {
      const sources = await search(exploreQuery(item), key);
      const cards = await writeCards(callModel, item, sources);
      report[item.id] = { query: exploreQuery(item), sources: sources.map((s) => s.url), cards };
      console.log(`\n${item.id} (${sources.length} results)\n${cards.map((c) => `  [${c.site}] ${c.title}: ${c.text}`).join("\n") || "  (no cards)"}`);
    }
    mkdirSync("eval-results", { recursive: true });
    writeFileSync(`eval-results/explore-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ when: new Date().toISOString(), report }, null, 2));
  });
});
