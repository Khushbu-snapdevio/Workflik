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
        className="ml-1.5 flex shrink-0 items-center gap-1 rounded-xs border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary"
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
