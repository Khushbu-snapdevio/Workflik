# Bug: creating a page pops a "System created a new page" toast at yourself

**Reported:** 2026-07-20

## Symptom

Clicking "New page" immediately shows a live toast in the bottom-right corner reading "System created a new page: Untitled" — before the user has had any chance to rename it or add content. The sender is shown as "System" rather than the user's own name.

## Root cause

`triggerPageCreatedNotification` (`lib/notifications/triggers.ts`) deliberately includes the creator themselves as a recipient — an intentional exception (per its own comment) so the creator gets a confirmation entry in their own Notifications panel. But `components/notifications/notification-provider.tsx`'s live SSE handler (`useNotificationStream`'s `onNotifications` callback) popped a toast for **every** fresh notification it received, with no distinction between "someone else did something" and "you just did this yourself." A self-triggered confirmation-panel entry and a live interruptive toast are not the same thing — the former is useful, the latter is just noise pointed at your own action, especially jarring on a blank page you haven't named yet.

Separately, but visible in the same screenshot: the toast's sender name fell back to "System" because `notification-toast.tsx` uses `notification.senderName ?? "System"`, and the test account's `users.name` column was `null` (no display name set) — a display-fallback issue, not related to the toast-timing bug itself.
