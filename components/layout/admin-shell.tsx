"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ sidebar, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // See workspace-shell.tsx — picks exactly one wrapper via JS viewport detection (not
  // mounting sidebar twice) since Sheet's SheetContent is a modal <dialog>, can't double as the in-flow desktop sidebar.
  const isMobile = useIsMobile();

  return (
    <div className="flex h-dvh overflow-hidden bg-card">
      {isMobile ? (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-auto max-w-none border-0 bg-transparent p-0"
          >
            {sidebar}
          </SheetContent>
        </Sheet>
      ) : (
        <div className="hidden shrink-0 md:block">
          {sidebar}
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only top bar */}
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 md:hidden">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="flex size-8 items-center justify-center rounded-sm text-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          >
            <Menu size={17} />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/icon-32.png" unoptimized alt="Workflik" width={28} height={28} className="size-7 rounded-sm" />
            <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">Orbit Admin</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
