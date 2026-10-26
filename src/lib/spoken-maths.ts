// Turns spoken maths from speech recognition into written maths, by fixed rules:
// "three x minus twelve equals two x plus five" -> "3x - 12 = 2x + 5".
// Rules only rewrite words that were said; they never add anything, unlike a model would.

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** "twenty five" -> "25", "one hundred and five" -> "105", "four point eight" -> "4.8". */
function numberWords(text: string): string {
  const words = text.split(/(\s+)/);
  const out: string[] = [];
  let i = 0;
  const isNum = (w: string) => w.toLowerCase() in UNITS || w.toLowerCase() in TENS || w.toLowerCase() === "hundred" || w.toLowerCase() === "thousand";
  while (i < words.length) {
    const w = words[i];
    if (!isNum(w) || (w.toLowerCase() === "oh" && !isNum(words[i + 2] ?? ""))) {
      out.push(w);
      i++;
      continue;
    }
    // read a run of number words, allowing "and" inside it ("one hundred and five")
    let total = 0;
    let current = 0;
    let j = i;
    let last = i;
    while (j < words.length) {
      const t = (words[j] ?? "").toLowerCase();
      if (/^\s+$/.test(words[j] ?? "")) {
        j++;
        continue;
      }
      if (t in UNITS) current += UNITS[t];
      else if (t in TENS) current += TENS[t];
      else if (t === "hundred") current = (current || 1) * 100;
      else if (t === "thousand") {
        total += (current || 1) * 1000;
        current = 0;
      } else if (t === "and" && isNum(words[j + 2] ?? "") && (current >= 100 || total >= 1000)) {
        j++;
        continue;
      } else break;
      last = j;
      j++;
    }
    let num = String(total + current);
    i = last + 1;
    // "point zero four": after "point", each word is one digit
    if ((words[i + 1] ?? "").toLowerCase() === "point" && (UNITS[(words[i + 3] ?? "").toLowerCase()] ?? 10) < 10) {
      num += ".";
      i += 3;
      while ((UNITS[(words[i] ?? "").toLowerCase()] ?? 10) < 10) {
        num += UNITS[words[i].toLowerCase()];
        i += 2;
      }
      i -= 1;
    }
    out.push(num);
  }
  return out.join("");
}

const PHRASES: [RegExp, string][] = [
  [/\bsquare root of\b/gi, "√"],
  [/\bsquared\b/gi, "²"],
  [/\bcubed\b/gi, "³"],
  [/\bto the power of\b/gi, "^"],
  [/\b(is equal to|equal to|equals)\b/gi, "="],
  [/\b(multiplied by|times)\b/gi, "×"],
  [/\bdivided by\b/gi, "÷"],
  [/\b(minus|take away|subtract)\b/gi, "-"],
  [/\bplus\b/gi, "+"],
  [/\b(per ?cent)\b/gi, "%"],
  [/\bopen (bracket|brackets)\b/gi, "("],
  [/\bclose (bracket|brackets)\b/gi, ")"],
  [/\bpi\b/gi, "π"],
];

/** Rewrites spoken maths into written maths. Text with no maths in it is returned unchanged apart from number words. */
export function spokenMaths(input: string): string {
  let s = numberWords(input);
  // "4 point 8" -> "4.8"
  s = s.replace(/(\d)\s+point\s+(\d)/gi, "$1.$2");
  for (const [re, sym] of PHRASES) s = s.replace(re, sym);
  // "ex" / "eggs" for the letter x, only next to a number or an operator
  s = s.replace(/(\d)\s*(ex|eggs|x)\b/gi, "$1x").replace(/\b(ex|eggs)\b(?=\s*[-+=×÷²³)])/gi, "x");
  // "a over b" between numbers -> fraction
  s = s.replace(/(\d)\s+over\s+(\d)/gi, "$1/$2");
  // tidy spacing around symbols
  s = s.replace(/\s*([=+×÷])\s*/g, " $1 ").replace(/(\d|x|\))\s+-\s+/g, "$1 - ").replace(/\s*([²³%])/g, "$1").replace(/√\s+/g, "√");
  return s.replace(/\s{2,}/g, " ").trim();
}
