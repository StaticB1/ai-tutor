import { z } from "zod";
import { getItem } from "@/content/items";
import { allow, clientKey } from "@/lib/rate-limit";
import { mathsToWords } from "@/lib/speech-text";
import { opening, STILL_THINKING, THINKING } from "@/lib/talk-lines";

export const runtime = "nodejs";
export const maxDuration = 60;

// The tutor's voice. TUTOR_VOICE lists the natural voices to try, in order, e.g.
// "elevenlabs,murf": ElevenLabs Flash (Lily), then Murf Julia ("cartesia" and "cartesia-2" also work). Each voice
// that cannot speak is skipped and the next one tried in the same request; when none can, answer 204
// and the browser uses the phone's own voice. Text only goes to the provider; nothing is stored.
//
// How each voice is skipped (per server instance):
//   - out of credits (402/403, or a quota message)  -> skip it for 1 hour
//   - busy, server error or a slow reply            -> skip it for 1 minute
//   - TUTOR_VOICE_CHARS_PER_DAY used up (if set)     -> skip it until the next UTC day
// When every voice is skipped it answers at once, with X-Voice-Retry-After (the soonest any voice
// is back) so the browser stops asking until then. A failed request costs no credits, so a retry is free.
//
// Fixed lines (each question's opening, the "let me think" fillers) are asked for by name with GET
// and may be cached by the CDN (30 days) and the browser (a day), so they play at once and cost no credits
// after the first time.

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

// ElevenLabs Flash streams the clip as it is made. The Starter plan's licence covers commercial use.
function elevenlabs(text: string, key: string): Promise<Response> {
  const voice = process.env.ELEVENLABS_VOICE_ID ?? "pFZP5JQG7iQjIQuC4Bku"; // Lily
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5" }),
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
  elevenlabs: { key: "ELEVENLABS_API_KEY", speak: elevenlabs },
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

const DAY_SECONDS = 24 * 60 * 60;
const kept = new Map<string, { audio: ArrayBuffer; voice: string }>();

function fixedLine(key: string): string | undefined {
  const filler = [...THINKING, ...STILL_THINKING].find((l) => l.key === key);
  if (filler) return filler.text;
  const item = key.startsWith("open-") ? getItem(key.slice(5)) : undefined;
  return item ? opening(item).text : undefined;
}

function keptAudio(made: { audio: ArrayBuffer; voice: string }) {
  return new Response(made.audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": `public, max-age=${DAY_SECONDS}`,
      // The CDN keeps them for 30 days (a deploy empties it anyway); browsers for a day, so a change of voice reaches them soon.
      "Vercel-CDN-Cache-Control": `max-age=${30 * DAY_SECONDS}`,
      "X-Voice": made.voice,
    },
  });
}

/** A fixed line by name: made once, then served from memory, the CDN or the browser's cache. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("line") ?? "";
  const text = fixedLine(key);
  if (!text) return new Response(null, { status: 404 });
  const hit = kept.get(key);
  if (hit) return keptAudio(hit);
  const res = await say(req, text);
  if (res.status !== 200) return res;
  const made = { audio: await res.arrayBuffer(), voice: res.headers.get("X-Voice") ?? "" };
  kept.set(key, made);
  return keptAudio(made);
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  return say(req, parsed.data.text);
}

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

async function say(req: Request, said: string): Promise<Response> {
  const voices = (process.env.TUTOR_VOICE ?? "")
    .split(",")
    .map((n) => n.trim())
    .flatMap((name) => {
      const v = VOICES[name];
      const key = v && process.env[v.key];
      return v && key ? [{ name, key, speak: v.speak }] : [];
    });
  if (voices.length === 0) return phoneVoice(["off"], Date.now() + HOUR);
  if (!allow(`voice:${clientKey(req)}`, 60)) return phoneVoice(["busy"], Date.now() + MINUTE);
  if (voices.every((v) => Date.now() < stateOf(v.name).pausedUntil)) {
    return phoneVoice(voices.map((v) => stateOf(v.name).pausedFor), Math.min(...voices.map((v) => stateOf(v.name).pausedUntil)));
  }
  const text = mathsToWords(said);
  // Optional: spread each account's characters over time. Unset means no cap; a voice is used until
  // its provider says it is out of credits.
  const cap = Number(process.env.TUTOR_VOICE_CHARS_PER_DAY || Infinity);

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
