"use client";

import { getClampedLeft } from "@/lib/ui/clamp-to-viewport";

const GAP    = 6;
const MARGIN = 8;

// Notion-style reaction hover card — a large emoji preview above the "X
// reacted with 😀" caption. Kept separate from the plain single-line
// IconTooltip (used for every other hover label in the app) since only
// reaction badges need the bigger emoji preview; positioning logic mirrors
// IconTooltip's above-by-default / flip-below-if-no-room behavior.
export function ReactionTooltip({ rect, emoji, label, who }: { rect: DOMRect; emoji: string; label: string; who?: string }) {
  const estimatedWidth  = Math.min(220, Math.max(90, label.length * 6 + 24));
  const estimatedHeight = 56;
  const centeredLeft = rect.left + rect.width / 2 - estimatedWidth / 2;

  const left = getClampedLeft(
    { top: rect.top, bottom: rect.bottom, left: centeredLeft, right: centeredLeft + estimatedWidth },
    estimatedWidth,
  );

  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const above = rect.top - GAP - estimatedHeight;
  const below = rect.bottom + GAP;
  const top = above >= MARGIN ? above : Math.min(below, vh - MARGIN - estimatedHeight);

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        width: estimatedWidth,
        // Primary-tinted, not flat var(--popover) white — ties this to the
        // same accent color the reaction badge itself uses (bg-primary/10
        // when it's your own reaction), so the hover card reads as part of
        // the same color language instead of a plain generic tooltip.
        background: "color-mix(in srgb, var(--primary) 8%, var(--popover))",
        color: "var(--popover-foreground)",
        border: "1px solid color-mix(in srgb, var(--primary) 25%, var(--border))",
        borderRadius: "var(--radius-md)",
        padding: "8px 10px",
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</div>
      <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.3, whiteSpace: "normal" }}>
        {who ? (
          <>
            <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{who}</span>
            <span style={{ fontWeight: 500, color: "var(--muted-foreground)" }}> reacted with {emoji}</span>
          </>
        ) : (
          <span style={{ fontWeight: 500 }}>{label}</span>
        )}
      </div>
    </div>
  );
}
