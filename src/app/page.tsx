import Link from "next/link";
import { ITEMS } from "@/content/items";
import { subjects } from "@/lib/tutor/catalog";
import { renderInline } from "@/lib/render-maths";
import { QuestionBrowser } from "@/components/question-browser";
import { LearnerDashboard } from "@/components/learner-dashboard";
import { Icon } from "@/components/icons";

export default function Home() {
  const levels = Array.from(new Set(ITEMS.map((i) => i.level))).sort();
  const browserItems = ITEMS.map((i) => ({ id: i.id, subject: i.subject, level: i.level, topic: i.topic, marks: i.marks, questionHtml: renderInline(i.question) }));

  return (
    <div className="space-y-10">
      <section className="space-y-3 max-w-3xl">
        <p className="eyebrow">Any subject · Form 1 to 4</p>
        <h1 className="text-4xl sm:text-5xl text-ink">
          A tutor that helps you <span className="text-navy">work it out.</span>
        </h1>
        <p className="text-lg text-text-2">
          Answer in your own words. The tutor checks each step against the mark scheme, asks questions and gives hints. It will not hand you the answer, even if you ask.
        </p>
        <p className="text-sm">
          <Link href="/how-it-works" className="inline-flex items-center gap-1">
            <Icon.shield size={15} /> How it keeps you safe and stops answer-copying
          </Link>
        </p>
      </section>

      <LearnerDashboard items={ITEMS.map((i) => ({ id: i.id, subject: i.subject, topic: i.topic }))} />

      <QuestionBrowser items={browserItems} subjects={subjects()} levels={levels} />
    </div>
  );
}
