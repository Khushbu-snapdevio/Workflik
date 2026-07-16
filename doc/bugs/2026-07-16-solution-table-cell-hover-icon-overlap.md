# Solution: reserve a right-side gutter on the cell so content truncates before the hover-icon zone

**Fixed:** 2026-07-16

## What changed

- **`components/database/cell-action-overlay.tsx`** — tightened the overlay's fade zone (`paddingLeft: 32 → 20`), shrinking its total footprint.
- **`components/database/table-view.tsx`** — changed the per-cell wrapper from symmetric `px-3` to `pl-3 pr-8`, reserving extra right-side padding.
- **`components/templates/views/template-table-view.tsx`** — same change on its `<td>` wrapper: `px-1` → `pl-1 pr-7`.

## Why this fixes the root cause

Cell content (badges, truncated text) now stops short of the cell's true right edge by design, so the hover overlay's fade and icon buttons always land over genuinely empty cell background instead of colliding with a badge's own color — matching Notion's behavior, where hover-row actions always have a reserved gutter rather than overlapping live content.

## Verification

`tsc --noEmit` passes for all touched files. Not manually verified in a live browser in this session — worth confirming visually: hover a Select/Status cell with a wide badge value in both the real Table view and the template-preview Table view, and check the hover icon no longer overlaps the badge.
