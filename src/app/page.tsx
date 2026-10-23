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
    <div className="space-y-6 sm:space-y-12">
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,46%)] xl:grid-cols-[minmax(0,1fr)_520px] items-center gap-6 xl:gap-10">
        <div className="space-y-4 min-w-0">
          <p className="eyebrow">Any subject · Form 1 to 4</p>
          <h1 className="text-[36px] leading-[39px] sm:text-5xl xl:text-[52px] xl:leading-[1.05] tracking-[-0.04em] text-ink">
            A tutor that helps you <span className="text-navy">work it out.</span>
          </h1>
          <p className="text-lg text-text-2 max-w-[30rem]">
            Choose a question, try a step, and get a hint when you need one.
            <span className="hidden sm:inline"> Hints and worked steps come first; the full answer opens once you have tried them all.</span>
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a href="#questions" className="btn h-12 px-6">
              Choose a question <Icon.arrowRight size={18} />
            </a>
            <Link href="/how-it-works" className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Icon.shield size={16} /> How it works
            </Link>
          </div>
        </div>
        <div className="mx-auto w-[180px] sm:w-[320px] lg:w-full max-w-[520px] rounded-[28px] art-tile overflow-hidden">
          <img
            src="/illustrations/hero.webp"
            alt="A learner in school uniform working through a maths question on her phone"
            width={520}
            height={420}
            className="w-full h-auto"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </section>

      <LearnerDashboard items={ITEMS.map((i) => ({ id: i.id, subject: i.subject, topic: i.topic }))} />

      <QuestionBrowser items={browserItems} subjects={subjects()} levels={levels} />
    </div>
  );
}
