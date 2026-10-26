import { describe, expect, it } from "vitest";
import { spokenMaths } from "@/lib/spoken-maths";

describe("spokenMaths", () => {
  it("writes a spoken equation with symbols", () => {
    expect(spokenMaths("three x minus twelve equals two x plus five")).toBe("3x - 12 = 2x + 5");
  });
  it("handles the letter x heard as 'ex'", () => {
    expect(spokenMaths("so ex equals seventeen")).toBe("so x = 17");
  });
  it("reads compound numbers, decimals and fractions", () => {
    expect(spokenMaths("twenty five")).toBe("25");
    expect(spokenMaths("one hundred and fifty divided by two point five")).toBe("150 ÷ 2.5");
    expect(spokenMaths("three over four")).toBe("3/4");
  });
  it("handles powers, roots and percent", () => {
    expect(spokenMaths("h squared equals five squared minus one point four squared")).toBe("h² = 5² - 1.4²");
    expect(spokenMaths("the square root of twenty three point zero four")).toBe("the √23.04");
    expect(spokenMaths("fifteen percent of forty")).toBe("15% of 40");
  });
  it("leaves ordinary sentences alone", () => {
    expect(spokenMaths("I think it is personification")).toBe("I think it is personification");
    expect(spokenMaths("planting trees and contour ridges")).toBe("planting trees and contour ridges");
  });
  it("keeps numbers already written as digits", () => {
    expect(spokenMaths("3x minus 12 equals 2x plus 5")).toBe("3x - 12 = 2x + 5");
  });
});
