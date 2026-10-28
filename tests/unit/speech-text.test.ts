import { describe, expect, it } from "vitest";
import { mathsToWords } from "@/lib/speech-text";

// Each case is a line a tutor reply really contained (docs/eval), and how a teacher would say it.
const CASES: Array<[string, string]> = [
  ["Let's subtract carefully: $12\\,000 - 4\\,500$.", "Let's subtract carefully: 12000 minus 4500."],
  ["So 10% of US$34 is US$3.40.", "So 10% of 34 dollars is 3 dollars 40 cents."],
  ["The final price is US\\$34 − US\\$3.40 = US\\$30.60.", "The final price is 34 dollars minus 3 dollars 40 cents equals 30 dollars 60 cents."],
  ["The owner's capital is US\\$7 500.", "The owner's capital is 7500 dollars."],
  ["Here is the last step: 150 ÷ 2.5 = 60 km/h.", "Here is the last step: 150 divided by 2.5 equals 60 kilometres per hour."],
  ["Okay — last quick step: 150 ÷ 2.5 = ?", "Okay — last quick step: 150 divided by 2.5 equals what?"],
  ["Look at the left side: $3(x - 4)$.", "Look at the left side: 3, open bracket, x minus 4, close bracket."],
  ["What is $3 \\times x$ and $3 \\times (-4)$?", "What is 3 times x and 3 times negative 4?"],
  ["What do you need to do with the $-12$?", "What do you need to do with the minus 12?"],
  ["Subtract $2x$ from both sides: $3x - 2x = 5 + 12$.", "Subtract 2x from both sides: 3x minus 2x equals 5 plus 12."],
  ["The foot is 1.4 m from the wall.", "The foot is 1.4 metres from the wall."],
  ["So $h = \\sqrt{23.04} = 4.8$ m.", "So h equals the square root of 23.04 equals 4.8 metres."],
  ["Calculate its average speed in km/h.", "Calculate its average speed in kilometres per hour."],
  ["Distance = 150 km, time = 2.5 h.", "Distance equals 150 kilometres, time equals 2.5 hours."],
  ["First find 10% (which is 4) and 5% (half of that, 2).", "First find 10%, which is 4, and 5%, half of that, 2."],
  ["The binary number is 100101. Is 1000 bigger than 37?", "The binary number is 1 0 0 1 0 1. Is 1000 bigger than 37?"],
  ["The 3 multiplies *each* term.", "The 3 multiplies each term."],
  ["Good start - now try the next step.", "Good start - now try the next step."],
];

describe("mathsToWords", () => {
  it.each(CASES)("%s", (input, spoken) => {
    expect(mathsToWords(input)).toBe(spoken);
  });

  it("leaves algebra like 3m and 2h alone", () => {
    expect(mathsToWords("$3m + 2h$")).toBe("3m plus 2h");
  });
});
