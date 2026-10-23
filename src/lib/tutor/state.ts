// Session state travels with the browser but is signed, so a learner cannot mark points as met
// or unlock the worked solution by editing it. No database is needed for a session.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { TutorState } from "./types";

function secret(): string {
  const s = process.env.TUTOR_STATE_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("TUTOR_STATE_SECRET must be set (32+ chars)");
  return "dev-only-secret-not-for-production-use";
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function newState(itemId: string): TutorState {
  return {
    v: 1,
    itemId,
    met: [],
    hintLevel: 0,
    stepsShown: 0,
    unproductive: 0,
    turns: 0,
    done: false,
    flagged: false,
    misconceptions: [],
    answerRequests: 0,
    leaksBlocked: 0,
    revealed: false,
  };
}

export function seal(state: TutorState): string {
  const body = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function open(token: string): TutorState | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TutorState;
    return s.v === 1 ? s : null;
  } catch {
    return null;
  }
}
