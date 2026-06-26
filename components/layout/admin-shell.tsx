"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ sidebar, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-page">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, normal flow on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:static md:inset-auto md:z-auto md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only top bar */}
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 md:hidden">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          >
            <Menu size={17} />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/icon-32.png" unoptimized alt="Workflik" width={28} height={28} className="size-7 rounded-[var(--radius-sm)]" />
            <span className="rounded-[var(--radius-sm)] bg-primary/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">Orbit Admin</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
