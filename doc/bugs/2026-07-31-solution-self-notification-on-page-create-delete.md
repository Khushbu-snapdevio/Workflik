# Solution: exclude the actor from page-create notifications, and split the delete-time trigger from the cron trash warning

**Fixed:** 2026-07-31

## What changed

**`lib/notifications/triggers.ts`**

1. `triggerPageCreatedNotification` — the recipient loop guard became `if (!userId || userId === creatorId) continue;`. Signature unchanged, so both call sites (`app/api/pages/route.ts` and `lib/pages/promote-draft.ts`) inherit the fix with no edits. The comment block claiming the creator's inclusion was "an intentional exception" was replaced with one stating the actual Hard Rule 11 behavior.

2. Added `triggerPageDeletedNotification` — a single-recipient trigger for the immediate soft-delete case, guarded by `if (createdBy === deletedBy) return;` and notifying only `createdBy`. It still writes `type: "trash_warning"`, so no notification-type registry entry changes were needed (email subject, action text, icon, category filter, and click-redirect all key off the stored `type` column, not the function that wrote it).

3. `triggerTrashWarningNotification` — left functionally untouched; only a comment was added marking it cron-only and explaining why it legitimately notifies both parties.

**`app/api/pages/[id]/route.ts`** — the `DELETE` handler now imports and calls `triggerPageDeletedNotification` instead of `triggerTrashWarningNotification`. The surrounding `if (page.createdBy && !page.isDraft)` guard is unchanged.

## Why this fixes the root cause

The page-create fix puts the exclusion inside the shared trigger rather than at either call site, so there is one place enforcing Hard Rule 11 and no way for a future caller to miss it.

For deletes, a split was chosen over adding an `excludeActor` boolean to the shared function. The two behaviors aren't one behavior with a flag — they're two different events that happen to render as the same notification type: "someone trashed your page" (actor-excluded) versus "your trashed page expires in 3 days" (no actor at all). Two named functions, one with a plain early-return guard, match the pattern every other single-recipient trigger in the file already uses, and leave `warn-expiring-trash.ts` completely untouched — no risk of regressing a working scheduled job. A flag would have required editing the cron call site to pass `excludeActor: false`, and left a future reader to re-derive why violating the rule's literal wording is correct there.

An empty recipient set in the self-delete case is safe: `triggerPageDeletedNotification` returns `void`, and the `DELETE` handler returns `{ success: true, deleted: "soft" }` without inspecting it.

## Verification

`tsc --noEmit` passes with no errors in any of the touched or dependent files. Confirmed by diff that `lib/jobs/handlers/warn-expiring-trash.ts`, `lib/pages/promote-draft.ts`, and `app/api/pages/route.ts` are byte-for-byte unchanged. A repo-wide grep confirms the four call sites are the only callers of either trigger.

## Follow-up noted, not bundled

`components/notifications/notification-provider.tsx` (~lines 77-83) filters toasts with `senderId !== currentUserId` and carries a comment saying self-actions "still land here as a confirmation entry in the panel/bell count" — added in `doc/bugs/2026-07-20-solution-self-notification-toast-shows-system.md`, which was built on top of this bug. With no trigger able to produce `senderId === recipientId` anymore, that filter is now dead code. Harmless, left in place; worth removing in a separate cleanup.
