"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Slice, Fragment } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { Copy, GripVertical, Plus, Trash2, MessageSquare } from "lucide-react";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";

interface BlockInfo {
 top:   number;
 left:   number;
 nodePos: number;
 nodeSize: number;
}

// Resolve which top-level block the mouse is over.
// Regular (contentEditable) blocks: posAtCoords works fine.
// Atom blocks (image, video, audio, file — contentEditable=false): posAtCoords
// returns null, so we fall back to elementFromPoint + DOM traversal.
function resolveBlock(e: MouseEvent, editor: Editor): BlockInfo | null {
 const editorEl = editor.view.dom as HTMLElement;
 const er    = editorEl.getBoundingClientRect();

 try {
  // ── Primary path: posAtCoords (works for text blocks) ──
  const posObj = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });

  if (posObj) {
   let $pos;
   try { $pos = editor.state.doc.resolve(posObj.pos); } catch { /* skip */ }

   if ($pos && $pos.depth >= 1) {
    const nodePos = $pos.before(1);
    const node  = editor.state.doc.nodeAt(nodePos);
    if (node) {
     const domInfo = editor.view.domAtPos(nodePos + 1);
     let domNode  = domInfo.node as HTMLElement;
     if (domNode.nodeType === Node.TEXT_NODE) domNode = domNode.parentElement!;
     while (domNode.parentElement && domNode.parentElement !== editorEl) {
      domNode = domNode.parentElement;
     }
     const br = domNode.getBoundingClientRect();
     return {
      top:   br.top + br.height / 2,
      left:   er.left - 56,
      nodePos,
      nodeSize: node.nodeSize,
     };
    }
   }

   // posAtCoords returned something but depth was 0 — fall through to DOM path
  }

  // ── Fallback path: DOM traversal (works for atom/contentEditable=false blocks) ──
  let el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
  if (!el) return null;

  // Walk up until we find a direct child of the editor element
  while (el && el.parentElement !== editorEl) {
   el = el.parentElement;
  }
  if (!el || el === editorEl) return null;

  // posAtDOM gives the document position just before this DOM node's content
  const rawPos = editor.view.posAtDOM(el, 0);
  // rawPos is the position inside the node; nodePos = position before the node
  const nodePos = Math.max(0, rawPos - 1);
  const node  = editor.state.doc.nodeAt(nodePos);
  if (!node) return null;

  const br = el.getBoundingClientRect();
  return {
   top:   br.top + br.height / 2,
   left:   er.left - 56,
   nodePos,
   nodeSize: node.nodeSize,
  };
 } catch {
  return null;
 }
}

// Re-measures the on-screen rect of an already-resolved block by its document
// position, rather than the mouse coordinates that first found it. Used to
// keep the handle glued to its block while scrolling, since scrolling doesn't
// fire mousemove and would otherwise leave the fixed-position handle stuck at
// its last known coordinates while the block scrolls away underneath it.
function getBlockRect(editor: Editor, nodePos: number): { top: number; left: number } | null {
 try {
  const editorEl = editor.view.dom as HTMLElement;
  const er    = editorEl.getBoundingClientRect();
  const domInfo = editor.view.domAtPos(nodePos + 1);
  let domNode  = domInfo.node as HTMLElement;
  if (domNode.nodeType === Node.TEXT_NODE) domNode = domNode.parentElement!;
  while (domNode.parentElement && domNode.parentElement !== editorEl) {
   domNode = domNode.parentElement;
  }
  const br = domNode.getBoundingClientRect();
  return { top: br.top + br.height / 2, left: er.left - 56 };
 } catch {
  return null;
 }
}

export function BlockHandle({ editor, onComment }: { editor: Editor; onComment?: (nodePos: number, absoluteY: number) => void }) {
 const [block, setBlock]    = useState<BlockInfo | null>(null);
 const [menuOpen, setMenuOpen] = useState(false);

 const menuOpenRef  = useRef(false);
 const dropdownRef  = useRef<HTMLDivElement>(null);
 const triggerRef   = useRef<HTMLButtonElement>(null);
 const hideTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 // Tracks whether the last interaction was a drag so we don't also open the menu.
 const wasDragRef   = useRef(false);

 useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

 // ── Document mousemove ────────────────────────────────────────────────────
 useEffect(() => {
  const onMove = (e: MouseEvent) => {
   if (menuOpenRef.current) return;

   const editorEl = editor.view.dom as HTMLElement;
   const er    = editorEl.getBoundingClientRect();

   const inSafeZone = (
    e.clientX >= er.left - 90 &&
    e.clientX <= er.right   &&
    e.clientY >= er.top - 10 &&
    e.clientY <= er.bottom + 10
   );

   if (!inSafeZone) {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
     if (!menuOpenRef.current) setBlock(null);
    }, 600);
    return;
   }

   clearTimeout(hideTimer.current);

   // Only reposition when cursor is over the actual editor area
   const overEditor = (
    e.clientX >= er.left && e.clientX <= er.right &&
    e.clientY >= er.top && e.clientY <= er.bottom
   );
   if (!overEditor) return;

   const info = resolveBlock(e, editor);
   if (info) setBlock(info);
  };

  document.addEventListener("mousemove", onMove);
  return () => {
   document.removeEventListener("mousemove", onMove);
   clearTimeout(hideTimer.current);
  };
 }, [editor]);

 // ── Keep the handle glued to its block while scrolling ────────────────────
 // Scroll events don't fire mousemove, and the handle's ancestor scroll
 // containers (e.g. #page-scroll-container) don't bubble scroll to window,
 // so listen with capture on document to catch scrolling on any ancestor.
 useEffect(() => {
  const onScroll = () => {
   if (menuOpenRef.current) return;
   setBlock((prev) => {
    if (!prev) return prev;
    const rect = getBlockRect(editor, prev.nodePos);
    if (!rect) return null;

    const editorEl = editor.view.dom as HTMLElement;
    const er   = editorEl.getBoundingClientRect();
    if (rect.top < er.top - 10 || rect.top > er.bottom + 10) return null;

    return { ...prev, top: rect.top, left: rect.left };
   });
  };

  document.addEventListener("scroll", onScroll, true);
  return () => document.removeEventListener("scroll", onScroll, true);
 }, [editor]);

 // ── Outside-click closes dropdown ─────────────────────────────────────────
 useEffect(() => {
  if (!menuOpen) return;
  const close = (e: MouseEvent) => {
   if (triggerRef.current?.contains(e.target as Node)) return;
   if (dropdownRef.current?.contains(e.target as Node)) return;
   setMenuOpen(false);
  };
  document.addEventListener("mousedown", close);
  return () => document.removeEventListener("mousedown", close);
 }, [menuOpen]);

 // The grip's mousemove tracker deliberately stops updating `block` while the
 // dropdown is open (see the early return above), so its `position: fixed`
 // coordinates would otherwise go stale as soon as the document scrolls. Lock
 // scroll instead of trying to track position without a live mousemove.
 useScrollLockWhileOpen(menuOpen, (target) =>
  !!dropdownRef.current?.contains(target) || !!triggerRef.current?.contains(target));

 // ── Block actions ─────────────────────────────────────────────────────────
 const deleteBlock = useCallback(() => {
  if (!block) return;
  const { nodePos, nodeSize } = block;
  setMenuOpen(false);
  setBlock(null);
  editor.commands.command(({ tr }) => {
   tr.delete(nodePos, nodePos + nodeSize);
   return true;
  });
 }, [editor, block]);

 const duplicateBlock = useCallback(() => {
  if (!block) return;
  const node = editor.state.doc.nodeAt(block.nodePos);
  if (!node) return;
  setMenuOpen(false);
  editor.commands.command(({ tr }) => {
   tr.insert(block.nodePos + block.nodeSize, node);
   return true;
  });
 }, [editor, block]);

 const commentBlock = useCallback(() => {
  if (!block || !onComment) return;
  setMenuOpen(false);
  onComment(block.nodePos, block.top);
 }, [block, onComment]);

 // Inserts a fresh paragraph right after this block, moves the cursor into
 // it, then types "/" — reusing the existing slash-command Suggestion
 // plugin (character-triggered) instead of a separate imperative "open
 // menu" API, so the "+" button and typing "/" always behave identically.
 const addBlockBelow = useCallback(() => {
  if (!block) return;
  const { nodePos, nodeSize } = block;
  setMenuOpen(false);
  const insertPos = nodePos + nodeSize;
  editor
   .chain()
   .focus()
   .insertContentAt(insertPos, { type: "paragraph" })
   .setTextSelection(insertPos + 1)
   .insertContent("/")
   .run();
 }, [editor, block]);

 // ── Drag handlers ─────────────────────────────────────────────────────────
 const handleDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
  if (!block) { e.preventDefault(); return; }

  const view = editor.view;
  const node = view.state.doc.nodeAt(block.nodePos);
  if (!node) { e.preventDefault(); return; }

  wasDragRef.current = true;

  // Select the source node so ProseMirror's drop handler knows what to delete.
  // The drop handler calls tr.deleteSelection() when move=true, so the selection
  // must point at the block being dragged.
  const nodeSel = NodeSelection.create(view.state.doc, block.nodePos);
  view.dispatch(view.state.tr.setSelection(nodeSel).setMeta("addToHistory", false));

  // Re-focus the editor: pressing mousedown on the grip button (rendered in a
  // portal outside the editor DOM) steals browser focus. ProseMirror's drop
  // handler only performs the source deletion when editorOwnsSelection() returns
  // true, which requires view.hasFocus(). Without this the block gets copied
  // instead of moved.
  view.dom.focus();

  const slice = new Slice(Fragment.from(node), 0, 0);
  (view as any).dragging = { slice, move: true };

  e.dataTransfer.effectAllowed = "move";

  // Minimal ghost image so the browser doesn't try to snapshot the portal element.
  const ghost = document.createElement("div");
  ghost.style.cssText =
   "position:absolute;top:-9999px;left:-9999px;" +
   "background:#fff;border:1px solid #e2e8f0;border-radius:6px;" +
   "padding:4px 10px;font-size:13px;color:#374151;" +
   "max-width:260px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;";
  ghost.textContent = node.textContent.trim().slice(0, 80) || "Block";
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 12, 12);
  requestAnimationFrame(() => ghost.remove());
 }, [block, editor]);

 const handleDragEnd = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
  // If the drag was cancelled (Escape / drop outside editor), clear manually.
  if (e.dataTransfer.dropEffect === "none") {
   (editor.view as any).dragging = null;
  }
  setTimeout(() => { wasDragRef.current = false; }, 100);
 }, [editor]);

 if (!block || typeof document === "undefined") return null;

 return createPortal(
  <div
   style={{
    position: "fixed",
    top:    block.top,
    left:   block.left,
    transform: "translateY(-50%)",
    zIndex:  9999,
    display:  "flex",
    alignItems: "center",
   }}
  >
   {/* + — insert a new block right below this one and open the block-type menu */}
   <button
    type="button"
    onMouseDown={(e) => e.stopPropagation()}
    onClick={addBlockBelow}
    title="Add block below"
    className="flex h-6 w-5 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/60 transition-colors duration-150 hover:bg-accent hover:text-muted-foreground"
   >
    <Plus size={14} />
   </button>

   {/* ⠿ grip — drag to reorder, click to open block menu */}
   <button
    ref={triggerRef}
    type="button"
    draggable
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
    onMouseDown={(e) => {
     // Do NOT preventDefault here — it blocks the browser's dragstart sequence.
     // Editor focus is restored automatically after drag ends.
     e.stopPropagation();
    }}
    onClick={() => {
     // Ignore click if it was the tail-end of a drag interaction.
     if (wasDragRef.current) return;
     setMenuOpen((v) => !v);
    }}
    title="Drag to reorder · Click for options"
    className="flex h-6 w-5 cursor-grab items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/60 transition-colors duration-150 hover:bg-accent hover:text-muted-foreground active:cursor-grabbing"
   >
    <GripVertical size={14} />
   </button>

   {/* Dropdown */}
   {menuOpen && (
    <div
     ref={dropdownRef}
     className="absolute left-6 top-0 w-44 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-popover"
     style={{ zIndex: 9999 }}
    >
     <div className="py-1">
      {onComment && (
       <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commentBlock}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-accent"
       >
        <MessageSquare size={14} className="shrink-0 text-muted-foreground" />
        Comment
       </button>
      )}

      <button
       type="button"
       onMouseDown={(e) => e.preventDefault()}
       onClick={duplicateBlock}
       className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
      >
       <Copy size={14} className="shrink-0 text-muted-foreground" />
       Duplicate
      </button>

      <div className="mx-2 my-0.5 h-px bg-border" />

      <button
       type="button"
       onMouseDown={(e) => e.preventDefault()}
       onClick={deleteBlock}
       className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors duration-150 hover:bg-destructive/10"
      >
       <Trash2 size={14} className="shrink-0" />
       Delete
      </button>
     </div>
    </div>
   )}
  </div>,
  document.body,
 );
}
