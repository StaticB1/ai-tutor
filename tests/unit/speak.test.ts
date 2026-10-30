import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THINKING } from "@/lib/talk-lines";

// Each test loads a fresh copy of the route so its pause state starts clean.
async function route() {
  vi.resetModules();
  return (await import("@/app/api/speak/route")).POST;
}
const req = (text = "Good start.") =>
  new Request("http://x/api/speak", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": `1.2.3.${Math.random()}` }, body: JSON.stringify({ text }) });

describe("/api/speak fallback", () => {
  beforeEach(() => {
    process.env.TUTOR_VOICE = "cartesia";
    process.env.CARTESIA_API_KEY = "test";
    process.env.TUTOR_VOICE_CHARS_PER_DAY = "700";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TUTOR_VOICE;
    delete process.env.CARTESIA_API_KEY_2;
    delete process.env.MURF_API_KEY;
  });

  it("returns Cartesia audio when it works", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("mp3", { status: 200 })));
    const r = await (await route())(req());
    expect(r.status).toBe(200);
    expect(r.headers.get("X-Voice")).toBe("cartesia");
  });

  it("falls back for an hour when Cartesia is out of credits, without calling it again", async () => {
    const f = vi.fn(async () => new Response("Insufficient credits", { status: 402 }));
    vi.stubGlobal("fetch", f);
    const POST = await route();
    const a = await POST(req());
    expect(a.status).toBe(204);
    expect(a.headers.get("X-Voice")).toBe("phone:out-of-credits");
    expect(Number(a.headers.get("X-Voice-Retry-After"))).toBeGreaterThan(3500);
    const b = await POST(req());
    expect(b.status).toBe(204);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retries after a minute on a server error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 503 })));
    const r = await (await route())(req());
    expect(r.headers.get("X-Voice")).toBe("phone:error-503");
    expect(Number(r.headers.get("X-Voice-Retry-After"))).toBeLessThanOrEqual(60);
  });

  it("stops at the daily character budget", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("mp3", { status: 200 })));
    process.env.TUTOR_VOICE_CHARS_PER_DAY = "20";
    const POST = await route();
    expect((await POST(req("Twelve chars"))).status).toBe(200);
    const r = await POST(req("Twelve chars"));
    expect(r.status).toBe(204);
    expect(r.headers.get("X-Voice")).toBe("phone:daily-budget");
  });

  it("returns Murf audio, decoded from base64, when TUTOR_VOICE=murf", async () => {
    process.env.TUTOR_VOICE = "murf";
    process.env.MURF_API_KEY = "test";
    let sent: { voiceId?: string; encodeAsBase64?: boolean } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        sent = JSON.parse(String(init?.body));
        return Response.json({ encodedAudio: Buffer.from("mp3").toString("base64") });
      }),
    );
    const r = await (await route())(req());
    expect(r.status).toBe(200);
    expect(r.headers.get("X-Voice")).toBe("murf");
    expect(await r.text()).toBe("mp3");
    expect(sent).toMatchObject({ voiceId: "en-US-julia", encodeAsBase64: true });
  });

  it("falls back when Murf answers without audio", async () => {
    process.env.TUTOR_VOICE = "murf";
    process.env.MURF_API_KEY = "test";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ warning: "x" })));
    const r = await (await route())(req());
    expect(r.headers.get("X-Voice")).toBe("phone:error-502");
  });

  it("moves down the chain: Cartesia out of credits, second Cartesia key out, then Murf", async () => {
    process.env.TUTOR_VOICE = "cartesia,cartesia-2,murf";
    process.env.CARTESIA_API_KEY_2 = "test2";
    process.env.MURF_API_KEY = "test3";
    const f = vi.fn(async (url: string) =>
      url.includes("cartesia") ? new Response("Insufficient credits", { status: 402 }) : Response.json({ encodedAudio: Buffer.from("mp3").toString("base64") }),
    );
    vi.stubGlobal("fetch", f);
    const POST = await route();
    const a = await POST(req());
    expect(a.headers.get("X-Voice")).toBe("murf");
    expect(f).toHaveBeenCalledTimes(3);
    // Both Cartesia keys are now skipped for an hour, so the next reply goes straight to Murf.
    const b = await POST(req());
    expect(b.headers.get("X-Voice")).toBe("murf");
    expect(f).toHaveBeenCalledTimes(4);
  });

  it("uses the second Cartesia key when the first fails", async () => {
    process.env.TUTOR_VOICE = "cartesia,cartesia-2,murf";
    process.env.CARTESIA_API_KEY_2 = "test2";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        (init?.headers as Record<string, string>)["X-API-Key"] === "test" ? new Response("oops", { status: 500 }) : new Response("mp3", { status: 200 }),
      ),
    );
    const r = await (await route())(req());
    expect(r.headers.get("X-Voice")).toBe("cartesia-2");
  });

  it("uses the phone voice only when every voice fails, naming each reason", async () => {
    process.env.TUTOR_VOICE = "cartesia,murf";
    process.env.MURF_API_KEY = "test3";
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.includes("cartesia") ? new Response("no", { status: 402 }) : new Response("oops", { status: 503 }))));
    const r = await (await route())(req());
    expect(r.status).toBe(204);
    expect(r.headers.get("X-Voice")).toBe("phone:out-of-credits,error-503");
    expect(Number(r.headers.get("X-Voice-Retry-After"))).toBeLessThanOrEqual(60);
  });

  it("has no daily cap unless one is set", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("mp3", { status: 200 })));
    delete process.env.TUTOR_VOICE_CHARS_PER_DAY;
    const POST = await route();
    for (let i = 0; i < 5; i++) expect((await POST(req("x".repeat(1000)))).headers.get("X-Voice")).toBe("cartesia");
  });

  it("serves a fixed line by name: made once, then kept and cacheable", async () => {
    const f = vi.fn(async () => new Response("mp3", { status: 200 }));
    vi.stubGlobal("fetch", f);
    vi.resetModules();
    const GET = (await import("@/app/api/speak/route")).GET;
    const get = (line: string) => GET(new Request(`http://x/api/speak?line=${line}`, { headers: { "x-forwarded-for": "9.9.9.9" } }));
    const first = await get(THINKING[0].key as string);
    expect(await first.text()).toBe("mp3");
    expect(first.headers.get("Cache-Control")).toContain("public");
    expect(await (await get(THINKING[0].key as string)).text()).toBe("mp3");
    expect(f).toHaveBeenCalledTimes(1);
    expect((await get("open-maths-linear-equation")).status).toBe(200);
    expect((await get("open-no-such-item")).status).toBe(404);
    expect((await get("anything")).status).toBe(404);
  });

  it("never caches a reply", async () => {
    const f = vi.fn(async () => new Response("mp3", { status: 200 }));
    vi.stubGlobal("fetch", f);
    const POST = await route();
    const r = await POST(req("Good start."));
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    await POST(req("Good start."));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("speaks with ElevenLabs first when it is listed first, and skips it when its quota is used up", async () => {
    process.env.TUTOR_VOICE = "elevenlabs,murf";
    process.env.ELEVENLABS_API_KEY = "el";
    process.env.MURF_API_KEY = "test3";
    let quota = false;
    const f = vi.fn(async (url: string) => {
      if (url.includes("elevenlabs")) return quota ? new Response('{"detail":{"status":"quota_exceeded"}}', { status: 401 }) : new Response("mp3", { status: 200 });
      return Response.json({ encodedAudio: Buffer.from("mp3").toString("base64") });
    });
    vi.stubGlobal("fetch", f);
    const POST = await route();
    expect((await POST(req())).headers.get("X-Voice")).toBe("elevenlabs");
    quota = true;
    expect((await POST(req())).headers.get("X-Voice")).toBe("murf");
    expect((await POST(req())).headers.get("X-Voice")).toBe("murf");
    expect(f.mock.calls.filter(([u]) => String(u).includes("elevenlabs"))).toHaveLength(2);
    delete process.env.ELEVENLABS_API_KEY;
  });

  it("uses the phone voice when the switch is off", async () => {
    delete process.env.TUTOR_VOICE;
    const r = await (await route())(req());
    expect(r.headers.get("X-Voice")).toBe("phone:off");
  });
});
