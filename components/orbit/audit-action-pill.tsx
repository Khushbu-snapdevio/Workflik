"use client";

import { createPortal } from "react-dom";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";

interface Props {
 action:    string;
 label:     string;
 pillClass: string;
 hasMeta:   boolean;
}

// Extracted as its own client component because the parent audit page is an
// async server component (direct db access) — the hover-tooltip hook needs
// a client boundary of its own.
export function AuditActionPill({ action, label, pillClass, hasMeta }: Props) {
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 return (
  <>
   <span
    onMouseEnter={(e) => { if (!hasMeta) showTooltip(action, e); }}
    onMouseLeave={hideTooltip}
    className={`inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-xs font-semibold ${pillClass}`}
   >
    {label}
   </span>

   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
  </>
 );
}
