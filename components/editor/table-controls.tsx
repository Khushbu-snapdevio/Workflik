"use client";

import type { Node as PMNode } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";
import { TableMap } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TableInfo {
  rect: { top: number; left: number; width: number; height: number };
  tableNode: PMNode;
  tablePos: number;
}

// Resolves the nearest ancestor <table> under the cursor (if any) to its
// ProseMirror position — tables can sit nested inside other blocks (e.g.
// callouts, columns), so this walks up from the DOM hit rather than assuming
// tables are always top-level doc children.
function resolveTable(e: MouseEvent, editor: Editor): TableInfo | null {
  const editorEl = editor.view.dom as HTMLElement;
  try {
    const el = document.elementFromPoint(
      e.clientX,
      e.clientY
    ) as HTMLElement | null;
    const tableEl = el?.closest("table");
    if (!tableEl || !editorEl.contains(tableEl)) {
      return null;
    }

    const pos = editor.view.posAtDOM(tableEl, 0);
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d >= 0; d--) {
      if ($pos.node(d).type.name === "table") {
        const r = tableEl.getBoundingClientRect();
        return {
          tablePos: $pos.before(d),
          tableNode: $pos.node(d),
          rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Re-measures a tracked table's on-screen rect by its document position
// rather than the mouse — used to keep the controls glued to the table while
// scrolling, since scroll doesn't fire mousemove.
function getTableRect(
  editor: Editor,
  tablePos: number
): TableInfo["rect"] | null {
  try {
    const dom = editor.view.nodeDOM(tablePos) as HTMLElement | null;
    if (!dom) {
      return null;
    }
    const r = dom.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  } catch {
    return null;
  }
}

// Moves the selection into the given cell (snapping to the nearest valid
// text position inside it) before running a table command — addRowAfter/
// addColumnAfter act relative to whatever cell the selection is currently in.
function selectCell(
  editor: Editor,
  tablePos: number,
  tableNode: PMNode,
  row: number,
  col: number
) {
  const map = TableMap.get(tableNode);
  const tableStart = tablePos + 1;
  const cellStart = tableStart + map.positionAt(row, col, tableNode);
  const $pos = editor.state.doc.resolve(
    Math.min(cellStart + 1, editor.state.doc.content.size)
  );
  const selection = Selection.near($pos);
  editor.view.dispatch(editor.state.tr.setSelection(selection));
}

export function TableControls({ editor }: { editor: Editor }) {
  const [table, setTable] = useState<TableInfo | null>(null);
  const tableRef = useRef<TableInfo | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const CONTROL_SIZE = 18;

  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const info = resolveTable(e, editor);
      if (info) {
        clearTimeout(hideTimer.current);
        setTable(info);
        return;
      }

      const prev = tableRef.current;
      if (!prev) {
        return;
      }

      // Keep the controls up if the cursor is over the row/column bars
      // themselves (just past the table's bottom/right edge) instead of the
      // table — otherwise moving toward the "+" hides it first.
      const { top, left, width, height } = prev.rect;
      const nearRow =
        e.clientX >= left &&
        e.clientX <= left + width &&
        e.clientY >= top + height &&
        e.clientY <= top + height + CONTROL_SIZE + 4;
      const nearCol =
        e.clientY >= top &&
        e.clientY <= top + height &&
        e.clientX >= left + width &&
        e.clientX <= left + width + CONTROL_SIZE + 4;
      if (nearRow || nearCol) {
        clearTimeout(hideTimer.current);
        return;
      }

      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setTable(null), 200);
    };

    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      clearTimeout(hideTimer.current);
    };
  }, [editor]);

  useEffect(() => {
    const onScroll = () => {
      setTable((prev) => {
        if (!prev) {
          return prev;
        }
        const rect = getTableRect(editor, prev.tablePos);
        if (!rect) {
          return null;
        }
        return { ...prev, rect };
      });
    };
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [editor]);

  if (!table || typeof document === "undefined") {
    return null;
  }

  const map = TableMap.get(table.tableNode);
  const { top, left, width, height } = table.rect;

  return createPortal(
    <>
      {/* Add row — thin bar spanning the table's width, just below it */}
      <button
        className="flex items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground opacity-50 transition-opacity duration-100 hover:bg-accent hover:text-foreground hover:opacity-100"
        onClick={() => {
          selectCell(
            editor,
            table.tablePos,
            table.tableNode,
            map.height - 1,
            0
          );
          editor.chain().focus().addRowAfter().run();
        }}
        style={{
          position: "fixed",
          top: top + height,
          left,
          width,
          height: CONTROL_SIZE,
          zIndex: 40,
        }}
        type="button"
      >
        <Plus size={13} />
      </button>

      {/* Add column — thin bar spanning the table's height, just right of it */}
      <button
        className="flex items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground opacity-50 transition-opacity duration-100 hover:bg-accent hover:text-foreground hover:opacity-100"
        onClick={() => {
          selectCell(editor, table.tablePos, table.tableNode, 0, map.width - 1);
          editor.chain().focus().addColumnAfter().run();
        }}
        style={{
          position: "fixed",
          top,
          left: left + width,
          width: CONTROL_SIZE,
          height,
          zIndex: 40,
        }}
        type="button"
      >
        <Plus size={13} />
      </button>
    </>,
    document.body
  );
}
