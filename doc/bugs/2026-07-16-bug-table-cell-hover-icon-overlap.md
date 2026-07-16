# Bug: table-view hover icons (comment/copy) render on top of the cell's own content

**Reported:** 2026-07-16

## Symptom

Hovering a Table-view cell (in either the real database view or the template-preview table view) shows a floating comment/copy icon overlay anchored to the cell's right edge. For cells whose content is wide enough to reach near the column's right edge — most visibly a Select/Status/Multi-select badge, like a "Team" column showing a "Product Design" pill — the overlay's icon and its background gradient render directly on top of the badge's own color, muddying it instead of sitting cleanly beside it.

## Reproduce

1. Open a Table view with a Select-type column wide enough to show a colored badge that nearly fills its column width (e.g. "Product Design", "Human Resources").
2. Hover that cell.
3. Expected: the hover comment icon appears cleanly to the right of the badge, over empty cell background. Actual: the icon and its gradient background overlap the badge's own color.

## Root cause

`components/database/cell-action-overlay.tsx` renders a fixed-position overlay anchored to `rect.right` (the cell's true outer edge), needing roughly 50–80px of width for its fade gradient plus the comment/copy icon buttons. The cell itself (in both `table-view.tsx` and `template-table-view.tsx`) only had symmetric padding (`px-3` / `px-1`), so content could truncate right up to the cell's true edge — leaving only ~12px of real gap before the overlay's icon zone, far less than the ~50-80px it actually needs. Any cell whose content was wide enough to approach that edge collided with the overlay.
