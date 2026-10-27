// One small client for any OpenAI-compatible endpoint. Production points it at Nebius Token Factory;
// the same Nemotron models are also on build.nvidia.com, which is handy for local development.

/**
 * One job per role, so each job gets the model it needs:
 * tutor writes to the learner; marker marks each message against the mark scheme; checker checks
 * a reply for give-aways; safety screens learner messages; vision reads photos of working;
 * report writes the teacher's summary; explore writes the "where you'll see this" cards from a
 * web search; judge is only used by the evaluations in tests/live.
 */
export type Role = "tutor" | "marker" | "checker" | "safety" | "vision" | "report" | "explore" | "judge";

// Model ids as Nebius Token Factory names them (checked 2026-10-27). build.nvidia.com uses
// lower-case ids, so set the TUTOR_MODEL_* variables when pointing at it.
export const MODELS = {
  ultra: "nvidia/Nemotron-3-Ultra-550b-a55b",
  superVl: "nvidia/Nemotron-3.5-Super-VL",
  super: "nvidia/nemotron-3-super-120b-a12b",
  nano: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  lightning: "nvidia/Nemotron-3_5-Lightning",
} as const;

// Chosen by measurement (tests/live/routing, docs/eval/routing-2026-10-27.json): Ultra writes to the
// learner; Super VL marks and checks replies (as accurate as Ultra on our labelled cases, at 30% of
// the price); Lightning screens messages (caught 10 of 10 harmful ones with no false alarms, fastest).
const DEFAULTS: Record<Role, string> = {
  tutor: MODELS.ultra,
  marker: MODELS.superVl,
  checker: MODELS.superVl,
  safety: MODELS.lightning,
  vision: MODELS.superVl,
  report: MODELS.superVl,
  explore: MODELS.superVl,
  judge: MODELS.superVl,
};

export function modelFor(role: Role): string {
  const env = {
    tutor: process.env.TUTOR_MODEL_TUTOR,
    marker: process.env.TUTOR_MODEL_MARKER ?? process.env.TUTOR_MODEL_JUDGE,
    checker: process.env.TUTOR_MODEL_CHECKER ?? process.env.TUTOR_MODEL_JUDGE,
    safety: process.env.TUTOR_MODEL_SAFETY,
    vision: process.env.TUTOR_MODEL_VISION,
    report: process.env.TUTOR_MODEL_REPORT ?? process.env.TUTOR_MODEL_JUDGE,
    explore: process.env.TUTOR_MODEL_EXPLORE,
    judge: process.env.TUTOR_MODEL_JUDGE,
  }[role];
  return env || DEFAULTS[role];
}

/** Token Factory list prices in US$ per million tokens (Billing > Prices, read 2026-10-27). */
export const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  [MODELS.ultra]: { input: 1.0, cached: 0.12, output: 3.0 },
  [MODELS.superVl]: { input: 0.3, cached: 0.06, output: 0.9 },
  [MODELS.super]: { input: 0.3, cached: 0.06, output: 0.9 },
  [MODELS.nano]: { input: 0.06, cached: 0.012, output: 0.24 },
  [MODELS.lightning]: { input: 0.06, cached: 0.03, output: 0.24 },
};

/** What a call cost at list price, in US$; 0 for a model not in the table. */
export function costOf(u: Usage): number {
  const p = PRICES[u.model];
  if (!p) return 0;
  return ((u.promptTokens - u.cachedTokens) * p.input + u.cachedTokens * p.cached + u.completionTokens * p.output) / 1e6;
}

export type Content = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
export interface Message {
  role: "system" | "user" | "assistant";
  content: Content;
}

export interface CallOptions {
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
  /** Nemotron 3 thinks before answering by default; short tutoring turns do not need it */
  think?: boolean;
  signal?: AbortSignal;
}

export interface Usage {
  model: string;
  promptTokens: number;
  /** prompt tokens the provider served from its cache, billed at the cached price */
  cachedTokens: number;
  completionTokens: number;
  ms: number;
}

/** The engine depends on this signature only, so tests can swap in a fake. */
export type ModelCall = (role: Role, messages: Message[], opts?: CallOptions) => Promise<{ text: string; usage: Usage }>;

export const callModel: ModelCall = (role, messages, opts) => callAs(modelFor(role), messages, opts);

/** The same call with an explicit model, for comparing models on one job (tests/live/routing). */
export function callWith(models: Partial<Record<Role, string>>): ModelCall {
  return (role, messages, opts) => callAs(models[role] ?? modelFor(role), messages, opts);
}

async function callAs(model: string, messages: Message[], opts: CallOptions = {}): Promise<{ text: string; usage: Usage }> {
  const base = (process.env.TUTOR_API_BASE || "https://api.tokenfactory.nebius.com/v1").replace(/\/$/, "");
  const key = process.env.TUTOR_API_KEY;
  if (!key) throw new Error("TUTOR_API_KEY is not set");
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: opts.maxTokens ?? 400,
    temperature: opts.temperature ?? 0.3,
  };
  if (!opts.think && /nemotron-3/i.test(model)) body.chat_template_kwargs = { enable_thinking: false };
  if (opts.json) body.response_format = { type: "json_object" };

  const started = Date.now();
  // One retry on overload or a slow reply; a learner should not see a hiccup at the provider.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal ?? AbortSignal.timeout(20_000),
      });
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status) || attempt === 1) break;
    } catch (e) {
      if (attempt === 1) throw e;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  if (!res || !res.ok) {
    const detail = res ? (await res.text()).slice(0, 300) : "no response";
    throw new Error(`model ${model} returned ${res?.status ?? "nothing"}: ${detail}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } | null };
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return {
    text: stripThinking(text),
    usage: {
      model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      ms: Date.now() - started,
    },
  };
}

/** Some deployments return the reasoning inline; the learner must never see it. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/** Pull the first JSON object out of a reply, tolerating code fences and stray prose. */
export function parseJson(text: string): unknown {
  const fenced = text.replace(/```(?:json)?/g, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
}
