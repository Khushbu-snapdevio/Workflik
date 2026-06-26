"use client";

import {
 forwardRef, useEffect, useImperativeHandle, useRef, useState,
} from "react";
import { BLOCK_CATEGORIES, getBlocksByCategory, type BlockDefinition } from "./block-registry";
import type { SlashSuggestionProps } from "./extensions/slash-commands";

// ── Public handle so the TipTap extension can forward keyboard events ────────
export interface SlashMenuHandle {
 onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
 suggestionProps: SlashSuggestionProps;
}

export const SlashMenu = forwardRef<SlashMenuHandle, Props>(
 function SlashMenu({ suggestionProps }, ref) {
  const { items, command, query, clientRect } = suggestionProps;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedIdxRef = useRef(selectedIdx);
  selectedIdxRef.current = selectedIdx;

  // Reset selection when item list changes
  useEffect(() => { setSelectedIdx(0); }, [items]);

  // Position the popup under the "/" character
  const pos = clientRect?.() ?? null;

  // Expose keyboard handler to the TipTap extension
  useImperativeHandle(ref, () => ({
   onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
     setSelectedIdx((i) => Math.min(i + 1, items.length - 1));
     return true;
    }
    if (event.key === "ArrowUp") {
     setSelectedIdx((i) => Math.max(i - 1, 0));
     return true;
    }
    if (event.key === "Enter") {
     const def = items[selectedIdxRef.current];
     if (def) command(def);
     return true;
    }
    return false;
   },
  }), [items, command]);

  if (!items.length || !pos) return null;

  const grouped = !query
   ? BLOCK_CATEGORIES.map((cat) => ({ ...cat, blocks: getBlocksByCategory(cat.key).filter((d) => items.includes(d)) })).filter((c) => c.blocks.length)
   : null;

  // Flip above the cursor if there's not enough space below
  const MENU_HEIGHT = 304;
  const spaceBelow = typeof window !== "undefined" ? window.innerHeight - pos.bottom : 999;
  const menuTop = spaceBelow < MENU_HEIGHT + 16
    ? Math.max(8, pos.top - MENU_HEIGHT - 8)
    : pos.bottom + 8;

  // Keep menu from overflowing right edge
  const menuLeft = typeof window !== "undefined"
    ? Math.min(pos.left, window.innerWidth - 296)
    : pos.left;

  return (
   <div
    className="fixed z-[300] w-72 overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover"
    style={{ left: menuLeft, top: menuTop }}
   >
    {query && (
     <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
      Searching: <span className="font-medium text-foreground">/{query}</span>
     </div>
    )}

    <div className="max-h-72 overflow-y-auto py-1">
     {grouped ? (
      grouped.map((cat) => (
       <div key={cat.key}>
        <p className="px-3 pb-0.5 pt-2 text-xs font-semibold tracking-wide text-muted-foreground/60">
         {cat.label}
        </p>
        {cat.blocks.map((def) => (
         <MenuItem
          key={def.type}
          def={def}
          selected={items.indexOf(def) === selectedIdx}
          onClick={() => command(def)}
         />
        ))}
       </div>
      ))
     ) : (
      items.map((def, i) => (
       <MenuItem
        key={def.type}
        def={def}
        selected={i === selectedIdx}
        onClick={() => command(def)}
       />
      ))
     )}
    </div>
   </div>
  );
 },
);

function MenuItem({ def, selected, onClick }: { def: BlockDefinition; selected: boolean; onClick: () => void }) {
 const ref = useRef<HTMLButtonElement>(null);
 useEffect(() => {
  if (selected) ref.current?.scrollIntoView({ block: "nearest" });
 }, [selected]);

 return (
  <button
   ref={ref}
   type="button"
   onMouseDown={(e) => e.preventDefault()}
   onClick={onClick}
   className={[
    "flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors",
    selected ? "bg-accent" : "hover:bg-accent",
   ].join(" ")}
  >
   <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background text-xs font-medium">
    {def.icon}
   </span>
   <div className="min-w-0">
    <p className="text-sm font-medium text-foreground">{def.label}</p>
    <p className="truncate text-xs text-muted-foreground">{def.description}</p>
   </div>
  </button>
 );
}
