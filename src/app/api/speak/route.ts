import { z } from "zod";
import { allow, clientKey } from "@/lib/rate-limit";
import { mathsToWords } from "@/lib/speech-text";

export const runtime = "nodejs";
export const maxDuration = 30;

// The tutor's voice. Cartesia Sonic (Jacqueline) first; when Cartesia cannot speak, answer 204 and
// the browser uses the phone's own voice. Text only goes to Cartesia; nothing is stored.
//
// How it decides (per server instance):
//   - out of credits (402/403, or a quota message)  -> phone voice, try Cartesia again in 1 hour
//   - busy, server error or a slow reply            -> phone voice, try again in 1 minute
//   - our own daily character budget used up        -> phone voice until the next UTC day
// While paused it answers at once, with X-Voice-Retry-After so the browser stops asking until then.
// A failed Cartesia request costs no credits, so a retry is free.

const Body = z.object({ text: z.string().min(1).max(1200) });

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

let pausedUntil = 0;
let pausedFor = "";
let day = "";
let charsToday = 0;

function phoneVoice(reason: string, retryAt: number) {
  const seconds = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
  return new Response(null, { status: 204, headers: { "X-Voice": `phone:${reason}`, "X-Voice-Retry-After": String(seconds) } });
}

function pause(reason: string, ms: number) {
  if (pausedFor !== reason) console.log(JSON.stringify({ voice: "paused", reason, minutes: ms / MINUTE }));
  pausedFor = reason;
  pausedUntil = Date.now() + ms;
}

function nextUtcDay(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export async function POST(req: Request) {
  const key = process.env.CARTESIA_API_KEY;
  if (process.env.TUTOR_VOICE !== "cartesia" || !key) return phoneVoice("off", Date.now() + HOUR);
  if (Date.now() < pausedUntil) return phoneVoice(pausedFor, pausedUntil);
  if (!allow(`voice:${clientKey(req)}`, 60)) return phoneVoice("busy", Date.now() + MINUTE);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const text = mathsToWords(parsed.data.text);

  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    charsToday = 0;
  }
  // Spread the plan's monthly characters over the month (Free plan: 20,000 a month, about 650 a day).
  const cap = Number(process.env.TUTOR_VOICE_CHARS_PER_DAY ?? 700);
  if (charsToday + text.length > cap) return phoneVoice("daily-budget", nextUtcDay());

  let res: Response | null = null;
  try {
    res = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: { "X-API-Key": key, "Cartesia-Version": "2025-04-16", "Content-Type": "application/json" },
      body: JSON.stringify({
        model_id: process.env.CARTESIA_MODEL ?? "sonic-3",
        transcript: text,
        voice: { mode: "id", id: process.env.CARTESIA_VOICE_ID ?? "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc" }, // Jacqueline
        output_format: { container: "mp3", sample_rate: 24000, bit_rate: 64000 },
        language: "en",
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    pause("unreachable", MINUTE);
    return phoneVoice("unreachable", pausedUntil);
  }

  if (!res.ok || !res.body) {
    const detail = (await res.text().catch(() => "")).toLowerCase();
    const outOfCredits = res.status === 402 || res.status === 403 || /credit|quota|limit exceeded|insufficient|upgrade/.test(detail);
    if (outOfCredits) pause("out-of-credits", HOUR);
    else pause(`error-${res.status}`, MINUTE);
    return phoneVoice(pausedFor, pausedUntil);
  }

  if (pausedFor) console.log(JSON.stringify({ voice: "resumed", after: pausedFor }));
  pausedFor = "";
  charsToday += text.length;
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice": "cartesia" } });
}
