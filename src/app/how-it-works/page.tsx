import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "How it works" };

const STEPS = [
  {
    icon: Icon.shield,
    title: "Safety first",
    text: "Every message is screened by a Nemotron safety check before the tutor sees it. If you write about being hurt or wanting to hurt yourself, you get a fixed message pointing you to a trusted adult and to Childline on 116, never a made-up reply.",
  },
  {
    icon: Icon.clipboard,
    title: "Marked against the mark scheme",
    text: "Each question has a hidden mark scheme. Nemotron checks your message against it, one point at a time, and notices common mistakes. Final answers in maths are checked by code, not by the AI.",
  },
  {
    icon: Icon.bulb,
    title: "The rules live in code",
    text: "The program, not the AI, decides what happens next: ask you a question, give the next hint, show one worked step, or say no to giving the answer. You cannot talk it out of these rules.",
  },
  {
    icon: Icon.check,
    title: "Checked before you see it",
    text: "Each reply is checked for the answer and for points you have not reached yet. If it gives too much away, it is rewritten, or replaced by a hint written in advance.",
  },
];

export default function HowItWorks() {
  return (
    <div className="max-w-3xl space-y-10">
      <section className="space-y-3">
        <p className="eyebrow">How it works</p>
        <h1 className="text-4xl text-ink">
          Hints, <span className="text-navy">not answers.</span>
        </h1>
        <p className="text-lg text-text-2">
          Studies of AI tutors found the same thing: tutors that held the answer back and guided learners step by step helped them learn. Chatbots that handed out answers did not, and in one large study learners who used one did worse in their exam.
        </p>
      </section>

      <ol className="space-y-3">
        {STEPS.map(({ icon: I, title, text }, n) => (
          <li key={title} className="card p-5 flex gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-2 text-navy">
              <I size={20} />
            </span>
            <div>
              <p className="eyebrow">Step {n + 1}</p>
              <h2 className="text-lg mt-0.5">{title}</h2>
              <p className="text-text-2 mt-1">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="space-y-3">
        <h2 className="text-2xl">Your privacy</h2>
        <ul className="list-disc pl-5 space-y-1 text-text-2">
          <li>You do not need an account. Your progress is saved in this browser only.</li>
          <li>We do not store your messages. They are sent to the AI models to get a reply, with data retention switched off.</li>
          <li>Reading aloud uses your device&apos;s own voice, so nothing extra is sent anywhere.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl">Built with</h2>
        <p className="text-text-2">
          NVIDIA Nemotron open models (Nemotron 3 Ultra for replies, Nemotron 3.5 Super VL for marking and checks), served by Nebius Token Factory. Built by Statotech Systems in Harare. The code is open source under the MIT licence.
        </p>
      </section>

      <Link href="/" className="btn">
        Start a question <Icon.arrowRight size={18} />
      </Link>
    </div>
  );
}
