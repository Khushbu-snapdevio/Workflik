"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { DbBlock } from "./serializer";
import { onCommentsChanged } from "@/lib/comments/comment-events";
import { getClampedLeft } from "@/lib/ui/clamp-to-viewport";

const INDICATOR_WIDTH = 52;

interface BlockCount { blockId: string; count: number }
interface Indicator { blockId: string; count: number; top: number; left: number }

interface Props {
 pageId:    string;
 editor:    Editor;
 blocksRef:   React.MutableRefObject<DbBlock[]>;
 onOpen:    (blockId: string) => void;
 refresh:    number;
 activeBlockId: string | null;
}

export function CommentGutter({ pageId, editor, blocksRef, onOpen, refresh, activeBlockId }: Props) {
 const [counts,   setCounts]   = useState<BlockCount[]>([]);
 const [indicators, setIndicators] = useState<Indicator[]>([]);
 // Only the currently-hovered block's badge is shown — matching Notion,
 // where the indicator doesn't persist for every commented block, only the
 // one you're pointing at — instead of every commented block's badge
 // floating on screen all the time (including while scrolling, since these
 // are `position: fixed`).
 const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

 // Keep counts accessible inside stable callbacks without recreating them
 const countsRef = useRef<BlockCount[]>([]);
 countsRef.current = counts;

 // ── Fetch comment counts ──────────────────────────────────────────────────
 const fetchCounts = useCallback(() => {
  fetch(`/api/pages/${pageId}/comments`)
   .then((r) => r.json())
   .then((data) => {
    const map = new Map<string, number>();
    for (const t of (data.comments ?? []) as Array<{
     blockId: string | null;
     isResolved: boolean;
     deletedAt: string | null;
    }>) {
     if (t.blockId && !t.isResolved && !t.deletedAt) {
      map.set(t.blockId, (map.get(t.blockId) ?? 0) + 1);
     }
    }
    setCounts(Array.from(map.entries()).map(([blockId, count]) => ({ blockId, count })));
   })
   .catch(() => {});
 }, [pageId]);

 useEffect(() => {
  fetchCounts();
 }, [fetchCounts, refresh]);

 // Any comment mutation anywhere on this page updates the gutter badges
 // immediately instead of waiting for the card-close refresh bump.
 useEffect(() => onCommentsChanged(pageId, fetchCounts), [pageId, fetchCounts]);

 // ── Stable measure — reads counts from ref, never recreated on count change ──
 const measure = useCallback(() => {
  const currentCounts = countsRef.current;

  // If no comments at all, clear indicators
  if (currentCounts.length === 0) {
   setIndicators([]);
   return;
  }

  const editorEl = editor.view.dom as HTMLElement;
  const editorRect = editorEl.getBoundingClientRect();
  const rawLeft = editorRect.right + 16;
  const left = getClampedLeft(
   { top: editorRect.top, bottom: editorRect.bottom, left: rawLeft, right: rawLeft },
   INDICATOR_WIDTH,
  );
  const result: Indicator[] = [];

  const sorted = [...blocksRef.current].sort((a, b) => a.orderIndex - b.orderIndex);
  const idToIdx = new Map<string, number>(sorted.map((b, i) => [b.id, i]));

  for (const { blockId, count } of currentCounts) {
   const blockIdx = idToIdx.get(blockId);
   if (blockIdx === undefined) continue;

   // Find the document offset for the nth top-level block
   let nodeOffset: number | null = null;
   editor.state.doc.forEach((_node, offset, docIdx) => {
    if (docIdx === blockIdx) nodeOffset = offset;
   });
   if (nodeOffset === null) continue;

   try {
    const domInfo = editor.view.domAtPos(nodeOffset + 1);
    let el = domInfo.node as HTMLElement;
    if (el.nodeType === Node.TEXT_NODE) el = el.parentElement!;
    while (el.parentElement && el.parentElement !== editorEl) el = el.parentElement;
    const rect = el.getBoundingClientRect();
    const top = rect.top + rect.height / 2 - 10;
    // Don't render badges below the editor's bottom edge (avoids overlapping page-level comments)
    if (top > editorRect.bottom - 10) continue;
    result.push({ blockId, count, top, left });
   } catch { /* skip this block, don't wipe others */ }
  }

  // Only update indicators when we found something — never wipe on partial failure
  // (if result is empty here it means ALL blocks failed to measure — keep old positions)
  if (result.length > 0) {
   setIndicators(result);
  }
 }, [editor, blocksRef]); // counts is intentionally NOT a dep — we use countsRef

 // ── Re-measure whenever counts change ────────────────────────────────────
 useEffect(() => {
  // countsRef is already updated via the assignment above; run measure now
  measure();
 }, [counts, measure]);

 // ── Register stable event listeners (measure never changes) ──────────────
 useEffect(() => {
  // Use requestAnimationFrame to debounce rapid editor-update calls
  let rafId = 0;
  function debouncedMeasure() {
   cancelAnimationFrame(rafId);
   rafId = requestAnimationFrame(measure);
  }

  editor.on("update", debouncedMeasure);
  window.addEventListener("scroll", debouncedMeasure, { passive: true });
  window.addEventListener("resize", debouncedMeasure, { passive: true });

  // Initial measure
  measure();

  return () => {
   cancelAnimationFrame(rafId);
   editor.off("update", debouncedMeasure);
   window.removeEventListener("scroll", debouncedMeasure);
   window.removeEventListener("resize", debouncedMeasure);
  };
 }, [editor, measure]); // stable — measure doesn't change anymore

 // ── Track which block is currently hovered ────────────────────────────────
 // Mirrors block-handle.tsx's own resolveBlock/safe-zone approach: walk up
 // from the DOM element under the cursor to the editor's direct child, then
 // match that against the document's top-level children (in order) to find
 // which block it is. The safe zone extends past the editor's right edge to
 // cover the badge's own position, plus a short hide delay, so moving the
 // mouse from a block toward its badge doesn't hide it before it's clickable.
 useEffect(() => {
  const hideTimer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
  // Last real cursor position — scrolling moves content under a stationary
  // cursor without ever firing mousemove, so re-checking hover on scroll
  // needs a remembered point to re-resolve from.
  const lastPoint = { current: null as { x: number; y: number } | null };

  function resolveHoveredBlockId(x: number, y: number): string | null {
   const editorEl = editor.view.dom as HTMLElement;
   let el = document.elementFromPoint(x, y) as HTMLElement | null;
   if (!el) return null;
   while (el && el.parentElement !== editorEl) el = el.parentElement;
   if (!el || el === editorEl) return null;

   const sorted = [...blocksRef.current].sort((a, b) => a.orderIndex - b.orderIndex);
   let offset = 0;
   for (let i = 0; i < editor.state.doc.childCount; i++) {
    const child = editor.state.doc.child(i);
    if (editor.view.nodeDOM(offset) === el) return sorted[i]?.id ?? null;
    offset += child.nodeSize;
   }
   return null;
  }

  function updateHoverFromPoint(x: number, y: number) {
   const editorEl = editor.view.dom as HTMLElement;
   const er = editorEl.getBoundingClientRect();
   const inSafeZone = (
    x >= er.left &&
    x <= er.right + INDICATOR_WIDTH + 32 &&
    y >= er.top - 10 &&
    y <= er.bottom + 10
   );
   if (!inSafeZone) {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHoveredBlockId(null), 300);
    return;
   }
   clearTimeout(hideTimer.current);

   const overEditor = (
    x >= er.left && x <= er.right &&
    y >= er.top && y <= er.bottom
   );
   if (!overEditor) return; // hovering the gutter itself — keep last block active

   const id = resolveHoveredBlockId(x, y);
   if (id) setHoveredBlockId(id);
  }

  function onMove(e: MouseEvent) {
   lastPoint.current = { x: e.clientX, y: e.clientY };
   updateHoverFromPoint(e.clientX, e.clientY);
  }

  // Re-resolve on scroll from the last known cursor position — otherwise the
  // badge for whatever block happened to be under the cursor before the
  // scroll just rides along with that block's new position indefinitely,
  // looking "stuck" even though the cursor isn't over it anymore.
  let scrollRafId = 0;
  function onScroll() {
   cancelAnimationFrame(scrollRafId);
   scrollRafId = requestAnimationFrame(() => {
    if (lastPoint.current) updateHoverFromPoint(lastPoint.current.x, lastPoint.current.y);
   });
  }

  // The cursor can leave the browser window entirely (e.g. onto the OS
  // taskbar) without ever firing another mousemove inside it — mouseleave on
  // <html> is the reliable signal for that; the safe-zone/mousemove logic
  // above never re-fires once the cursor is gone, so the badge stayed
  // visible forever until the mouse came back and moved again.
  function onWindowLeave() {
   clearTimeout(hideTimer.current);
   setHoveredBlockId(null);
  }

  document.addEventListener("mousemove", onMove);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.documentElement.addEventListener("mouseleave", onWindowLeave);
  return () => {
   document.removeEventListener("mousemove", onMove);
   window.removeEventListener("scroll", onScroll);
   document.documentElement.removeEventListener("mouseleave", onWindowLeave);
   cancelAnimationFrame(scrollRafId);
   clearTimeout(hideTimer.current);
  };
 }, [editor, blocksRef]);

 // ── Render ────────────────────────────────────────────────────────────────
 const visible = indicators.filter((i) => i.blockId !== activeBlockId && i.blockId === hoveredBlockId);

 if (visible.length === 0 || typeof document === "undefined") return null;

 return createPortal(
  <>
   {visible.map(({ blockId, count, top, left }) => (
    <button
     key={blockId}
     type="button"
     onClick={() => onOpen(blockId)}
     style={{ position: "fixed", top, left, zIndex: 100 }}
     className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted border border-border rounded-[var(--radius-xs)] hover:bg-accent hover:text-foreground transition-colors duration-150"
    >
     <MessageSquare size={10} />
     {count}
    </button>
   ))}
  </>,
  document.body,
 );
}
