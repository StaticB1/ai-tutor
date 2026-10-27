import { describe, expect, it } from "vitest";
import { ITEMS } from "@/content/items";
import { search, site, writeCards, type Source } from "@/lib/tutor/explore";
import type { ModelCall } from "@/lib/tutor/model";

const item = ITEMS[0];
const sources: Source[] = [
  { title: "Using equations in everyday life", url: "https://www.bbc.co.uk/bitesize/a", content: "Engineers use equations to balance loads." },
  { title: "Algebra at work", url: "https://www.khanacademy.org/b", content: "Shopkeepers solve for unknown prices." },
];

function reply(text: string): ModelCall {
  return async () => ({ text, usage: { model: "fake", promptTokens: 0, cachedTokens: 0, completionTokens: 0, ms: 0 } });
}

describe("explore cards", () => {
  it("keeps only cards that link to a search result", async () => {
    const cards = await writeCards(
      reply(
        JSON.stringify({
          cards: [
            { title: "Balancing bridges", text: "Engineers use equations to balance loads.", url: "https://www.bbc.co.uk/bitesize/a" },
            { title: "Made up", text: "Not from any result.", url: "https://example.com/invented" },
            { title: "Shop prices", text: "Shopkeepers solve for unknown prices.", url: "https://www.khanacademy.org/b" },
          ],
        }),
      ),
      item,
      sources,
    );
    expect(cards.map((c) => c.site)).toEqual(["bbc.co.uk", "khanacademy.org"]);
  });

  it("returns nothing for an unreadable reply or no sources", async () => {
    expect(await writeCards(reply("not json"), item, sources)).toEqual([]);
    expect(await writeCards(reply('{"cards":[]}'), item, [])).toEqual([]);
  });

  it("asks Tavily for trusted sites only", async () => {
    let body: { include_domains?: string[] } = {};
    const fetcher = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ results: [{ title: "T", url: "https://www.britannica.com/x", content: "c" }, { url: "https://no-title.org" }] }));
    }) as typeof fetch;
    const found = await search("q", "key", fetcher);
    expect(body.include_domains).toContain("bbc.co.uk");
    expect(found).toHaveLength(1);
    expect(site(found[0].url)).toBe("britannica.com");
  });
});
