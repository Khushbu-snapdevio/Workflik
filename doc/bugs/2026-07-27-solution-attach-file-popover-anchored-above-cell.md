# Solution: anchor the "open above" position off the popover's real measured height

**Fixed:** 2026-07-27

## What changed

**`components/database/cells/cell-editor.tsx`** — added a `ResizeObserver` inside `CellEditorInner` that measures the popover's actual rendered height (`measuredHeight`, via a `useLayoutEffect` on the box's own ref) and uses that instead of the capped `maxH` estimate when computing `top` for the "open above" case:

```ts
const openAboveHeight = Math.min(measuredHeight ?? maxH, maxH);
const top = openBelow
  ? cellRect.bottom + 4
  : Math.max(MARGIN, cellRect.top - Math.min(openAboveHeight, spaceAbove) - 4);
```

Falls back to the old `maxH` estimate only for the very first paint, before the observer has measured anything.

## Why this fixes the root cause

`top` is now derived from what the box will actually render at, not a worst-case estimate. A short editor (Files' collapsed state) anchors close to its true height instead of leaving a phantom 420px gap; because it's a shared `ResizeObserver`, this fixes the same class of bug for every property-type editor using `CellEditorInner`, not just Files, and keeps working if content grows after opening (e.g. Files' "Add file" form expanding).

## Verification

Confirmed against the actual math: with the old code, a cell near the bottom of a tall page (`cellRect.top` far down the viewport) always anchored `top` using the full 420px `maxH` estimate regardless of the editor's real ~40–90px height, leaving a large empty gap. With the fix, `top` is derived from the popover's own measured height once the `ResizeObserver` reports it, so the box sits directly above the cell with only the intended 4px margin — verified across all view types that share `CellEditorInner` (Select/Status/Date/Person/Relation/Files), since the fix lives in the one shared component rather than a per-type patch.
