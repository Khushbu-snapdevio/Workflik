"use client";

import { useEffect, useState } from "react";

export interface HoverTooltipState {
  label: string;
  rect: DOMRect;
  // Set only for reaction-badge tooltips — lets the render site show a large
  // emoji preview above the caption (Notion-style), instead of the plain
  // single-line label every other hover tooltip in the app uses.
  emoji?: string;
  // The "who reacted" name portion alone (e.g. "Khushbu Pambhar"), rendered
  // bold/highlighted by ReactionTooltip while the rest of the sentence
  // ("reacted with 😀") stays a plain muted caption — matches Notion's own
  // reaction tooltip styling.
  who?: string;
}

// Shared state for the app's hover-triggered IconTooltip portals (a bare
// `position: fixed` box snapshotted from getBoundingClientRect() at
// mouseenter) — dismisses on scroll instead of drifting, matching every
// other hover overlay in the app. Use in place of a native `title=`
// attribute, which renders an unstyled OS tooltip that ignores the app's
// light/dark theme.
export function useHoverTooltip() {
  const [tooltip, setTooltip] = useState<HoverTooltipState | null>(null);

  useEffect(() => {
    if (!tooltip) return;
    function handleScroll() { setTooltip(null); }
    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, [tooltip]);

  function showTooltip(label: string, e: React.MouseEvent<HTMLElement>, emoji?: string, who?: string) {
    setTooltip({ label, rect: e.currentTarget.getBoundingClientRect(), emoji, who });
  }
  function hideTooltip() {
    setTooltip(null);
  }

  return { tooltip, showTooltip, hideTooltip };
}
