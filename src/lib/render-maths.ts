import katex from "katex";

/**
 * Renders text to HTML on the server: $…$ inline and $$…$$ display maths via KaTeX, **bold**,
 * everything else escaped, blank lines as paragraphs. `\$` is a literal dollar sign (prices).
 * Rendering here means phones never download KaTeX's JavaScript. MathML is included so screen
 * readers can read the maths. Adapted from ZimSchool Learn.
 */
const DOLLAR = "\u0000D\u0000";

export function renderMaths(src: string): string {
  return src
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${renderInline(para)}</p>`)
    .join("");
}

export function renderInline(src: string): string {
  const text = src.replace(/\\\$/g, DOLLAR);
  const out: string[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out.push(prose(text.slice(last, m.index)));
    const display = m[1] !== undefined;
    out.push(katex.renderToString(display ? m[1] : m[2], { displayMode: display, throwOnError: false, output: "htmlAndMathml" }));
    last = m.index + m[0].length;
  }
  out.push(prose(text.slice(last)));
  return out.join("").replaceAll(DOLLAR, "$");
}

function prose(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
