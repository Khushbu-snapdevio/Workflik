# Solution: inline database view tabs get clipped and "Add a view" becomes unreachable

**Fixed:** 2026-07-30

## What changed

`components/database/toolbar.tsx`:

1. **Moved the "Add a view" button out of the scrollable tabs strip.** It now renders as its own `shrink-0` sibling immediately after the `overflow-x-auto` tabs container (and before the always-visible actions cluster), instead of as the last item inside it. It's now always fully visible regardless of how many views exist or how narrow the container is — matching the same "never clipped" guarantee the Filter/Sort/Properties cluster already had.
2. **Added a ref + effect to scroll the active tab into view.** `activeTabRef` is attached to whichever view tab button is active; a `useEffect` keyed on `activeViewId` calls `activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" })` on mount and on every view switch, so the selected view's full name is always brought within the visible/scrolled region of the strip instead of being left wherever the initial `scrollLeft: 0` position happened to cut it off.

## Why this fixes the root cause

The tabs strip's internal-scroll design (hidden scrollbar, `overflow-x-auto`) is unchanged — that's intentional so Filter/Sort/Properties/New still never get pushed off a narrow container. The fix addresses the two gaps that design left open: a control that must always be reachable (Add a view) is no longer placed inside the region that silently clips, and the one tab that must always be fully visible (the active one) is actively scrolled into view instead of relying on whatever the default scroll offset happens to show.
