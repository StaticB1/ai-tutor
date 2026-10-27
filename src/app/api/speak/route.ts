import { z } from "zod";
import { allow, clientKey } from "@/lib/rate-limit";
import { mathsToWords } from "@/lib/speech-text";

export const runtime = "nodejs";
export const maxDuration = 60;

// The tutor's voice. TUTOR_VOICE lists the natural voices to try, in order, e.g.
// "cartesia,cartesia-2,murf": Cartesia Sonic Jacqueline on two accounts, then Murf Julia. Each voice
// that cannot speak is skipped and the next one tried in the same request; when none can, answer 204
// and the browser uses the phone's own voice. Text only goes to the provider; nothing is stored.
//
// How each voice is skipped (per server instance):
//   - out of credits (402/403, or a quota message)  -> skip it for 1 hour
//   - busy, server error or a slow reply            -> skip it for 1 minute
//   - our own daily character budget used up        -> skip it until the next UTC day
// When every voice is skipped it answers at once, with X-Voice-Retry-After (the soonest any voice
// is back) so the browser stops asking until then. A failed request costs no credits, so a retry is free.

const Body = z.object({ text: z.string().min(1).max(1200) });

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function phoneVoice(reasons: string[], retryAt: number) {
  const seconds = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
  return new Response(null, { status: 204, headers: { "X-Voice": `phone:${reasons.join(",")}`, "X-Voice-Retry-After": String(seconds) } });
}

function nextUtcDay(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

function cartesia(text: string, key: string): Promise<Response> {
  return fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: { "X-API-Key": key, "Cartesia-Version": "2025-04-16", "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: process.env.CARTESIA_MODEL ?? "sonic-3",
      transcript: text,
      voice: { mode: "id", id: process.env.CARTESIA_VOICE_ID ?? "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc" }, // Jacqueline
      output_format: { container: "mp3", sample_rate: 24000, bit_rate: 64000 },
      language: "en",
    }),
    signal: AbortSignal.timeout(10_000),
  });
}

// Murf has no streaming for its GEN2 voices, so it returns the whole clip at once (about 2 s for a
// short reply), base64-encoded to save a second download.
async function murf(text: string, key: string): Promise<Response> {
  const res = await fetch("https://api.murf.ai/v1/speech/generate", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      voiceId: process.env.MURF_VOICE_ID ?? "en-US-julia",
      style: process.env.MURF_STYLE ?? "Narration",
      modelVersion: "GEN2",
      text,
      format: "MP3",
      sampleRate: 24000,
      channelType: "MONO",
      encodeAsBase64: true,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return res;
  const data = (await res.json().catch(() => null)) as { encodedAudio?: string } | null;
  if (!data?.encodedAudio) return new Response("no audio", { status: 502 });
  return new Response(Buffer.from(data.encodedAudio, "base64"));
}

type Speak = (text: string, key: string) => Promise<Response>;

/** Each voice name, the env var holding its key, and how it speaks. */
const VOICES: Record<string, { key: string; speak: Speak }> = {
  cartesia: { key: "CARTESIA_API_KEY", speak: cartesia },
  "cartesia-2": { key: "CARTESIA_API_KEY_2", speak: cartesia },
  murf: { key: "MURF_API_KEY", speak: murf },
};

interface VoiceState {
  pausedUntil: number;
  pausedFor: string;
  day: string;
  charsToday: number;
}
const states = new Map<string, VoiceState>();

function stateOf(name: string): VoiceState {
  let s = states.get(name);
  if (!s) states.set(name, (s = { pausedUntil: 0, pausedFor: "", day: "", charsToday: 0 }));
  const today = new Date().toISOString().slice(0, 10);
  if (today !== s.day) {
    s.day = today;
    s.charsToday = 0;
  }
  return s;
}

function pause(name: string, s: VoiceState, reason: string, ms: number) {
  if (s.pausedFor !== reason) console.log(JSON.stringify({ voice: name, paused: reason, minutes: ms / MINUTE }));
  s.pausedFor = reason;
  s.pausedUntil = Date.now() + ms;
}

export async function POST(req: Request) {
  const voices = (process.env.TUTOR_VOICE ?? "")
    .split(",")
    .map((n) => n.trim())
    .flatMap((name) => {
      const v = VOICES[name];
      const key = v && process.env[v.key];
      return v && key ? [{ name, key, speak: v.speak }] : [];
    });
  if (voices.length === 0) return phoneVoice(["off"], Date.now() + HOUR);
  if (voices.every((v) => Date.now() < stateOf(v.name).pausedUntil)) {
    return phoneVoice(voices.map((v) => stateOf(v.name).pausedFor), Math.min(...voices.map((v) => stateOf(v.name).pausedUntil)));
  }
  if (!allow(`voice:${clientKey(req)}`, 60)) return phoneVoice(["busy"], Date.now() + MINUTE);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const text = mathsToWords(parsed.data.text);
  // Spread each account's characters over time (Cartesia Free plan: 20,000 a month).
  const cap = Number(process.env.TUTOR_VOICE_CHARS_PER_DAY ?? 700);

  const reasons: string[] = [];
  let retryAt = Infinity;
  for (const v of voices) {
    const s = stateOf(v.name);
    if (Date.now() < s.pausedUntil) {
      reasons.push(s.pausedFor);
      retryAt = Math.min(retryAt, s.pausedUntil);
      continue;
    }
    if (s.charsToday + text.length > cap) {
      reasons.push("daily-budget");
      retryAt = Math.min(retryAt, nextUtcDay());
      continue;
    }

    let res: Response;
    try {
      res = await v.speak(text, v.key);
    } catch {
      pause(v.name, s, "unreachable", MINUTE);
      reasons.push(s.pausedFor);
      retryAt = Math.min(retryAt, s.pausedUntil);
      continue;
    }
    if (!res.ok || !res.body) {
      const detail = (await res.text().catch(() => "")).toLowerCase();
      const outOfCredits = res.status === 402 || res.status === 403 || /credit|quota|limit exceeded|insufficient|upgrade/.test(detail);
      if (outOfCredits) pause(v.name, s, "out-of-credits", HOUR);
      else pause(v.name, s, `error-${res.status}`, MINUTE);
      reasons.push(s.pausedFor);
      retryAt = Math.min(retryAt, s.pausedUntil);
      continue;
    }

    if (s.pausedFor) console.log(JSON.stringify({ voice: v.name, resumed: s.pausedFor }));
    s.pausedFor = "";
    s.charsToday += text.length;
    return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice": v.name } });
  }
  return phoneVoice(reasons, retryAt);
}
