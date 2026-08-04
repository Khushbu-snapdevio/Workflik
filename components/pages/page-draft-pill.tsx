"use client";

import { Pencil } from "lucide-react";
import { usePageDraft } from "@/components/pages/page-draft-context";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { createPortal } from "react-dom";

// Read-only status echo, same pattern as PagePrivacyPill — disappears the
// instant the page is promoted (see PageDraftProvider), no refresh needed.
export function PageDraftPill() {
  const { isDraft } = usePageDraft();
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  if (!isDraft) return null;

  return (
    <>
      <span
        onMouseEnter={(e) => showTooltip("This page is still a draft. Only you can see it for now. It will become visible to collaborators after you add a title or start writing.", e)}
        onMouseLeave={hideTooltip}
        className="ml-1.5 flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[11px] font-semibold text-warning"
      >
        <Pencil size={10} />
        Draft
      </span>
      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </>
  );
}
