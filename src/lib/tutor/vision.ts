// Reads a photo of handwritten working into text with Nemotron 3.5 Super VL. The learner sees what
// was read and corrects it before sending, because reading handwriting is where these models slip.
// The photo is used for this one call and never stored or logged.

import type { ModelCall } from "./model";
import { MAX_LEARNER_CHARS } from "./engine";

export type ReadResult = { ok: true; text: string } | { ok: false; reason: "not_schoolwork" | "unreadable" };

export const READ_PROMPT = [
  "This is a photo of a school learner's written work. Transcribe it line by line, exactly as written.",
  "Copy mistakes exactly as they are. Do not correct, complete, solve or comment on anything.",
  "Write maths in plain text, for example: 3(x - 4) = 2x + 5, x^2, sqrt(23.04), 3/4.",
  "If the photo is not written school work, reply with exactly NOT_SCHOOLWORK. If you cannot read it, reply with exactly UNREADABLE.",
  "Reply with the transcription only.",
].join("\n");

export async function readWorking(call: ModelCall, dataUrl: string): Promise<ReadResult> {
  const { text } = await call(
    "vision",
    [
      {
        role: "user",
        content: [
          { type: "text", text: READ_PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    { maxTokens: 400, temperature: 0 },
  );
  const out = text.replace(/^```\w*\n?|```$/g, "").trim();
  if (/^NOT_SCHOOLWORK\b/.test(out)) return { ok: false, reason: "not_schoolwork" };
  if (!out || /^UNREADABLE\b/.test(out)) return { ok: false, reason: "unreadable" };
  return { ok: true, text: out.slice(0, MAX_LEARNER_CHARS) };
}
