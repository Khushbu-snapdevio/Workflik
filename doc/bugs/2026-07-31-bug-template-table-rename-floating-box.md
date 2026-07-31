# Bug: renaming a column from the header menu opens a disconnected floating box instead of editing in place

**Reported:** 2026-07-31

## Symptom

On a database page (e.g. a template-derived "Brainstorm Session" page), clicking "Rename" for a column (via its "⋯" menu) didn't turn the column header itself into an editable field. Instead it swapped the "⋯" dropdown's contents for a small floating input box positioned near the dropdown's anchor, disconnected from the actual column header label — looking detached/misplaced relative to where the user clicked.

## Root cause

`components/templates/views/template-table-view.tsx`'s `ColumnHeader` handled renaming by keeping the "⋯" dropdown open and swapping its *contents* to a single input, still positioned via the dropdown's own anchor (the "⋯" button's rect, right-aligned) rather than the header's label position.

`components/database/table-view.tsx` has the equivalent header for the regular (non-template) database view, and its `SortableColumnHeader` does this correctly: `isRenaming` swaps the header cell's own label `<span>` for a `w-full h-full` `<input>`, inline, in place — no separate floating box at all. The template table view's `ColumnHeader` never matched that pattern.
