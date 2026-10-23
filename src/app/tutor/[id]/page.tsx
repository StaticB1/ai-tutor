import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getItem, ITEMS } from "@/content/items";
import { publicItem } from "@/lib/tutor/catalog";
import { renderMaths } from "@/lib/render-maths";
import { TutorChat } from "@/components/tutor-chat";

export function generateStaticParams() {
  return ITEMS.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const item = getItem((await params).id);
  return { title: item ? `${item.topic} · AI Tutor` : "AI Tutor" };
}

export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const item = getItem((await params).id);
  if (!item) notFound();
  const pub = publicItem(item);

  return (
    <div className="space-y-6">
      <Link href={`/?subject=${encodeURIComponent(item.subject)}`} className="text-sm">
        ← {item.subject}
      </Link>
      <section className="card p-5 space-y-2">
        <p className="eyebrow">
          {item.subject} · {item.level} · {item.topic} · {item.marks} marks
        </p>
        <div className="question text-lg" dangerouslySetInnerHTML={{ __html: renderMaths(item.question) }} />
      </section>
      <TutorChat item={pub} />
    </div>
  );
}
