"use client";

import { getClampedLeft } from "@/lib/ui/clamp-to-viewport";

const GAP  = 6;
const MARGIN = 8;

// Custom tooltip (kept separate from shadcn Tooltip's dark-pill style) that positions above by default,
// flipping below only when there's no room — `placement="below"` opts in for top-of-list anchors.
export function IconTooltip({ rect, label, placement = "above", minLeft }: { rect: DOMRect; label: string; placement?: "above" | "below"; minLeft?: number }) {
  const estimatedWidth = Math.min(200, Math.max(32, label.length * 6 + 16));
  const estimatedHeight = 28;
  const centeredLeft = rect.left + rect.width / 2 - estimatedWidth / 2;

  let left = getClampedLeft(
    { top: rect.top, bottom: rect.bottom, left: centeredLeft, right: centeredLeft + estimatedWidth },
    estimatedWidth,
  );
  // getClampedLeft only keeps the tooltip inside the viewport — inside a
  // narrow fixed-position panel, centering on a small anchor can still spill
  // the (much wider) tooltip past the panel's own left edge. `minLeft` lets a
  // caller pass that panel boundary explicitly (see block-handle.tsx).
  if (minLeft !== undefined) left = Math.max(left, minLeft);

  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const above = rect.top - GAP - estimatedHeight;
  const below = rect.bottom + GAP;
  let top: number;
  if (placement === "below") {
    top = below + estimatedHeight <= vh - MARGIN ? below : Math.max(MARGIN, above);
  } else {
    top = above >= MARGIN ? above : Math.min(below, vh - MARGIN - estimatedHeight);
  }

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
