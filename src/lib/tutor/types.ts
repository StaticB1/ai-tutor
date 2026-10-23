// An item is one question with everything the tutor needs to teach it without giving it away.
// Fields marked "hidden" never leave the server before the learner has finished.

export interface MarkingPoint {
  id: string;
  /** hidden: what earns the point, in mark-scheme language */
  text: string;
  /** true when this point is the final answer; it can only be awarded by the code check */
  answer?: boolean;
  /** hidden: words that would give this point away while the learner has not shown it */
  leak?: string[];
}

export interface Misconception {
  id: string;
  /** hidden: the mistake, for the assessor */
  description: string;
  /** hidden: a question that makes the learner notice it, without correcting it for them */
  nudge: string;
}

export type FinalAnswer =
  | { kind: "number"; value: number; tolerance?: number; unit?: string }
  | { kind: "text"; accept: string[] };

export interface Item {
  id: string;
  subject: string;
  level: string;
  topic: string;
  /** shown: markdown with $...$ maths */
  question: string;
  marks: number;
  /** hidden */
  markingPoints: MarkingPoint[];
  /** how many marking points complete the item; defaults to all of them ("any 3 of" questions set fewer) */
  pointsNeeded?: number;
  /** hidden: ordered steps; the last one states the answer and is only shown when the item is done */
  workedSolution: string[];
  /** hidden */
  finalAnswer?: FinalAnswer;
  /** hidden */
  misconceptions: Misconception[];
  /** hidden: pre-written hint ladder, safe to send as-is; used in order and as the fallback reply */
  hints: string[];
}

export interface PublicItem {
  id: string;
  subject: string;
  level: string;
  topic: string;
  question: string;
  marks: number;
  pointsNeeded: number;
}

export interface TutorState {
  v: 1;
  itemId: string;
  /** marking point ids the learner has shown */
  met: string[];
  /** how many hints from the ladder have been used */
  hintLevel: number;
  /** how many worked-solution steps have been shown */
  stepsShown: number;
  /** consecutive attempts that earned nothing */
  unproductive: number;
  turns: number;
  done: boolean;
  /** a safeguarding message was shown in this session */
  flagged: boolean;
  /** misconception ids seen, for the teacher report */
  misconceptions: string[];
  /** times the learner asked for the answer outright */
  answerRequests: number;
  /** times a draft reply was blocked for giving something away */
  leaksBlocked: number;
}

export interface ChatTurn {
  role: "learner" | "tutor";
  text: string;
}

export type Intent = "attempt" | "asks_answer" | "asks_hint" | "question" | "off_topic" | "greeting";

export interface Assessment {
  met: string[];
  misconception: string | null;
  intent: Intent;
}

export type Move =
  | { kind: "close" }
  | { kind: "probe"; misconception: Misconception | null }
  | { kind: "hint"; hint: string }
  | { kind: "worked_step"; step: string }
  | { kind: "redirect"; reason: "asks_answer" | "off_topic"; hint: string | null }
  | { kind: "welcome" };
