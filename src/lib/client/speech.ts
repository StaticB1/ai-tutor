"use client";

// Read-aloud with the device's own voice (Web Speech API): free, offline on most phones, and
// nothing leaves the device. Maths is turned into words so "$3x - 12$" is read as "3x minus 12".

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

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

export function speak(text: string, onEnd?: () => void) {
  if (!speechAvailable()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(mathsToWords(text));
  const voices = synth.getVoices();
  u.voice = voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  u.rate = 0.95;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  synth.speak(u);
}

export function stopSpeaking() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}
