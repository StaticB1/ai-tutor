import { z } from "zod";
import { getItem } from "@/content/items";
import { callModel } from "@/lib/tutor/model";
import { buildReport } from "@/lib/tutor/report";
import { open } from "@/lib/tutor/state";
import { allow, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  token: z.string().max(4000),
  history: z
    .array(z.object({ role: z.enum(["learner", "tutor"]), text: z.string().max(2000) }))
    .max(80)
    .default([]),
});

export async function POST(req: Request) {
  if (process.env.TUTOR_DISABLED === "1") return Response.json({ error: "The tutor is resting." }, { status: 503 });
  if (!allow(clientKey(req))) return Response.json({ error: "Too many requests" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const state = open(parsed.data.token);
  const item = state ? getItem(state.itemId) : undefined;
  if (!state || !item) return Response.json({ error: "Session not found" }, { status: 400 });
  return Response.json(await buildReport(callModel, item, state, parsed.data.history));
}
