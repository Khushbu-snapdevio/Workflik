"use client";

// Small custom-styled tooltip matching the one used in table view's cell
// action overlay (bg-popover/border, no shadow) — kept separate from the
// shadcn Tooltip primitive, which uses an inverted dark-pill style that
// doesn't match this app's design system.
export function IconTooltip({ rect, label }: { rect: DOMRect; label: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
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
