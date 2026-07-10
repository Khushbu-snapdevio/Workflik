/**
 * Shared positioning math for the app's hand-rolled `position: fixed`
 * popups/menus (the ones anchored via `getBoundingClientRect()` instead of
 * a Radix/shadcn primitive). Without this, a popup opened near the edge of
 * the window renders partially or fully off-screen instead of flipping to
 * the side that actually has room.
 */

export interface AnchorRect {
  top:    number;
  left:   number;
  right:  number;
  bottom: number;
}

const DEFAULT_GAP    = 6;
const DEFAULT_MARGIN = 8;

/**
 * Vertical position for a popup anchored below `anchor`. Prefers opening
 * below (`anchor.bottom + gap`); flips above the anchor if it doesn't fit
 * below and there's more room above than below.
 */
export function getClampedTop(
  anchor: AnchorRect,
  popupHeight: number,
  { gap = DEFAULT_GAP, margin = DEFAULT_MARGIN }: { gap?: number; margin?: number } = {},
): number {
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  const below = anchor.bottom + gap;
  if (below + popupHeight <= vh - margin) return below;

  const spaceAbove = anchor.top;
  const spaceBelow = vh - anchor.bottom;
  if (spaceAbove > spaceBelow) {
    return Math.max(margin, anchor.top - gap - popupHeight);
  }
  return Math.max(margin, Math.min(below, vh - margin - popupHeight));
}

/**
 * Horizontal position for a popup anchored to `anchor`. `align: "start"`
 * lines the popup's left edge up with the anchor's left edge (the common
 * case); `align: "end"` lines the popup's right edge up with the anchor's
 * right edge. Either way the result is clamped so the popup never renders
 * past the left or right edge of the viewport.
 */
export function getClampedLeft(
  anchor: AnchorRect,
  popupWidth: number,
  { align = "start", margin = DEFAULT_MARGIN }: { align?: "start" | "end"; margin?: number } = {},
): number {
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;

  let left = align === "end" ? anchor.right - popupWidth : anchor.left;
  if (left + popupWidth > vw - margin) left = vw - margin - popupWidth;
  if (left < margin) left = margin;
  return left;
}

/** Convenience wrapper for popups that need both axes clamped at once. */
export function getClampedPosition(
  anchor: AnchorRect,
  size: { width: number; height: number },
  opts: { gap?: number; margin?: number; align?: "start" | "end" } = {},
): { top: number; left: number } {
  return {
    top:  getClampedTop(anchor, size.height, opts),
    left: getClampedLeft(anchor, size.width, opts),
  };
}
