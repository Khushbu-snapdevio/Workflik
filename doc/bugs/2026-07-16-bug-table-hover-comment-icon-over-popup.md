# Bug: hover comment/copy icon renders on top of an open cell popup

**Reported:** 2026-07-16

## Symptom

In a database's table view, clicking a "files"-type cell (e.g. "Attach file") opens its editor popup (Upload/Link tabs, or the compact thumbnail + "+ Add a file or image" row once a file exists). While that popup stays open, the hover-triggered comment/copy icon overlay (the small chat-bubble + copy icons that appear when hovering any cell) can render on top of it, overlapping the popup's own content instead of staying hidden.

## Reproduce

**Precise repro (user-confirmed):**
1. Open a database's table view, scroll so a "files"-type column (e.g. "Attach file") is visible.
2. Attach an image to the first row's "Attach file" cell.
3. Delete that file via the thumbnail's "…" menu → Delete → confirm.
4. The popup stays open but does not return to its normal empty-state appearance — it's left showing a small, oddly-sized "+ Add a file or image" row instead of the full "Add a file or image" Upload/Link tabs UI a truly-empty cell would show.
5. Hover the same property's cell in the *next* row. Its comment icon renders on top of the still-open, wrongly-sized popup from step 4.

**General case:** the same overlap can also occur just by opening a popup and moving the mouse over nearby cells/rows while it's still open, without ever attaching or deleting a file — the hover comment/copy icon overlay should never render while any cell popup is open, but could.

## Root cause

Two separate, compounding issues:

1. **The popup itself got stuck in a broken visual state.** `FileEditor`'s `showAddForm` flag (`components/database/cells/cell-editor.tsx`) toggles between the full "Add a file or image" tabs UI (empty state) and a compact "+ Add" row (once a file exists) — but it was only ever computed once at mount (`useState(files.length === 0)`). Deleting the last file emptied the list without ever re-evaluating that flag, so the popup kept showing the compact row meant for "has files" even though there were now none — an undersized, misshapen leftover that made it look like a stray, stuck popup rather than a normal empty cell.
2. **The hover overlay could render on top of any open popup regardless.** Its visibility is driven by per-row local state (`hoveredCell` in `SortableTableRow`, `components/database/table-view.tsx`), set on `onMouseEnter` and cleared on `onMouseLeave` (via a 150ms `scheduleLeave` timer) or explicitly on click. Two gaps here: (a) the cursor doesn't always cross a clean element boundary — e.g. when a popup portal mounts directly under a stationary cursor — so the browser can skip firing `mouseleave`, leaving `hoveredCell` (and its icon) stuck at its last position; (b) the only guard against showing the overlay was "is this the exact same cell that's being edited," not "is *any* popup open anywhere," so a different nearby cell's legitimate hover could still render over an open popup.

A secondary contributor: the popup and the hover overlay both defaulted to the same `zIndex: 200`, so on the rare occasion both were mounted at once, whichever mounted more recently in the DOM won the stacking order.
