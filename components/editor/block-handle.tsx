"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Copy, DotsSixVertical, Trash } from "@phosphor-icons/react";

interface BlockInfo {
  /** Viewport Y for the vertical midpoint of the hovered block */
  top:      number;
  /** Viewport X — 36 px left of the editor element's left edge */
  left:     number;
  nodePos:  number;
  nodeSize: number;
}

export function BlockHandle({ editor }: { editor: Editor }) {
  const [block, setBlock]       = useState<BlockInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Refs let the document-level listener read current values without being
  // re-registered every time state changes.
  const menuOpenRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

  // ── Document mousemove — track which block is hovered ────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (menuOpenRef.current) return;

      const editorEl = editor.view.dom as HTMLElement;
      const er       = editorEl.getBoundingClientRect();

      // "Safe zone" = editor bounds + 90 px left margin so the cursor can
      // travel to the handle button (positioned to the left of the editor)
      // without triggering a hide timer.
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

      // Inside safe zone → cancel any pending hide and keep the handle alive.
      clearTimeout(hideTimer.current);

      // Only reposition when the cursor is actually over editor content.
      // If it's in the safe zone but over the handle itself, just keep the
      // current block position so the button doesn't jump.
      const overEditor = (
        e.clientX >= er.left && e.clientX <= er.right &&
        e.clientY >= er.top  && e.clientY <= er.bottom
      );
      if (!overEditor) return;

      const posObj = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!posObj) return;

      let $pos;
      try { $pos = editor.state.doc.resolve(posObj.pos); }
      catch { return; }
      if ($pos.depth < 1) return;

      const nodePos = $pos.before(1);
      const node    = editor.state.doc.nodeAt(nodePos);
      if (!node) return;

      try {
        const domInfo = editor.view.domAtPos(nodePos + 1);
        let domNode   = domInfo.node as HTMLElement;
        if (domNode.nodeType === Node.TEXT_NODE) domNode = domNode.parentElement!;
        while (domNode.parentElement && domNode.parentElement !== editorEl) {
          domNode = domNode.parentElement;
        }

        const br = domNode.getBoundingClientRect();
        setBlock({
          top:      br.top + br.height / 2, // viewport Y
          left:     er.left - 36,           // 36 px left of the editor
          nodePos,
          nodeSize: node.nodeSize,
        });
      } catch { /* DOM not ready */ }
    };

    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      clearTimeout(hideTimer.current);
    };
  }, [editor]); // stable — menuOpen read via ref

  // ── Outside-click closes the dropdown ────────────────────────────────────
  // Use mousedown (not click) so there is no timing gap between the trigger
  // mousedown opening the menu and the listener attaching. Exclude the
  // trigger button itself — it handles its own toggle via onMouseDown.
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

  if (!block || typeof document === "undefined") return null;

  // Render into document.body so no ancestor's overflow:hidden can clip the
  // handle or the dropdown. position:fixed means scroll doesn't affect it.
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
          className="absolute left-6 top-0 w-44 overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
          style={{ zIndex: 9999 }}
        >
          <div className="py-1">
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
