# Solution: suppress the live toast for your own notifications

**Fixed:** 2026-07-20

## What changed

1. **`components/notifications/notification-provider.tsx`** — `NotificationProvider` now takes a `currentUserId` prop. In the SSE `onNotifications` handler, fresh items are still all counted toward `unreadCount` (so the confirmation entry still shows up in the bell/panel, matching the original intent), but only `freshItems.filter(n => n.senderId !== currentUserId)` are pushed into the toast queue. A self-authored "page created" notification no longer pops a toast; a teammate's does, exactly as before.
2. **`app/app/[workspace]/layout.tsx`** — passes `currentUserId={session.user.id}` into `NotificationProvider` (already had the session server-side, no new fetch needed).

The "System" sender-name fallback was **not** changed — that's a separate, narrower issue (a null `users.name` falling back to a hardcoded label in `notification-toast.tsx` / `notification-digest-send.ts`), called out to the user rather than bundled into this fix.

## Why this fixes the root cause

The underlying notification row and unread count are untouched — the creator still gets their confirmation entry in the panel, per the original design intent documented in `triggerPageCreatedNotification`'s own comment. Only the *live toast* channel is filtered, since a toast is meant to interrupt you about something you didn't already know — which is never true of your own action.

## Verification

`npx tsc --noEmit` passed with no errors introduced. Confirmed via the two-test-account browser harness used elsewhere this session: creating a page as User A no longer shows a toast on User A's own screen, while User B (a different user) still receives their toast normally once the page is promoted out of draft state (see the draft-pages fix below).
