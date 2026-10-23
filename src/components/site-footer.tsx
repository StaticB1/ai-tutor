import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="no-print mt-4">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <div className="border-t border-line py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="font-display font-extrabold text-lg tracking-[-0.03em] text-navy leading-tight">AI Tutor</p>
            <a href="https://statotec.com" className="text-sm text-muted no-underline hover:text-ink">
              by Statotech Systems
            </a>
          </div>
          <nav className="flex gap-7 text-sm" aria-label="Footer">
            <Link href="/#questions" className="text-text-2 no-underline hover:text-ink">
              Questions
            </Link>
            <Link href="/progress" className="text-text-2 no-underline hover:text-ink">
              My progress
            </Link>
            <Link href="/how-it-works" className="text-text-2 no-underline hover:text-ink">
              How it works
            </Link>
          </nav>
        </div>
        <div className="pb-7 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted max-w-xl">You are talking to an AI. It can make mistakes, so check with your teacher. We do not store your messages; your progress stays on this device.</p>
          <a href="https://statotec.com" aria-label="Built by Statotech Systems">
            <img src="/built-by-statotech.svg" alt="Built by Statotech Systems" width={150} height={24} className="dark:hidden" />
            <img src="/built-by-statotech-dark.svg" alt="Built by Statotech Systems" width={150} height={24} className="hidden dark:inline" />
          </a>
        </div>
      </div>
    </footer>
  );
}
