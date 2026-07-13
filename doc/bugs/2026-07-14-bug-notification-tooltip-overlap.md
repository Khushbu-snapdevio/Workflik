# Bug: notification row tooltips float over the row above

**Reported:** 2026-07-14

## Symptom

Hovering the "Mark as read" or "Delete notification" icons on a notification row shows a tooltip positioned too far up — overlapping the content of the *previous* notification row instead of sitting cleanly above the icon it belongs to.

## Root cause

`components/ui/icon-tooltip.tsx`'s "prefer above" placement (added earlier today to match this app's hover-label convention) only checks whether there's room above the anchor *within the viewport* — it clamps against `window.innerHeight`/`0`, not against sibling DOM elements. The notification hover-action icons sit at `top-3` of each row (`notification-card.tsx`), and notification rows are stacked with no gap between them. From a pure viewport-geometry standpoint there's plenty of "room above" (the whole rest of the panel), so the tooltip never triggers its below-fallback — but that "room" is actually the previous row's own content, which the tooltip then visually sits on top of.

This is a real limitation of a viewport-only position calculation: it can't know that a specific direction is visually occupied by unrelated sibling content, only that it's within the browser window.
