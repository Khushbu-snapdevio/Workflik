"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Copy, DotsSixVertical, Trash, ChatText } from "@phosphor-icons/react";

interface BlockInfo {
  top:      number;
  left:     number;
  nodePos:  number;
  nodeSize: number;
}

// Resolve which top-level block the mouse is over.
// Regular (contentEditable) blocks: posAtCoords works fine.
// Atom blocks (image, video, audio, file — contentEditable=false): posAtCoords
// returns null, so we fall back to elementFromPoint + DOM traversal.
function resolveBlock(e: MouseEvent, editor: Editor): BlockInfo | null {
  const editorEl = editor.view.dom as HTMLElement;
  const er       = editorEl.getBoundingClientRect();

  try {
    // ── Primary path: posAtCoords (works for text blocks) ──
    const posObj = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });

    if (posObj) {
      let $pos;
      try { $pos = editor.state.doc.resolve(posObj.pos); } catch { /* skip */ }

      if ($pos && $pos.depth >= 1) {
        const nodePos = $pos.before(1);
        const node    = editor.state.doc.nodeAt(nodePos);
        if (node) {
          const domInfo = editor.view.domAtPos(nodePos + 1);
          let domNode   = domInfo.node as HTMLElement;
          if (domNode.nodeType === Node.TEXT_NODE) domNode = domNode.parentElement!;
          while (domNode.parentElement && domNode.parentElement !== editorEl) {
            domNode = domNode.parentElement;
          }
          const br = domNode.getBoundingClientRect();
          return {
            top:      br.top + br.height / 2,
            left:     er.left - 36,
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
    const rawPos  = editor.view.posAtDOM(el, 0);
    // rawPos is the position inside the node; nodePos = position before the node
    const nodePos = Math.max(0, rawPos - 1);
    const node    = editor.state.doc.nodeAt(nodePos);
    if (!node) return null;

    const br = el.getBoundingClientRect();
    return {
      top:      br.top + br.height / 2,
      left:     er.left - 36,
      nodePos,
      nodeSize: node.nodeSize,
    };
  } catch {
    return null;
  }
}

export function BlockHandle({ editor, onComment }: { editor: Editor; onComment?: (nodePos: number, absoluteY: number) => void }) {
  const [block, setBlock]       = useState<BlockInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuOpenRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

  // ── Document mousemove ────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (menuOpenRef.current) return;

      const editorEl = editor.view.dom as HTMLElement;
      const er       = editorEl.getBoundingClientRect();

      const inSafeZone = (
        e.clientX >= er.left - 90 &&
        e.clientX <= er.right     &&
        e.clientY >= er.top  - 10 &&
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
        e.clientY >= er.top  && e.clientY <= er.bottom
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
    onComment(block.nodePos, block.top); // block.top is absolute viewport Y of block centre
  }, [block, onComment]);

  if (!block || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position:  "fixed",
        top:       block.top,
        left:      block.left,
        transform: "translateY(-50%)",
        zIndex:    9999,
        display:   "flex",
        alignItems: "center",
      }}
    >
      {/* ⠿ grip button */}
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setMenuOpen((v) => !v);
        }}
        title="Block options"
        className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-muted-foreground/30 transition-colors hover:bg-accent hover:text-muted-foreground"
      >
        <DotsSixVertical weight="bold" size={14} />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-6 top-0 w-44 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-popover shadow-[var(--shadow-raised)]"
          style={{ zIndex: 9999 }}
        >
          <div className="py-1">
            {onComment && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commentBlock}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <ChatText size={14} className="shrink-0 text-muted-foreground" />
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
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash size={14} className="shrink-0" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
