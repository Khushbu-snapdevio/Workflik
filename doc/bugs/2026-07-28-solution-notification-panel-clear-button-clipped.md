# Solution: let the filter tabs scroll instead of overflowing the panel

**Fixed:** 2026-07-28

## What changed

`components/notifications/notification-panel.tsx`: the filter-tabs wrapper div gained `min-w-0` and `overflow-x-auto` (`flex items-center gap-0.5` → `flex min-w-0 items-center gap-0.5 overflow-x-auto`).

## Why this fixes the root cause

`min-w-0` lets the tabs wrapper shrink below its content's intrinsic width as a flex item, and `overflow-x-auto` gives the overflowing tab labels somewhere to go (a horizontal scroll within the wrapper) instead of pushing the row past the panel's edge. The "Clear all" button stays `shrink-0` outside the scrollable area, so it always renders fully inside the panel regardless of how many tabs are shown or how narrow the panel gets.

## Verification

`npx tsc --noEmit` passes with no new errors.
