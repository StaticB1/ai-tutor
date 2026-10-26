import { z } from "zod";
import { getItem } from "@/content/items";
import { canReveal, helpLeft, MAX_LEARNER_CHARS, needed, revealTurn, takeTurn } from "@/lib/tutor/engine";
import { callModel } from "@/lib/tutor/model";
import { newState, open, seal } from "@/lib/tutor/state";
import { allow, allowToday, clientKey } from "@/lib/rate-limit";
import { renderMaths } from "@/lib/render-maths";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  itemId: z.string().max(80),
  token: z.string().max(4000).nullable().optional(),
  /** "reveal" is the Show-me-the-answer button; the server checks it is allowed */
  action: z.enum(["message", "reveal"]).default("message"),
  message: z.string().max(MAX_LEARNER_CHARS).default(""),
  history: z
    .array(z.object({ role: z.enum(["learner", "tutor"]), text: z.string().max(2000) }))
    .max(80)
    .default([]),
});

export async function POST(req: Request) {
  if (process.env.TUTOR_DISABLED === "1") return Response.json({ error: "The tutor is resting. Please try again later." }, { status: 503 });
  if (!allow(clientKey(req))) return Response.json({ error: "That's a lot of messages. Take a short break and try again in a few minutes." }, { status: 429 });
  if (!allowToday()) return Response.json({ error: "The tutor has had a very busy day. Please come back tomorrow." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { itemId, token, message, history, action } = parsed.data;
  if (action === "message" && !message.trim()) return Response.json({ error: "Bad request" }, { status: 400 });

  const item = getItem(itemId);
  if (!item) return Response.json({ error: "No such question" }, { status: 404 });
  const state = token ? open(token) : newState(item.id);
  if (!state || state.itemId !== item.id) return Response.json({ error: "This session has expired. Please start the question again." }, { status: 400 });

  try {
    const r = action === "reveal" ? revealTurn(item, state) : await takeTurn(callModel, item, state, history, message);
    if (!r) return Response.json({ error: "Try the hints first. The answer opens once you've used them all." }, { status: 409 });
    // One line per turn for operators. No learner text, so nothing personal is logged.
    console.log(
      JSON.stringify({
        turn: item.id,
        move: r.trace.move,
        met: r.state.met.length,
        fallback: r.trace.usedFallback,
        blocked: r.trace.leakBlocked,
        ms: r.trace.usage.reduce((a, u) => a + u.ms, 0),
        errors: r.trace.errors,
      }),
    );
    return Response.json({
      reply: r.reply,
      replyHtml: renderMaths(r.reply),
      token: seal(r.state),
      progress: { met: Math.min(r.state.met.length, needed(item)), needed: needed(item) },
      hints: { used: Math.min(r.state.hintLevel, item.hints.length), total: item.hints.length },
      helpLeft: helpLeft(item, r.state),
      canReveal: canReveal(item, r.state),
      revealed: Boolean(r.state.revealed),
      done: r.state.done,
      solutionHtml: r.solution ? r.solution.map((s) => renderMaths(s)) : null,
      move: r.trace.move,
    });
  } catch (e) {
    console.error("turn failed", e);
    return Response.json({ error: "The tutor couldn't answer just now. Please send that again." }, { status: 502 });
  }
}
