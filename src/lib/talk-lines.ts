// Fixed lines the tutor says in talk mode. Each has a key, so the browser can ask for it by name
// (GET /api/speak?line=<key>) and the CDN can keep the audio: after the first time it plays at once
// and costs no voice credits.

export interface Line {
  /** set for fixed lines only */
  key?: string;
  text: string;
}

/**
 * Said the moment the learner stops speaking, while the reply is being worked out. None of them says
 * or suggests whether the learner was right: that is only known once the reply is ready.
 */
export const THINKING: Line[] = ["Okay, let me look at that.", "Mm, let me think.", "Right, one moment.", "Let me check that.", "Okay, give me a second."].map(
  (text, n) => ({ key: `thinking-${n}`, text }),
);

/** Said once if the reply is still not ready a few seconds later. */
export const STILL_THINKING: Line[] = ["Still thinking, one more moment.", "Sorry, this one is taking me a little longer."].map((text, n) => ({
  key: `still-${n}`,
  text,
}));

/** What the tutor says when talk mode opens on a new question. */
export function opening(item: { id: string; question: string }): Line {
  return { key: `open-${item.id}`, text: `Let's work on this one together. ${item.question} How would you start?` };
}

/** What the tutor says when talk mode opens part-way through: this, then the last reply. */
export const CARRY_ON = "Let's keep going.";
