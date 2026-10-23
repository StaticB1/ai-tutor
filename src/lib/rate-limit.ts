// A small in-memory limit per client address. Each server instance counts on its own, so this
// slows abuse of the public demo rather than stopping it; TUTOR_DISABLED=1 switches the API off.

const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

export function allow(key: string, limit = Number(process.env.TUTOR_TURNS_PER_10_MIN ?? 40)): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear();
  return true;
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
