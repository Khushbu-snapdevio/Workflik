"use client";

import { getClampedLeft, getClampedTop } from "@/lib/ui/clamp-to-viewport";

// Small custom-styled tooltip matching the one used in table view's cell
// action overlay (bg-popover/border, no shadow) — kept separate from the
// shadcn Tooltip primitive, which uses an inverted dark-pill style that
// doesn't match this app's design system.
export function IconTooltip({ rect, label }: { rect: DOMRect; label: string }) {
  const estimatedWidth = Math.min(200, Math.max(32, label.length * 6 + 16));
  const estimatedHeight = 28;
  const centeredLeft = rect.left + rect.width / 2 - estimatedWidth / 2;

  const left = getClampedLeft(
    { top: rect.top, bottom: rect.bottom, left: centeredLeft, right: centeredLeft + estimatedWidth },
    estimatedWidth,
  );
  const top = getClampedTop(rect, estimatedHeight);

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        background: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "1px solid var(--border)",
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {label}
    </div>
  );
}
