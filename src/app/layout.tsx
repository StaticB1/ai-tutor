import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { PREFS_BOOT_SCRIPT } from "@/lib/client/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: { default: "AI Tutor", template: "%s · AI Tutor" },
  description: "A tutor for every school subject that gives hints, not answers. Built by Statotech Systems on NVIDIA Nemotron models.",
  applicationName: "AI Tutor",
};

export const viewport: Viewport = {
  themeColor: "#143466", // --st-navy (meta tags cannot read CSS variables)
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 btn">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 flex-1">
          {children}
        </main>
        <footer className="border-t border-paper-3 no-print">
          <div className="mx-auto max-w-6xl px-4 py-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted max-w-md">
              You are talking to an AI. It can make mistakes, so check with your teacher. We do not store your messages; your progress stays on this device.
            </p>
            <a href="https://statotec.com" aria-label="Built by Statotech Systems">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/built-by-statotech.svg" alt="Built by Statotech Systems" width={176} height={28} className="dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/built-by-statotech-dark.svg" alt="Built by Statotech Systems" width={176} height={28} className="hidden dark:inline" />
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
