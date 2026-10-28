// Turns tutor text into words a voice reads the way a teacher would say them:
// "$3x - 12$" becomes "3x minus 12", "US$3.40" becomes "3 dollars 40 cents", "4.8 m" becomes
// "4.8 metres", "12\,000" becomes "12000" and the binary "100101" is read digit by digit.
// Used by the phone voice and the /api/speak route alike.

const NUMBER = String.raw`\d[\d,]*(?:\.\d+)?`;

export function mathsToWords(text: string): string {
  return tidy(
    plainSymbols(
      text
        .replace(/\*\*?/g, "")
        // LaTeX thin spaces inside numbers: 12\,000 -> 12000
        .replace(/(\d)\\[,;: ](?=\d)/g, "$1")
        .replace(/\\[,;: ]/g, " ")
        // money before maths, so the $ of US$34 is never taken for the start of a maths span. Only
        // US$ and an escaped \$ are money; a bare $ starts maths.
        .replace(new RegExp(String.raw`(?:US\\?|\\)\$\s?(${NUMBER}(?:\s\d{3})*)(?!\d|\.\d)`, "g"), (_, n: string) => ` ${money(n)} `)
        .replace(/\$\$?([^$]+)\$\$?/g, (_, m: string) => ` ${latexWords(m)} `)
        .replace(/US\$/g, "US dollars "),
    ),
  );
}

/** "34" -> "34 dollars", "3.40" -> "3 dollars 40 cents", "7 500" -> "7500 dollars" */
function money(n: string): string {
  const [whole, part] = n.replace(/[\s,]/g, "").split(".");
  const cents = part ? Number(part.padEnd(2, "0").slice(0, 2)) : 0;
  const dollars = `${whole} ${whole === "1" ? "dollar" : "dollars"}`;
  return cents ? `${dollars} ${cents} ${cents === 1 ? "cent" : "cents"}` : dollars;
}

function latexWords(m: string): string {
  return m
    .replace(/\(\s*-\s*(\d[\d.]*)\s*\)/g, " negative $1 ")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1 over $2")
    .replace(/\\sqrt\{([^}]*)\}/g, "the square root of $1")
    .replace(/\^2/g, " squared")
    .replace(/\^3/g, " cubed")
    .replace(/\^\{?([^} ]+)\}?/g, " to the power $1")
    .replace(/\\times/g, " times ")
    .replace(/\\div/g, " divided by ")
    .replace(/\\pi/g, " pi ")
    .replace(/\\(le|leq)/g, " is less than or equal to ")
    .replace(/\\(ge|geq)/g, " is greater than or equal to ")
    .replace(/\\text\{([^}]*)\}/g, " $1 ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\(/g, ", open bracket, ")
    .replace(/\)/g, ", close bracket, ")
    .replace(/\s*[-−]\s*/g, " minus ")
    .replace(/\s*\+\s*/g, " plus ")
    .replace(/\s*=\s*/g, " equals ");
}

/** Brackets around maths (3(x - 4)) are said; brackets in a sentence become a pause. */
function brackets(inner: string): string {
  const maths = /^(?:[\d.\s+\-−×÷=/^²³]|\b[a-z]\b)+$/i.test(inner) && /[\d]/.test(inner) && /[+\-−×÷=/^]/.test(inner);
  return maths ? `, open bracket, ${inner}, close bracket, ` : `, ${inner},`;
}

/** Symbols, units and number forms, inside maths or out. */
function plainSymbols(s: string): string {
  return (
    s
      // a negative number in brackets: (-4) -> negative 4
      .replace(/\(\s*[-−]\s*(\d[\d.]*)\s*\)/g, " negative $1 ")
      .replace(/\(([^()]*)\)/g, (_, inner: string) => brackets(inner))
      .replace(/=\s*\?/g, " equals what?")
      .replace(/\s*=\s*/g, " equals ")
      .replace(/\s*÷\s*/g, " divided by ")
      .replace(/\s*×\s*/g, " times ")
      .replace(/\s*\+\s*(?=[\w(])/g, " plus ")
      .replace(/²/g, " squared")
      .replace(/³/g, " cubed")
      .replace(/√\s*/g, " the square root of ")
      // minus: between terms (a digit or a one-letter name on each side), or a lone negative number
      .replace(/(\d|\b[a-z]\b|\))\s+[-−]\s+(?=\d|\(|[a-z]\b)/gi, "$1 minus ")
      // the maths minus sign (−) is never a dash in a sentence
      .replace(/\s*−\s*(?=[\w(])/g, " minus ")
      .replace(/(^|[\s,(])[-−](?=\d)/g, "$1minus ")
      // units after a number
      .replace(new RegExp(String.raw`(${NUMBER})\s?km\s?/\s?h\b`, "g"), "$1 kilometres per hour")
      .replace(new RegExp(String.raw`(${NUMBER})\s?m\s?/\s?s\b`, "g"), "$1 metres per second")
      .replace(/\bkm\s?\/\s?h\b/g, "kilometres per hour")
      .replace(/\bm\s?\/\s?s\b/g, "metres per second")
      .replace(new RegExp(String.raw`(${NUMBER})\s?km\b`, "g"), "$1 kilometres")
      .replace(new RegExp(String.raw`(${NUMBER})\s?cm\b`, "g"), "$1 centimetres")
      .replace(new RegExp(String.raw`(${NUMBER})\s?mm\b`, "g"), "$1 millimetres")
      .replace(new RegExp(String.raw`(${NUMBER})\s?kg\b`, "g"), "$1 kilograms")
      // m and h need a space before them, so 3m and 2h in algebra stay as they are
      .replace(new RegExp(String.raw`(${NUMBER})\s+m\b`, "g"), "$1 metres")
      .replace(new RegExp(String.raw`(${NUMBER})\s+h\b`, "g"), "$1 hours")
      .replace(new RegExp(String.raw`(${NUMBER})\s?°\s?C\b`, "g"), "$1 degrees Celsius")
      // digit groups: 7 500 -> 7500
      .replace(/(^|[^\d.])(\d{1,3})\s(\d{3})(?!\d)/g, "$1$2$3")
      // binary, read digit by digit: 100101 -> 1 0 0 1 0 1 (needs four or more 0s and 1s, not 1000 or 10000)
      .replace(/\b[01]{4,}\b/g, (b) => (/^10+$/.test(b) ? b : b.split("").join(" ")))
      // place-value names: the 16s place -> the 16's place
      .replace(/\b(\d+)s\b/g, "$1's")
  );
}

function tidy(s: string): string {
  return s
    .replace(/,\s*,/g, ",")
    .replace(/\s+([,.?!;:])/g, "$1")
    .replace(/^[\s,]+/, "")
    .replace(/,\s*([.?!])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
