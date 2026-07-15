# Bug: no notification-panel entry when another user creates a page

**Reported:** 2026-07-15

## Symptom

After the sidebar was made to live-update when another user creates a page (see `2026-07-15-bug-sidebar-not-live-on-page-create.md`), the user clarified they also expected an actual entry in the Notifications panel (bell icon) — not just the sidebar list updating silently. Creating a page produced nothing in the recipient's Inbox.

## Root cause

There was no notification trigger for page creation at all. `app/api/pages/route.ts`'s `POST` handler inserted the new page, its closure-table row, its starter block, and its search-index entry, all inside one `db.transaction`, but never called into `lib/notifications/triggers.ts` — every other kind of workspace event that should notify people (mentions, replies, access grants, page updates) already has a dedicated `trigger*Notification` function called from inside its own transaction; page creation simply never got one.
