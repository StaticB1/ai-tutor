// Deterministic answer checks. The model may judge method; only code decides a final answer is right.

import type { FinalAnswer } from "./types";

/** Every number written in a piece of text: 1 200, 1,200, 30.60, -7, ½ style fractions like 3/4. */
export function numbersIn(text: string): number[] {
  const cleaned = text
    .replace(/(\d)[ ,](?=\d{3}\b)/g, "$1") // thousands separators
    .replace(/[−–]/g, "-");
  const out: number[] = [];
  const re = /-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?/g;
  for (const m of cleaned.matchAll(re)) {
    const raw = m[0].replace(/\s+/g, "");
    if (raw.includes("/")) {
      const [a, b] = raw.split("/").map(Number);
      if (b !== 0 && Number.isFinite(a / b)) out.push(a / b);
    } else {
      const n = Number(raw);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}

export function close(a: number, b: number, tolerance = 0): boolean {
  const tol = Math.max(tolerance, Math.abs(b) * 1e-9);
  return Math.abs(a - b) <= tol;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Did this text state the final answer? For numbers the last number wins, so "x = 17" and "17" both count, but "is it 12 or 17?" counts only if 17 is last. */
export function statesAnswer(text: string, answer: FinalAnswer): boolean {
  // "12 or 17?" is a list of guesses, not an answer.
  const hedged = /\bor\b/i.test(text);
  if (answer.kind === "number") {
    const nums = numbersIn(text);
    if (nums.length === 0) return false;
    if (hedged && new Set(nums.map((n) => n.toFixed(6))).size > 1) return false;
    return close(nums[nums.length - 1], answer.value, answer.tolerance ?? 0);
  }
  const t = ` ${norm(text)} `;
  if (hedged) return false;
  return answer.accept.some((a) => t.includes(` ${norm(a)} `));
}

/** Does this text contain the answer anywhere (used by the leak guard, so any position counts)? */
export function containsAnswer(text: string, answer: FinalAnswer, exclude: number[] = []): boolean {
  if (answer.kind === "number") {
    const tol = answer.tolerance ?? 0;
    if (exclude.some((e) => close(e, answer.value, tol))) {
      // the answer value also appears in the question itself; we cannot tell a leak from a quote
      return false;
    }
    return numbersIn(text).some((n) => close(n, answer.value, tol));
  }
  const t = ` ${norm(text)} `;
  return answer.accept.some((a) => t.includes(` ${norm(a)} `));
}
