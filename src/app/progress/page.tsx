import type { Metadata } from "next";
import { ITEMS } from "@/content/items";
import { subjects } from "@/lib/tutor/catalog";
import { ProgressView } from "@/components/progress-view";

export const metadata: Metadata = { title: "My progress" };

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">My progress</p>
        <h1 className="text-4xl text-ink">How you are doing</h1>
        <p className="text-text-2">Saved on this device only. Nobody else can see it unless you show them.</p>
      </div>
      <ProgressView items={ITEMS.map((i) => ({ id: i.id, subject: i.subject, topic: i.topic, level: i.level }))} subjects={subjects()} />
    </div>
  );
}
