// Turns tutor text with $…$ maths into words a voice can read: "$3x - 12$" becomes "3x minus 12".
// Used by the phone voice and the /api/speak route alike.

export function mathsToWords(text: string): string {
  return text
    .replace(/\\\$/g, " dollars ")
    .replace(/\$\$?([^$]+)\$\$?/g, (_, m: string) => ` ${latexWords(m)} `)
    .replace(/\*\*/g, "")
    .replace(/US\$/g, "US dollars ")
    .replace(/\s+/g, " ")
    .trim();
}

function latexWords(m: string): string {
  return m
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
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s-\s|−/g, " minus ")
    .replace(/(\d)\s*-\s*(\d)/g, "$1 minus $2")
    .replace(/\+/g, " plus ")
    .replace(/=/g, " equals ");
}
