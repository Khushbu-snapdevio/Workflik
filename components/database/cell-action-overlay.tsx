"use client";

import { useState } from "react";
import { MessageSquare, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface CellActionOverlayProps {
  rect: DOMRect;
  propType: string;
  commentCount: number | null;
  copied: boolean;
  onClearLeaveTimer: () => void;
  onScheduleLeave: () => void;
  onCommentClick: (btnRect: DOMRect) => void;
  onCopyClick: () => void;
}

export function CellActionOverlay({
  rect, propType, commentCount, copied,
  onClearLeaveTimer, onScheduleLeave, onCommentClick, onCopyClick,
}: CellActionOverlayProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", cursor: "pointer", background: "transparent",
    borderRadius: 4, color: "hsl(var(--muted-foreground) / 0.7)",
  };

  function showTooltip(e: React.MouseEvent, label: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
    setTooltip(label);
  }

  function hideTooltip() {
    setTooltip(null);
    setTooltipPos(null);
  }

  return (
    <>
      {/* Overlay bar — pointerEvents:none so the gradient area doesn't block
          clicks on the cell underneath. Only the buttons re-enable events. */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.right,
          transform: "translateX(-100%)",
          height: rect.height,
          display: "flex",
          alignItems: "center",
          gap: 2,
          paddingLeft: 32,
          paddingRight: 6,
          background: "linear-gradient(to left, hsl(var(--muted) / 1) 50%, transparent)",
          zIndex: 200,
          pointerEvents: "none",
        }}
      >
        {/* Buttons wrapper — re-enables pointer events and owns enter/leave */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 2, pointerEvents: "auto" }}
          onMouseEnter={onClearLeaveTimer}
          onMouseLeave={() => { hideTooltip(); onScheduleLeave(); }}
        >
          {/* Comment button */}
          <button
            type="button"
            style={{ ...btnBase, height: 20, gap: 2, padding: "0 4px" }}
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick((e.currentTarget as HTMLElement).getBoundingClientRect());
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent))";
              (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
              showTooltip(e, "Comment");
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground) / 0.7)";
              hideTooltip();
            }}
          >
            <MessageSquare size={13} />
            {commentCount !== null && commentCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{commentCount}</span>
            )}
          </button>

          {/* Copy button — date/number only */}
          {(propType === "date" || propType === "number") && (
            <button
              type="button"
              style={{ ...btnBase, width: 20, height: 20, color: copied ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.7)" }}
              onClick={(e) => {
                e.stopPropagation();
                onCopyClick();
                toast.success("Copied to clipboard", { duration: 2000 });
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent))";
                  (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                }
                showTooltip(e, copied ? "Copied!" : "Copy value");
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = copied ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.7)";
                hideTooltip();
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && tooltipPos && (
        <div
          style={{
            position: "fixed",
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
            padding: "3px 8px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          }}
        >
          {tooltip}
        </div>
      )}
    </>
  );
}
