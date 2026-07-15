# Solution: per-notification dismiss (X) button

**Fixed:** 2026-07-14

## What changed

1. **`app/api/notifications/[id]/route.ts`** (new) — `DELETE` handler, hard-deletes one notification scoped to `recipientId = session.user.id`. Mirrors the existing `clear-all/route.ts` delete pattern, just scoped to a single row instead of every notification in a workspace.

2. **`components/notifications/notification-card.tsx`** — replaced the redundant `ArrowRight` ("Open page") hover button with an `X` ("Delete notification") button. Added an `onDelete: (id: string) => void` prop, called on click. The arrow's old job (navigate to source) is unaffected — the whole card already does that on click via `handleCardClick`.

3. **`components/notifications/notification-provider.tsx`** — added `deleteNotification(id, wasUnread)` to the context, following the exact shape of the existing `markRead`: fires the API call, and only decrements `unreadCount` if the deleted notification was actually unread (unlike `markRead`, which is only ever called on unread rows, delete can happen from either state).

4. **`components/notifications/notification-panel.tsx`** — added `handleDelete(id)`, which looks up the notification's current `isRead` state from local `items`, calls `deleteNotification(id, !isRead)`, and removes the row from `items` — following the same local-state-mutation pattern already used by `handleMarkRead`/`handleClearAll` (the notification list is a one-shot fetch on panel open, not a live subscription, so removal has to happen client-side).

## Why this fixes the root cause

The missing piece was purely the lack of a single-row delete endpoint — once that existed, wiring the button through was the same pattern already established for mark-read (context method → API call → local list mutation), not a new architecture.

## Verification

`tsc --noEmit` passes across the whole project. Not verified in a live browser (no browser automation tool available in this environment) — worth confirming: the X button removes just that one row, unread count decrements only when deleting an unread notification, and clicking the card body still navigates to the source page as before.
