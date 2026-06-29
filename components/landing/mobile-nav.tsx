"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
      >
        {open ? (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-border bg-page/95 px-6 py-4 backdrop-blur-md sm:hidden">
          <nav className="flex flex-col gap-1">
            {[
              { label: "Features",     href: "#features"    },
              { label: "How it works", href: "#how-it-works"},
              { label: "For teams",    href: "#for-teams"   },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-[var(--radius-sm)] border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Sign in
              </Link>
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-[var(--radius-sm)] bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Try for free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
