"use client";

import {
 forwardRef, useEffect, useImperativeHandle, useRef, useState,
} from "react";
import { exitSuggestion } from "@tiptap/suggestion";
import { BLOCK_CATEGORIES, getBlocksByCategory, type BlockDefinition } from "./block-registry";
import { SLASH_COMMANDS_PLUGIN_KEY, type SlashSuggestionProps } from "./extensions/slash-commands";

// ── Public handle so the TipTap extension can forward keyboard events ────────
export interface SlashMenuHandle {
 onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
 suggestionProps: SlashSuggestionProps;
}

export const SlashMenu = forwardRef<SlashMenuHandle, Props>(
 function SlashMenu({ suggestionProps }, ref) {
  const { items, command, query, clientRect, editor } = suggestionProps;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedIdxRef = useRef(selectedIdx);
  selectedIdxRef.current = selectedIdx;
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset selection when item list changes
  useEffect(() => { setSelectedIdx(0); }, [items]);

  // Same reasoning as MentionList: this popup is `position: fixed`, outside
  // the editor's own DOM, so ProseMirror's Suggestion plugin never sees a
  // click elsewhere on the page as a reason to re-evaluate and exit. Dispatch
  // the plugin's own exit transaction directly instead of waiting for that.
  useEffect(() => {
   function handleMouseDown(e: MouseEvent) {
    if (containerRef.current?.contains(e.target as Node)) return;
    exitSuggestion(editor.view, SLASH_COMMANDS_PLUGIN_KEY);
   }
   document.addEventListener("mousedown", handleMouseDown);
   return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [editor]);

  // Scrolling doesn't re-render, so the popup would stay glued to its old
  // position; close it on any ancestor scroll instead (capture-phase).
  useEffect(() => {
   function handleScroll(e: Event) {
    if (containerRef.current?.contains(e.target as Node)) return;
    exitSuggestion(editor.view, SLASH_COMMANDS_PLUGIN_KEY);
   }
   window.addEventListener("scroll", handleScroll, true);
   return () => window.removeEventListener("scroll", handleScroll, true);
  }, [editor]);

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
    ref={containerRef}
    className="fixed z-300 w-72 overflow-hidden rounded-md border border-border bg-popover"
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
        <p className="px-3 pb-0.5 pt-2 text-xs font-semibold tracking-wide text-muted-foreground">
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
   <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-xs font-medium">
    {def.icon}
   </span>
   <div className="min-w-0">
    <p className="text-sm font-medium text-foreground">{def.label}</p>
    <p className="truncate text-xs text-muted-foreground">{def.description}</p>
   </div>
  </button>
 );
}
