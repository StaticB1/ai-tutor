import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "AI Tutor",
  description: "A tutor for every school subject that gives hints, not answers. Built by Statotech Systems on NVIDIA Nemotron models.",
  applicationName: "AI Tutor",
};

export const viewport: Viewport = {
  themeColor: "#143466", // --st-navy (meta tags cannot read CSS variables)
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-paper-3">
          <div className="mx-auto max-w-3xl px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <Link href="/" className="font-display font-semibold text-navy no-underline">
              AI Tutor
            </Link>
            <span className="eyebrow">Hints, not answers</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 py-8 flex-1">{children}</main>
        <footer className="border-t border-paper-3">
          <div className="mx-auto max-w-3xl px-4 py-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted max-w-md">
              You are talking to an AI. It can make mistakes, so check with your teacher. Your messages are not stored by us.
            </p>
            <a href="https://statotec.com" aria-label="Built by Statotech Systems">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/built-by-statotech.svg" alt="Built by Statotech Systems" width={176} height={28} />
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
