# Bug: no way to dismiss a single notification

**Reported:** 2026-07-14

## Symptom

Each row in the notification panel showed two hover buttons: a checkmark (mark as read) and an arrow (→). The arrow was redundant — clicking anywhere on the notification card already marks it read and navigates to its source page (`handleCardClick` in `notification-card.tsx`), so the arrow button did exactly the same thing as the card itself. There was no way to remove/dismiss a single notification from the list — only "mark all as read" and "clear all" (which deletes every notification at once) existed.

## Root cause

Not a logic bug so much as a missing feature: `app/api/notifications/` only had endpoints for marking read (single or all) and clearing everything (`clear-all`, a bulk hard delete). There was no `DELETE /api/notifications/:id` for a single row, so no per-notification dismiss action could exist client-side even if the UI wanted one.
