"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function WorkspaceShell({ sidebar, children }: Props) {
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

      {/* Sidebar — fixed overlay on mobile, normal flow on desktop.
          md:relative md:z-[550] creates a stacking context so sidebar
          dropdowns (workspace switcher, profile menu, page-tree "more"
          popup — none of which portal to body) always paint above the main
          content area, whose own in-page popovers/sticky bars top out
          around z-[500] (see template-table-view, icon-picker,
          edit-property-panel). z-[1] used to sit below all of those, so
          e.g. the database view's sticky toolbar (z-20) or an in-page
          dropdown (z-[400]/z-[500]) would paint over an open sidebar
          dropdown instead of under it. Stays below true full-screen modals
          (z-[580]+), which correctly still cover the sidebar when open. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:relative md:inset-auto md:z-[550] md:translate-x-0 md:transition-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only top bar */}
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-page px-4 md:hidden">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          >
            <Menu size={17} />
          </button>
          <Image src="/icon-32.png" unoptimized alt="Workflik" width={28} height={28} className="size-7 rounded-[var(--radius-sm)]" />
        </div>
        {children}
      </div>
    </div>
  );
}
