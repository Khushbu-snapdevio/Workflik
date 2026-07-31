"use client";

import { getClampedLeft } from "@/lib/ui/clamp-to-viewport";

const GAP  = 6;
const MARGIN = 8;

// Small custom-styled tooltip matching the one used in table view's cell
// action overlay (bg-popover/border, no shadow) — kept separate from the
// shadcn Tooltip primitive, which uses an inverted dark-pill style that
// doesn't match this app's design system.
//
// Positions above the anchor by default — the convention every hand-rolled
// hover label in this app follows (favorite/lock row icons, etc.) — and only
// drops below when there isn't room above. Deliberately doesn't reuse
// getClampedTop, which prefers *below* by default: that's the right call for
// the dropdown/menu popups it also positions, but wrong for a hover label.
//
// `placement="below"` flips that preference for anchors that sit at the top
// of a tightly-stacked list (e.g. a row's own hover actions) — "above" is
// technically inside the viewport there, but it visually lands on top of the
// previous row's content since there's no gap between rows for it to use.
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
