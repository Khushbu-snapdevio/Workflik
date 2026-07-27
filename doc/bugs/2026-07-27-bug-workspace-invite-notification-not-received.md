# Bug: invited members never see a notification for their invite, and can't accept/decline from it

**Reported:** 2026-07-27

## Symptom

When an existing user is invited to a workspace they don't yet belong to, they report never receiving any notification — no bell badge, nothing in the notification panel — even from a fully separate account known to already have the trigger call wired up.

## Root cause

Two independent, stacked bugs:

1. **Notifications are scoped to whichever workspace is currently open.** Every notification API route (`GET /api/notifications`, the SSE `stream` route, `read-all`, `clear-all`) filtered strictly by `notifications.workspaceId = <the workspace currently open in the sidebar>`. A `workspace_invite` notification's `workspaceId` is the *new* workspace being invited to — one the recipient isn't an active member of yet, so there's no sidebar/workspace context in which they could ever be looking for it. The row existed in the database correctly (confirmed directly), but no UI context the recipient could reach would ever query for it.

2. **Even when visible, clicking the notification did nothing.** Neither the notification panel (`components/notifications/notification-panel.tsx`) nor the real-time toast (`components/notifications/notification-provider.tsx`) had a click-target wired up for `workspace_invite` — it has no `pageId`, so the existing "navigate to the linked page" fallback never applied, leaving the click a no-op.
