import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getItem, ITEMS } from "@/content/items";
import { publicItem } from "@/lib/tutor/catalog";
import { renderMaths } from "@/lib/render-maths";
import { itemArt } from "@/lib/art";
import { TutorSession } from "@/components/tutor-session";

export function generateStaticParams() {
  return ITEMS.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const item = getItem((await params).id);
  return { title: item ? `${item.topic} (${item.subject})` : "Question" };
}

export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const item = getItem((await params).id);
  if (!item) notFound();
  return (
    <TutorSession
      key={item.id}
      item={publicItem(item)}
      questionHtml={renderMaths(item.question)}
      all={ITEMS.map((i) => ({ id: i.id, subject: i.subject, topic: i.topic, art: itemArt(i) }))}
    />
  );
}
