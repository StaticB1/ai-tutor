import { z } from "zod";
import { allow, clientKey } from "@/lib/rate-limit";
import { mathsToWords } from "@/lib/speech-text";

export const runtime = "nodejs";
export const maxDuration = 30;

// The tutor's voice. With TUTOR_VOICE=cartesia and a CARTESIA_API_KEY it returns Cartesia Sonic
// audio in the chosen voice; otherwise, or past the daily character cap, it answers 204 and the
// browser falls back to the phone's own voice. Text only goes to Cartesia; nothing is stored.
const Body = z.object({ text: z.string().min(1).max(1200) });

let day = "";
let charsToday = 0;

export async function POST(req: Request) {
  const key = process.env.CARTESIA_API_KEY;
  if (process.env.TUTOR_VOICE !== "cartesia" || !key) return new Response(null, { status: 204 });
  if (!allow(`voice:${clientKey(req)}`, 60)) return new Response(null, { status: 204 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  const text = mathsToWords(parsed.data.text);
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    charsToday = 0;
  }
  const cap = Number(process.env.TUTOR_VOICE_CHARS_PER_DAY ?? 3000);
  if (charsToday + text.length > cap) return new Response(null, { status: 204 });
  charsToday += text.length;

  const res = await fetch("https://api.cartesia.ai/tts/bytes", {
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
  }).catch(() => null);
  if (!res || !res.ok || !res.body) {
    console.error("speak failed", res?.status);
    return new Response(null, { status: 204 });
  }
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
