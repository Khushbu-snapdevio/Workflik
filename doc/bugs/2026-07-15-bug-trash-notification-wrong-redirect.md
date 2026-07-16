# Bug: clicking a "page moved to Trash" notification opens the deleted page instead of the Trash list

**Reported:** 2026-07-15

## Symptom

When a page is deleted (moved to Trash), the owner gets an in-app notification. Clicking that notification navigates to `/app/{workspace}/{pageShortId}` — the deleted page's own detail view (showing a restore/permanently-delete banner) — instead of the Trash list at `/app/{workspace}/trash`. The same wrong-target behavior also affects the separate "this trashed page will be permanently deleted in 3 days" notification, since both share the same notification type.

## Root cause

There is one notification type, `trash_warning` (`lib/db/schema/types.ts:128`), that covers both "your page was just moved to Trash" (fired from `app/api/pages/[id]/route.ts` on soft delete) and "your trashed page expires in 3 days" (fired from the `warn-expiring-trash` cron job). Neither the notification row nor any other part of the pipeline stores a dedicated click-target URL — only `pageId` is stored, and the API always resolves it to the *original* page's `shortId`.

Every notification type shares one generic, type-agnostic click handler:

- `components/notifications/notification-panel.tsx` (`handleClick`)
- `components/notifications/notification-provider.tsx` (toast `onView`)

Both unconditionally build `/app/{workspaceSlug}/{pageShortId}` whenever a `pageShortId` is present. This works for every other notification type (mention, reply, access-granted, etc.) because their target pages aren't deleted — but it's the wrong target for `trash_warning`, whose page is by definition already in Trash.
