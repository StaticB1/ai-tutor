// Asks the live site for every fixed talk-mode line (each question's opening and the fillers), so
// the CDN holds them before anyone opens talk mode. A new deployment starts with an empty cache.
//
// TUTOR_WARM_VOICE=1 npm run eval -- tests/live/warm-voice.test.ts   (TUTOR_SITE to warm another host)

import { describe, expect, it } from "vitest";
import { ITEMS } from "@/content/items";
import { opening, STILL_THINKING, THINKING } from "@/lib/talk-lines";

const SITE = process.env.TUTOR_SITE ?? "https://tutor.statotec.com";

describe.runIf(process.env.TUTOR_WARM_VOICE === "1")("warm the talk-mode voice cache", () => {
  it("fetches every fixed line", async () => {
    const keys = [...ITEMS.map((i) => opening(i).key), ...THINKING.map((l) => l.key), ...STILL_THINKING.map((l) => l.key)] as string[];
    const results: string[] = [];
    for (const key of keys) {
      const t = Date.now();
      const res = await fetch(`${SITE}/api/speak?line=${key}`);
      await res.arrayBuffer();
      results.push(`${res.status} ${res.headers.get("x-vercel-cache") ?? "-"} ${res.headers.get("x-voice") ?? "-"} ${Date.now() - t}ms ${key}`);
    }
    console.log(results.join("\n"));
    expect(results.filter((r) => !r.startsWith("200"))).toEqual([]);
  });
});
