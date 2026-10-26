import { z } from "zod";
import { callModel } from "@/lib/tutor/model";
import { readWorking } from "@/lib/tutor/vision";
import { allow, allowToday, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// The browser shrinks photos before sending, so 1.5 MB of base64 is plenty.
const Body = z.object({
  image: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
});

export async function POST(req: Request) {
  if (process.env.TUTOR_DISABLED === "1") return Response.json({ error: "The tutor is resting. Please try again later." }, { status: 503 });
  // Photos cost more than text, so they get their own, tighter limit.
  if (!allow(`img:${clientKey(req)}`, Number(process.env.TUTOR_PHOTOS_PER_10_MIN ?? 10)) || !allowToday()) {
    return Response.json({ error: "That's a lot of photos. Type your working for now, or try again in a few minutes." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please send a JPEG, PNG or WebP photo." }, { status: 400 });

  try {
    const r = await readWorking(callModel, parsed.data.image);
    console.log(JSON.stringify({ readWorking: r.ok ? "ok" : r.reason, chars: r.ok ? r.text.length : 0 }));
    if (!r.ok) {
      const error = r.reason === "not_schoolwork" ? "That photo doesn't look like written work. Take a photo of your working on paper." : "I couldn't read that photo. Try again in good light, with the page flat and filling the picture.";
      return Response.json({ error }, { status: 422 });
    }
    return Response.json({ text: r.text });
  } catch (e) {
    console.error("read-working failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "I couldn't read the photo just now. Please try again or type your working." }, { status: 502 });
  }
}
