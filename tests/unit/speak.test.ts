import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("uses the phone voice when the switch is off", async () => {
    delete process.env.TUTOR_VOICE;
    const r = await (await route())(req());
    expect(r.headers.get("X-Voice")).toBe("phone:off");
  });
});
