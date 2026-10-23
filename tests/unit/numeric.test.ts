import { describe, expect, it } from "vitest";
import { containsAnswer, numbersIn, statesAnswer } from "@/lib/tutor/numeric";

describe("numbersIn", () => {
  it("reads thousands separators, decimals, signs and fractions", () => {
    expect(numbersIn("US$12 000 and 4,500")).toEqual([12000, 4500]);
    expect(numbersIn("x = −7")).toEqual([-7]);
    expect(numbersIn("about 30.60")).toEqual([30.6]);
    expect(numbersIn("3/4 of it")).toEqual([0.75]);
  });
});

describe("statesAnswer", () => {
  const n = { kind: "number" as const, value: 17 };
  it("accepts the answer as the last number", () => {
    expect(statesAnswer("3x - 2x = 5 + 12 so x = 17", n)).toBe(true);
    expect(statesAnswer("17", n)).toBe(true);
  });
  it("rejects a list of guesses", () => {
    expect(statesAnswer("is it 12 or 17?", n)).toBe(false);
  });
  it("rejects working that stops before the answer", () => {
    expect(statesAnswer("3x - 12 = 2x + 5", n)).toBe(false);
  });
  it("respects tolerance", () => {
    expect(statesAnswer("US$30.6", { kind: "number", value: 30.6, tolerance: 0.005 })).toBe(true);
    expect(statesAnswer("US$30.65", { kind: "number", value: 30.6, tolerance: 0.005 })).toBe(false);
  });
  it("matches text answers as whole words", () => {
    const t = { kind: "text" as const, accept: ["100101"] };
    expect(statesAnswer("it is 100101", t)).toBe(true);
    expect(statesAnswer("1001010", t)).toBe(false);
  });
});

describe("containsAnswer", () => {
  it("finds the answer anywhere in a reply", () => {
    expect(containsAnswer("Nearly! The answer is 17, check again", { kind: "number", value: 17 })).toBe(true);
  });
  it("ignores an answer value that the question itself contains", () => {
    expect(containsAnswer("Look at the 5", { kind: "number", value: 5 }, [5])).toBe(false);
  });
});
