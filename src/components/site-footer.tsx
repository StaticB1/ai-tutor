"use client";

import { usePathname } from "next/navigation";

/** Hidden on the tutor page, which is a full-height workspace; the AI notice there is in the chat itself. */
export function SiteFooter() {
  const path = usePathname();
  if (path.startsWith("/tutor")) return null;
  return (
    <footer className="border-t border-paper-3 no-print">
      <div className="mx-auto max-w-6xl px-4 py-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted max-w-md">
          You are talking to an AI. It can make mistakes, so check with your teacher. We do not store your messages; your progress stays on this device.
        </p>
        <a href="https://statotec.com" aria-label="Built by Statotech Systems">
          <img src="/built-by-statotech.svg" alt="Built by Statotech Systems" width={176} height={28} className="dark:hidden" />
          <img src="/built-by-statotech-dark.svg" alt="Built by Statotech Systems" width={176} height={28} className="hidden dark:inline" />
        </a>
      </div>
    </footer>
  );
}
