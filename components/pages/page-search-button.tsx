"use client";

import { Search } from "lucide-react";
import { IconTooltipButton } from "@/components/ui/icon-tooltip-button";

// Topbar quick-access to global search — same trigger the sidebar's Search
// item and Ctrl+K use (components/search/search-provider.tsx listens for
// this event wherever it's mounted), so search is reachable from inside a
// page too, not just from the sidebar.
export function PageSearchButton() {
  return (
    <IconTooltipButton
      icon={<Search size={15} />}
      label="Search"
      onClick={() => document.dispatchEvent(new CustomEvent("workflik:open-search"))}
      className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
    />
  );
}
