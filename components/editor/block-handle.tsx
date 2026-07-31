"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Slice, Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { Copy, GripVertical, Plus, Trash2, MessageSquare } from "lucide-react";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";

interface BlockInfo {
 top:   number;
 left:   number;
 // True when the editor sits inside a narrow fixed-position panel (e.g. the
 // database entry side panel) that doesn't have the ~58px of margin the full
 // "+" and grip pair needs — see computeHandleLeft below. Drives hiding the
 // "+" button so the remaining grip alone still fits without covering text.
 compact: boolean;
 // Grip button's rendered size in px — GRIP_W normally, shrunk down when even
 // the compact single-grip layout doesn't have GRIP_W + 2*EDGE_GAP to spare
 // (see computeHandleLeft).
 gripSize: number;
 nodePos: number;
 nodeSize: number;
}

const GRIP_W = 20;
const MIN_GRIP = 10; // smallest the grip will shrink to before it'd be too small to hit
const EDGE_GAP = 2;  // breathing room kept from both the boundary and the block's own text

// The handle normally sits 58px left of the editor to clear the text column
// (room for both the "+" and grip buttons), which assumes a full-width page
// with margin to spare. Inside a narrow fixed-position panel (e.g. the
// database entry side panel), that margin doesn't exist and anchoring 58px
// out would push the handle past the panel's own left edge and over whatever
// is behind it.
//
// Two earlier passes at this fix each missed one boundary: clamping only to
// the panel's own edge let the handle land on top of the block's text, and
// clamping to the block's text edge instead let it land on top of an inner
// bordered card's own edge (e.g. the entry side panel wraps its editor in a
// bordered "Content" card, which has less padding than the panel itself).
// Walk up collecting *every* ancestor that visually bounds the handle — a
// `position: fixed` panel root, or any ancestor with a visible left border —
// and use whichever is most restrictive (furthest right). Stop at the fixed
// ancestor since nothing further out than the panel root can matter.
function getHandleLeftBoundary(editorEl: HTMLElement): { boundary: number; compact: boolean } {
 let boundary = 8; // fallback: viewport margin, used when nothing constrains us
 let compact = false;
 let el: HTMLElement | null = editorEl.parentElement;
 while (el && el !== document.body) {
  const cs = getComputedStyle(el);
  const isFixed = cs.position === "fixed";
  const borderW = parseFloat(cs.borderLeftWidth) || 0;
  const hasLeftBorder = borderW > 0 && cs.borderLeftStyle !== "none";
  if (isFixed || hasLeftBorder) {
   const rect = el.getBoundingClientRect();
   const edge = isFixed ? rect.left + 8 : rect.left + borderW;
   if (!compact || edge > boundary) boundary = edge;
   compact = true;
  }
  if (isFixed) break;
  el = el.parentElement;
 }
 return { boundary, compact };
}

function computeHandleLeft(editorEl: HTMLElement, blockLeft: number): { left: number; compact: boolean; gripSize: number } {
 const { boundary, compact } = getHandleLeftBoundary(editorEl);
 if (!compact) {
  return { left: Math.max(blockLeft - 58, boundary), compact: false, gripSize: GRIP_W };
 }
 // Compact mode: only the grip renders. Size it to whatever fits between the
 // boundary and the text with EDGE_GAP to spare on each side — shrinking
 // below GRIP_W rather than crossing either line — and position it flush
 // against the text minus that same gap, which by construction never crosses
 // the boundary either.
 const available = blockLeft - boundary;
 const gripSize = Math.min(GRIP_W, Math.max(MIN_GRIP, available - EDGE_GAP * 2));
 return { left: blockLeft - EDGE_GAP - gripSize, compact: true, gripSize };
}

// Resolve which top-level block the mouse is over, via DOM traversal rather
// than posAtCoords/posAtDOM. Both of those DOM->position APIs interpolate
// from the nearest indexable *text* position — for atom/contentEditable=false
// NodeViews (image, video, audio, file), which have no editable content of
// their own, that resolution is ambiguous and in practice snaps forward into
// the position just inside the *next* node instead of the atom itself. So
// instead of asking "what position is under this DOM node", we go the other
// way: walk the document's top-level children and ask the view for *their*
// DOM node (view.nodeDOM), which is unambiguous for every block type,
// including atoms, and stop at the one that matches what's under the cursor.
function resolveBlock(e: MouseEvent, editor: Editor): BlockInfo | null {
 const editorEl = editor.view.dom as HTMLElement;
 const er    = editorEl.getBoundingClientRect();

 try {
  let el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
  if (!el) return null;

  // Walk up until we find a direct child of the editor element
  while (el && el.parentElement !== editorEl) {
   el = el.parentElement;
  }
  if (!el || el === editorEl) return null;

  let nodePos = -1;
  let node: PMNode | null = null;
  let offset = 0;
  for (let i = 0; i < editor.state.doc.childCount; i++) {
   const child = editor.state.doc.child(i);
   if (editor.view.nodeDOM(offset) === el) {
    nodePos = offset;
    node = child;
    break;
   }
   offset += child.nodeSize;
  }
  if (nodePos === -1 || !node) return null;

  const br = el.getBoundingClientRect();
  const { left, compact, gripSize } = computeHandleLeft(editorEl, er.left);
  return {
   top:   br.top + br.height / 2,
   left,
   compact,
   gripSize,
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
  return { top: br.top + br.height / 2, left: computeHandleLeft(editorEl, er.left).left };
 } catch {
  return null;
 }
}

export function BlockHandle({ editor, onComment }: { editor: Editor; onComment?: (nodePos: number, absoluteY: number) => void }) {
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();
 const [block, setBlock]    = useState<BlockInfo | null>(null);
 const [menuOpen, setMenuOpen] = useState(false);

 const menuOpenRef  = useRef(false);
 const dropdownRef  = useRef<HTMLDivElement>(null);
 const triggerRef   = useRef<HTMLButtonElement>(null);
 const hideTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 // Tracks whether the last interaction was a drag so we don't also open the menu.
 const wasDragRef   = useRef(false);
 // Set the instant mousedown lands on the grip (not just once native dragstart
 // fires) — see the mousemove effect below for why the earlier window matters.
 const dragIntentRef = useRef(false);

 useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

 // Native HTML5 drag requires the element that received mousedown to stay put
 // — same DOM node, same position — until the browser commits to a drag and
 // fires dragstart. There's a brief window between mousedown and that firing
 // (the few pixels of movement the browser waits for) where this component's
 // own mousemove tracking is still live; if the cursor crosses back over the
 // editor during that window, `resolveBlock` can re-resolve to a different
 // block and reposition (in React's eyes, just restyle, but to the browser's
 // in-flight drag heuristic, moving the source element) the grip out from
 // under the gesture, silently killing the drag before dragstart ever fires.
 // Freezing tracking from mousedown (not just from confirmed dragstart) covers
 // that whole window; a global mouseup resets it whether the interaction
 // turned out to be a click, a completed drag, or an abandoned one.
 useEffect(() => {
  function onUp() { dragIntentRef.current = false; }
  document.addEventListener("mouseup", onUp);
  return () => document.removeEventListener("mouseup", onUp);
 }, []);

 // ── Document mousemove ────────────────────────────────────────────────────
 useEffect(() => {
  const onMove = (e: MouseEvent) => {
   if (menuOpenRef.current || dragIntentRef.current) return;

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
     if (!menuOpenRef.current && !dragIntentRef.current) setBlock(null);
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
   if (menuOpenRef.current || dragIntentRef.current) return;
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

 // Inserts a new empty paragraph below the block (or above, on Alt-click),
 // then types "/" into it — reusing the existing slash-command menu instead
 // of building a second block-type picker for this button.
 const insertBlock = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
  if (!block) return;
  const insertPos = e.altKey ? block.nodePos : block.nodePos + block.nodeSize;
  editor
   .chain()
   .focus()
   .insertContentAt(insertPos, { type: "paragraph" })
   .setTextSelection(insertPos + 1)
   .insertContent("/")
   .run();
  setBlock(null);
 }, [editor, block]);

 const commentBlock = useCallback(() => {
  if (!block || !onComment) return;
  setMenuOpen(false);
  onComment(block.nodePos, block.top);
 }, [block, onComment]);

 // ── Drag handlers ─────────────────────────────────────────────────────────
 const handleDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
  if (!block) { e.preventDefault(); return; }

  const view = editor.view;
  const node = view.state.doc.nodeAt(block.nodePos);
  if (!node) { e.preventDefault(); return; }

  wasDragRef.current = true;

  // Select the source node — mirrors what a real in-editor drag would leave
  // selected — and re-focus the editor, since mousedown on the grip (rendered
  // in a portal outside the editor DOM) steals browser focus away from it.
  const nodeSel = NodeSelection.create(view.state.doc, block.nodePos);
  view.dispatch(view.state.tr.setSelection(nodeSel).setMeta("addToHistory", false));
  view.dom.focus();

  // `view.dragging` is what ProseMirror's own drop handler reads instead of
  // firing its usual internal dragstart logic — needed because that logic
  // only ever runs for drags that start on view.dom itself, never on this
  // portal-rendered button. Its public type is just `{slice, move}`, but the
  // handler also reads an optional `.node` (a NodeSelection) when present and,
  // if so, deletes the source via `node.replace(tr)` — which maps the node's
  // *own* captured position through the drop transaction — instead of
  // `tr.deleteSelection()`, which deletes whatever `view.state.selection`
  // happens to be *at drop time*. Passing `node` here removes any dependency
  // on that selection still being our NodeSelection by the time the drop
  // lands, which the focus dance above is trying to guarantee but a stray
  // selection change during the drag would otherwise silently break.
  const slice = new Slice(Fragment.from(node), 0, 0);
  (view as any).dragging = { slice, move: true, node: nodeSel };

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
  <>
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
   {/* + — insert a new block below (Alt-click: above). Hidden in compact
       mode (narrow fixed panels) — there isn't room for both buttons without
       the pair covering the block's own text. */}
   {!block.compact && (
    <button
     type="button"
     onClick={insertBlock}
     onMouseEnter={(e) => showTooltip("Click to add below · Alt-click to add above", e)}
     onMouseLeave={hideTooltip}
     className="flex h-6 w-5 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-muted-foreground"
    >
     <Plus size={14} />
    </button>
   )}

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
     dragIntentRef.current = true;
     // A hide timer may already be pending from just before mousedown (e.g. the
     // cursor briefly left the safe zone while approaching the grip). Clear it
     // here too — the guard above only stops *new* timers, not one already in
     // flight — otherwise it can still fire mid-gesture and unmount this button.
     clearTimeout(hideTimer.current);
    }}
    onClick={() => {
     // Ignore click if it was the tail-end of a drag interaction.
     if (wasDragRef.current) return;
     setMenuOpen((v) => !v);
    }}
    onMouseEnter={(e) => showTooltip("Drag to reorder · Click for options", e)}
    onMouseLeave={hideTooltip}
    style={{ width: block.gripSize }}
    className="flex h-6 shrink-0 cursor-grab items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-muted-foreground active:cursor-grabbing"
   >
    <GripVertical size={Math.max(10, Math.min(14, block.gripSize - 2))} />
   </button>

   {/* Dropdown */}
   {menuOpen && (
    <div
     ref={dropdownRef}
     className="absolute top-0 w-44 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-popover"
     style={{ left: block.gripSize + 4, zIndex: 9999 }}
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
  </div>
  {tooltip && (
   <IconTooltip rect={tooltip.rect} label={tooltip.label} minLeft={getHandleLeftBoundary(editor.view.dom as HTMLElement).boundary} />
  )}
  </>,
  document.body,
 );
}
