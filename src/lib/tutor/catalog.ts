import { ITEMS } from "@/content/items";
import { needed } from "./engine";
import type { Item, PublicItem } from "./types";

/** The only view of an item that reaches the browser before the learner has finished it. */
export function publicItem(item: Item): PublicItem {
  return { id: item.id, subject: item.subject, level: item.level, topic: item.topic, question: item.question, marks: item.marks, pointsNeeded: needed(item) };
}

export function subjects(): string[] {
  return Array.from(new Set(ITEMS.map((i) => i.subject)));
}
