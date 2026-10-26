import Link from "next/link";
import { ITEMS } from "@/content/items";
import { subjects } from "@/lib/tutor/catalog";
import { renderInline } from "@/lib/render-maths";
import { itemArt } from "@/lib/art";
import { QuestionBrowser } from "@/components/question-browser";
import { LearnerDashboard } from "@/components/learner-dashboard";
import { Icon } from "@/components/icons";

const PROMISES = [
  { icon: Icon.bookOpen, title: "Hints first, answer last", text: "Guidance one step at a time.", href: "/how-it-works#rules" },
  { icon: Icon.clipboard, title: "Marked step by step", text: "See which marks you have earned.", href: "/how-it-works#marking" },
  { icon: Icon.phone, title: "Works on any phone", text: "Light pages, no app to install.", href: "/how-it-works#phones" },
];

export default function Home() {
  const levels = Array.from(new Set(ITEMS.map((i) => i.level))).sort();
  const browserItems = ITEMS.map((i) => ({
    id: i.id,
    subject: i.subject,
    level: i.level,
    topic: i.topic,
    marks: i.marks,
    art: itemArt(i),
    questionHtml: renderInline(i.question),
  }));

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-10 lg:gap-12 lg:min-h-[560px]">
        <div className="space-y-6 min-w-0">
          <p className="eyebrow text-[0.85rem]!">Any subject · Form 1 to 4</p>
          <h1 className="text-[2.6rem] leading-[1.02] sm:text-[3.75rem] xl:text-[4.6rem] tracking-[-0.05em] font-extrabold text-ink">
            A tutor that <span className="block text-navy">helps you work&nbsp;it&nbsp;out.</span>
          </h1>
          <p className="text-lg sm:text-[1.35rem] text-text-2 max-w-[30rem] leading-relaxed">Choose a question, try a step, and get a hint when you need one.</p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2">
            <a href="#questions" className="btn btn-lg h-[3.9rem]! px-8! text-[1.1rem]!">
              Choose a question <Icon.arrowRight size={18} />
            </a>
            <Link href="/how-it-works" className="text-[1.1rem] font-semibold underline underline-offset-[6px] decoration-2 decoration-navy/30 hover:decoration-navy">
              How it works
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[660px] lg:-mr-4">
          <div className="absolute left-[7%] right-[3%] top-[9%] bottom-[3%] rounded-[32px] bg-gradient-to-br from-tint-2 to-tint-1" aria-hidden="true" />
          <img
            src="/illustrations/hero.webp"
            alt="A learner in school uniform working through a maths question on her phone"
            width={560}
            height={452}
            className="relative w-full h-auto mix-blend-multiply dark:mix-blend-normal dark:rounded-[32px]"
            fetchPriority="high"
            decoding="async"
          />
          {/* Two floating cards show what the tutor feels like. Decorative, so hidden from screen readers. */}
          <div aria-hidden="true" className="float-card bubble-tail absolute hidden sm:flex sm:-left-8 top-[8%] w-[19.5rem] px-5 py-4 gap-3">
            <Icon.sparkle size={22} className="text-lift shrink-0 mt-0.5" />
            <p className="text-[1.02rem] leading-snug text-ink">Good start. What happens when you multiply 3 by −4?</p>
          </div>
          <div aria-hidden="true" className="float-card absolute right-3 sm:-right-2 bottom-[8%] sm:bottom-auto sm:top-[21%] w-[9.5rem] sm:w-[13.5rem] p-3.5 sm:px-5 sm:py-4 space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
              <span>Points</span>
              <span className="text-navy">2 of 3</span>
            </div>
            <div className="segments segments-sm segments-lift">
              <span className="on" />
              <span className="on" />
              <span />
            </div>
          </div>
        </div>
      </section>

      {/* Promises */}
      <section aria-label="What the tutor does" className="panel-tint grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-[color-mix(in_srgb,var(--st-navy)_14%,transparent)] px-2 py-4 sm:py-7 lg:-mx-4">
        {PROMISES.map(({ icon: I, title, text, href }) => (
          <div key={title} className="px-1.5 sm:px-3">
          <Link href={href} className="group flex items-center gap-5 px-3 py-3 sm:px-5 no-underline rounded-[18px] transition-colors hover:bg-paper/70">
            <span className="icon-circle h-14 w-14 sm:h-16 sm:w-16 transition-transform group-hover:scale-105">
              <I size={28} />
            </span>
            <span className="flex-1">
              <span className="block font-display font-bold text-[1.15rem] text-navy tracking-[-0.02em]">{title}</span>
              <span className="block text-[0.98rem] text-text-2">{text}</span>
            </span>
            <Icon.arrowRight size={18} className="text-navy opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 hidden sm:block" />
          </Link>
          </div>
        ))}
      </section>

      <LearnerDashboard items={ITEMS.map((i) => ({ id: i.id, subject: i.subject, topic: i.topic, art: itemArt(i) }))} />

      <QuestionBrowser items={browserItems} subjects={subjects()} levels={levels} />
    </div>
  );
}
