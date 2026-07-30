"use client";

import { Lock } from "lucide-react";
import { usePagePrivacy } from "@/components/pages/page-privacy-context";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { createPortal } from "react-dom";

// Read-only status echo, not a second control — matches Notion, which only
// ever shows this next to the title when access is "Only people invited";
// it disappears for the workspace-wide and public-link tiers. The one real
// control for all three tiers is the Share panel's "General access" picker.
export function PagePrivacyPill() {
  const { isPrivate } = usePagePrivacy();
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  if (!isPrivate) return null;

  return (
    <>
      <span
        onMouseEnter={(e) => showTooltip("Only you and invited people can open this page", e)}
        onMouseLeave={hideTooltip}
        className="ml-1.5 flex shrink-0 items-center gap-1 rounded-[var(--radius-xs)] border border-[#bae6fd] bg-[#e0f2fe] px-1.5 py-0.5 text-[11px] font-semibold text-[#0369a1] dark:border-[#1f3c56] dark:bg-[#0c4a6e] dark:text-[#bae6fd]"
      >
        <Lock size={10} />
        Private
      </span>
      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </>
  );
}
