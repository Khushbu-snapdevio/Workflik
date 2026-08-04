"use client";

import { createPortal } from "react-dom";
import { Link } from "lucide-react";
import { toast } from "sonner";
import { usePagePrivacy } from "@/components/pages/page-privacy-context";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";

interface Props {
  pageId: string;
}

// Warns instead of a plain toast when the page is invite-only; "Give access"
// opens ShareButton's panel via a window event since it's a sibling component.
export function CopyLinkButton({ pageId }: Props) {
  const { isPrivate } = usePagePrivacy();
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    hideTooltip();

    if (isPrivate) {
      toast.warning("Link copied, but only you can open it", {
        description: "Give people access before sharing.",
        position: "bottom-center",
        duration: 6000,
        action: {
          label: "Give access",
          onClick: () => window.dispatchEvent(new CustomEvent("workflik:open-share", { detail: { pageId } })),
        },
      });
    } else {
      toast.success("Link copied to clipboard", {
        position: "bottom-center",
        duration: 2500,
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        onMouseEnter={(e) => showTooltip("Copy link", e)}
        onMouseLeave={hideTooltip}
        className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Link size={15} />
      </button>

      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </>
  );
}
