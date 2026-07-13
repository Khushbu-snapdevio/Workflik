# Solution: per-anchor tooltip placement override

**Fixed:** 2026-07-14

## What changed

1. **`components/ui/icon-tooltip.tsx`** — added an optional `placement?: "above" | "below"` prop (default `"above"`, so every existing caller keeps today's behavior unchanged). When `"below"`, the component prefers positioning below the anchor first, falling back to above only if there isn't room below in the viewport.

2. **`components/ui/icon-tooltip-button.tsx`** — added the same `placement` prop, passed straight through to the underlying `IconTooltip`.

3. **`components/notifications/notification-card.tsx`** — both hover-action buttons ("Mark as read", "Delete notification") now pass `placement="below"`.

## Why this fixes the root cause

Rather than hardcoding a one-off fix for this single component, the fix is a reusable escape hatch on the shared tooltip primitive: any future icon that sits near the top of a tightly-stacked list (where "above" would land on unrelated sibling content) can opt into `placement="below"` the same way, without affecting the default behavior every other tooltip in the app already relies on.

## Verification

`tsc --noEmit` passes across the whole project. Not verified in a live browser (no browser automation tool available in this environment) — worth confirming: hovering either icon on any notification row now shows the tooltip below the icon, within that row's own space, not overlapping the row above.
