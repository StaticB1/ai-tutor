import { z } from "zod";
import { getItem } from "@/content/items";
import { needed } from "@/lib/tutor/engine";
import { exploreQuery, search, writeCards, type Card } from "@/lib/tutor/explore";
import { callModel } from "@/lib/tutor/model";
import { open } from "@/lib/tutor/state";
import { allow, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 45;

// Real-world cards for a finished question. Only a signed session that has finished the question
// gets them, so a search can never hint at the answer. Cards are cached per question for a day
// (per server instance): they do not depend on the learner, and it keeps search credits for new questions.

const Body = z.object({ token: z.string().max(4000) });
const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<string, { cards: Card[]; at: number }>();

export async function POST(req: Request) {
  const key = process.env.TAVILY_API_KEY;
  if (!key || process.env.TUTOR_DISABLED === "1") return new Response(null, { status: 204 });
  if (!allow(`explore:${clientKey(req)}`, 20)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const state = open(parsed.data.token);
  const item = state ? getItem(state.itemId) : undefined;
  if (!state || !item) return Response.json({ error: "Session not found" }, { status: 400 });
  if (!state.revealed && state.met.length < needed(item)) return Response.json({ error: "Finish the question first" }, { status: 403 });

  const hit = cache.get(item.id);
  if (hit && Date.now() - hit.at < DAY) return Response.json({ cards: hit.cards, cached: true });
  try {
    const sources = await search(exploreQuery(item), key);
    const cards = await writeCards(callModel, item, sources);
    if (cards.length) cache.set(item.id, { cards, at: Date.now() });
    console.log(JSON.stringify({ explore: item.id, sources: sources.length, cards: cards.length }));
    return Response.json({ cards, cached: false });
  } catch (e) {
    console.log(JSON.stringify({ explore: item.id, error: e instanceof Error ? e.message.slice(0, 120) : "unknown" }));
    return new Response(null, { status: 204 });
  }
}
