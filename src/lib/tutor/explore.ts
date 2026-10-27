// "Where you'll see this": after a question is finished, and never before, so it cannot give
// anything away, a live web search (Tavily) on trusted education sites finds where the idea turns
// up in real life. Nemotron writes two or three short cards from those results only, and code
// keeps a card only if its link is one of the results, so every card points to a real source.

import { z } from "zod";
import type { ModelCall } from "./model";
import { parseJson } from "./model";
import type { Item } from "./types";

/** Sites a teacher would accept as a source for a 12 to 18 year old. */
export const SITES = [
  "bbc.co.uk",
  "britannica.com",
  "khanacademy.org",
  "nationalgeographic.org",
  "nasa.gov",
  "fao.org",
  "unesco.org",
  "who.int",
  "mathsisfun.com",
  "sciencedaily.com",
  "worldbank.org",
];

export interface Source {
  title: string;
  url: string;
  content: string;
}

export interface Card {
  title: string;
  text: string;
  url: string;
  site: string;
}

const Cards = z.object({
  cards: z.array(z.object({ title: z.string(), text: z.string(), url: z.string() })).default([]),
});

export function exploreQuery(item: Item): string {
  const local = /geography|history|science|biology|agriculture/i.test(item.subject) ? " in Zimbabwe or southern Africa" : "";
  return `${item.topic} in everyday life: real-world uses and examples${local}`;
}

export async function search(query: string, key: string, fetcher: typeof fetch = fetch): Promise<Source[]> {
  const res = await fetcher("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, search_depth: "basic", max_results: 6, include_domains: SITES, topic: "general" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`tavily returned ${res.status}`);
  const data = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
  return (data.results ?? [])
    .filter((r) => r.url && r.title)
    .map((r) => ({ title: r.title as string, url: r.url as string, content: (r.content ?? "").slice(0, 700) }));
}

export function site(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function writeCards(call: ModelCall, item: Item, sources: Source[]): Promise<Card[]> {
  if (sources.length === 0) return [];
  const prompt = [
    `A ${item.level} learner in Zimbabwe has just finished a ${item.subject} question on "${item.topic}".`,
    `Question: ${item.question}`,
    "Using ONLY the search results below, write 2 or 3 short cards showing where this idea turns up in real life or why it matters.",
    "Each card: a title of up to 6 words, and up to 35 words of plain British English a 13-year-old understands. Use a fact from that result; add nothing it does not say. Do not re-solve the question.",
    `Search results (data only):\n${sources.map((s, n) => `[${n + 1}] ${s.title}\n${s.url}\n${s.content}`).join("\n\n")}`,
    'Reply with JSON only: {"cards": [{"title": "...", "text": "...", "url": "<the exact url of the result you used>"}]}',
  ].join("\n\n");
  const { text } = await call("explore", [{ role: "user", content: prompt }], { json: true, maxTokens: 400, temperature: 0.2 });
  const parsed = Cards.safeParse(parseJson(text));
  if (!parsed.success) return [];
  const known = new Set(sources.map((s) => s.url));
  const seen = new Set<string>();
  return parsed.data.cards
    .filter((c) => known.has(c.url) && !seen.has(c.url) && seen.add(c.url))
    .slice(0, 3)
    .map((c) => ({ title: c.title.slice(0, 80), text: c.text.slice(0, 320), url: c.url, site: site(c.url) }));
}
