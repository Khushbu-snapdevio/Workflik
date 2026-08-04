"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Toggle menu"
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
      >
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>

      {open && (
        <div id="mobile-nav-menu" className="absolute left-0 right-0 top-full z-40 border-b border-border bg-page/95 px-6 py-4 backdrop-blur-md sm:hidden">
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
                className="rounded-sm px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Sign in
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
