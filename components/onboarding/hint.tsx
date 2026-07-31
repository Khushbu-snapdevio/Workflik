"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useHints } from "./hint-provider";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";

interface Props {
  hintKey:  string;
  children: React.ReactNode;
  icon?:    string;
}

export function Hint({ hintKey, children, icon = "💡" }: Props) {
  const { isDismissed, dismiss } = useHints();
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  if (isDismissed(hintKey)) return null;

  return (
    <div className="group flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
      <span className="mt-px shrink-0 text-base leading-none">{icon}</span>
      <span className="flex-1 leading-relaxed">{children}</span>
      <button
        type="button"
        onClick={() => dismiss(hintKey)}
        onMouseEnter={(e) => showTooltip("Dismiss", e)}
        onMouseLeave={hideTooltip}
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-foreground"
      >
        <X size={10} />
      </button>

      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </div>
  );
}
