import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "How it works" };

const STEPS = [
  {
    id: "safety",
    icon: Icon.shield,
    title: "Safety first",
    text: "Every message is screened by a Nemotron safety check before the tutor sees it. If you write about being hurt or wanting to hurt yourself, you get a fixed message pointing you to a trusted adult and to Childline on 116, never a made-up reply.",
  },
  {
    id: "marking",
    icon: Icon.clipboard,
    title: "Marked against the mark scheme",
    text: "Each question has a hidden mark scheme. Nemotron checks your message against it, one point at a time, and notices common mistakes. Final answers in maths are checked by code, not by the AI.",
  },
  {
    id: "rules",
    icon: Icon.bulb,
    title: "Hints first, answer last",
    text: "The program, not the AI, decides what happens next: ask you a question, give the next hint, or show one worked step. The full answer only opens once you have used every hint and step, and you cannot talk the tutor out of that rule.",
  },
  {
    id: "checked",
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
        {STEPS.map(({ id, icon: I, title, text }, n) => (
          <li key={title} id={id} className="card p-5 flex gap-4 scroll-mt-28 target:ring-2 target:ring-navy/40">
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

      <section id="phones" className="space-y-3 scroll-mt-28">
        <h2 className="text-2xl">Made for phones</h2>
        <ul className="list-disc pl-5 space-y-1 text-text-2">
          <li>It runs in the phone&apos;s browser. There is no app to install and no account to create.</li>
          <li>Pages are built in advance and the maths is drawn on our server, so the phone downloads less.</li>
          <li>Large text, dark mode and reading aloud are in the settings at the top of every page.</li>
          <li>A maths keypad gives you × ÷ ² √ π and more without hunting on the keyboard.</li>
          <li>Prefer paper? Take a photo of your working. Nemotron reads it into the box, and you fix anything it misread before you send.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Your privacy</h2>
        <ul className="list-disc pl-5 space-y-1 text-text-2">
          <li>You do not need an account. Your progress is saved in this browser only.</li>
          <li>We do not store your messages. They are sent to the AI models to get a reply, with data retention switched off.</li>
          <li>Reading aloud uses your device&apos;s own voice, so nothing extra is sent anywhere.</li>
          <li>A photo of your working is read once to turn it into text, then thrown away. We do not keep it.</li>
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
