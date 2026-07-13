"use client";

import { createPortal } from "react-dom";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";

// Extracted as its own client component because the parent analytics page is
// an async server component (direct db access) — the hover-tooltip hook
// needs a client boundary of its own.
export function TruncatedNameLabel({ name }: { name: string }) {
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 return (
  <>
   <span
    className="w-32 shrink-0 truncate text-xs font-medium text-foreground/80"
    onMouseEnter={(e) => showTooltip(name, e)}
    onMouseLeave={hideTooltip}
   >
    {name}
   </span>

   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
  </>
 );
}
