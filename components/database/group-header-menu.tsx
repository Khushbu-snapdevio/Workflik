"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings2, EyeOff, Trash2 } from "lucide-react";
import { getClampedTop } from "@/lib/ui/clamp-to-viewport";

interface GroupHeaderMenuProps {
  /** Called on open AND on every scroll/resize, so the menu tracks its anchor
   *  instead of freezing at the coordinates from the moment it opened. */
  getAnchorRect: () => DOMRect;
  hideAggregation: boolean;
  /** False for Checkbox/Person groups — their columns are derived (fixed
   *  true/false, or whoever's actually assigned), not a user-owned option
   *  list, so "Edit groups" (rename/recolor/reorder options) and "Move to
   *  Trash" (delete an option) don't apply — Hide/aggregation still do. */
  editable?: boolean;
  onEditGroups: () => void;
  onToggleHideAggregation: () => void;
  onHideGroup: () => void;
  onDeleteGroup: () => void;
  onClose: () => void;
}

export function GroupHeaderMenu({
  getAnchorRect, hideAggregation, editable = true, onEditGroups, onToggleHideAggregation, onHideGroup, onDeleteGroup, onClose,
}: GroupHeaderMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect>(getAnchorRect);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    function reposition() { setAnchorRect(getAnchorRect()); }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [getAnchorRect]);

  if (typeof document === "undefined") return null;

  const winW = window.innerWidth;
  const width = 200;
  const left = Math.max(8, Math.min(anchorRect.left, winW - width - 8));
  const top = getClampedTop(anchorRect, 180, { gap: 4 });

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top, left, width, zIndex: 300 }}
      className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background p-1.5"
    >
      {editable && (
        <button
          onClick={() => { onEditGroups(); onClose(); }}
          className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-foreground hover:bg-accent"
        >
          <Settings2 size={13} /> Edit groups
        </button>
      )}
      <button
        onClick={() => { onToggleHideAggregation(); onClose(); }}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-foreground hover:bg-accent"
      >
        <EyeOff size={13} /> {hideAggregation ? "Show aggregation" : "Hide aggregation"}
      </button>
      <button
        onClick={() => { onHideGroup(); onClose(); }}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-foreground hover:bg-accent"
      >
        <EyeOff size={13} /> Hide group
      </button>
      {editable && (
        <>
          <div className="my-1 h-px bg-border/60" />
          <button
            onClick={() => { onDeleteGroup(); onClose(); }}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-destructive transition-colors duration-150 hover:bg-destructive/5"
          >
            <Trash2 size={13} /> Move to Trash
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
