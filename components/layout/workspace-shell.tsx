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

export function WorkspaceShell({ sidebar, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // SheetContent is an inherently-modal native <dialog>, can't double as the in-flow desktop
  // sidebar, so exactly one of the two wrappers renders based on JS-detected viewport;
  // `hidden md:block` covers the SSR-to-hydration gap before useIsMobile's effect runs, avoiding a flash of the full sidebar on mobile.
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
        // md:relative md:z-550 creates a stacking context so sidebar dropdowns (none of which
        // portal to body) paint above the main content's own popovers (z-500); stays below full-screen modals (z-580+).
        <div id="workspace-sidebar" className="hidden shrink-0 md:relative md:z-550 md:block">
          {sidebar}
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only top bar */}
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="flex size-8 items-center justify-center rounded-sm text-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          >
            <Menu size={17} />
          </button>
          <Image src="/icon-32.png" unoptimized alt="Workflik" width={28} height={28} className="size-7 rounded-sm" />
        </div>
        {children}
      </div>
    </div>
  );
}
