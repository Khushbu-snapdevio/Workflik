"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { DbBlock } from "./serializer";
import { onCommentsChanged } from "@/lib/comments/comment-events";

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
    result.push({ blockId, count, top, left: editorRect.right + 16 });
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

 // ── Render ────────────────────────────────────────────────────────────────
 const visible = indicators.filter((i) => i.blockId !== activeBlockId);

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
