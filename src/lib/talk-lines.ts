// Fixed lines the tutor says in talk mode. Because they never change, /api/speak keeps their audio
// and they play at once instead of waiting for a voice to be made.

/**
 * Said the moment the learner stops speaking, while the reply is being worked out. None of them says
 * or suggests whether the learner was right: that is only known once the reply is ready.
 */
export const THINKING = ["Okay, let me look at that.", "Mm, let me think.", "Right, one moment.", "Let me check that.", "Okay, give me a second."];

/** Said once if the reply is still not ready a few seconds later. */
export const STILL_THINKING = ["Still thinking, one more moment.", "Sorry, this one is taking me a little longer."];

/** What the tutor says when talk mode opens on a new question. */
export function openingLine(question: string): string {
  return `Let's work on this one together. ${question} How would you start? Tell me your first step, or ask me for a hint.`;
}

/** What the tutor says when talk mode opens part-way through; the last reply is said after it. */
export const CARRY_ON = "Let's keep going.";
