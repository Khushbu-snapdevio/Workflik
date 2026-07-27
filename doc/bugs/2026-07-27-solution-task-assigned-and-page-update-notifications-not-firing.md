# Solution: read the real person-value shape, and notify on metadata-only edits too

**Fixed:** 2026-07-27

## What changed

1. **`app/api/entries/[id]/property-values/[propId]/route.ts`** — now reads `(body.value as { userIds?: string[] })?.userIds`, and diffs against the property's previous value (fetched up front, reused by the existing vote-mode check) so only *newly added* assignees are notified — not everyone already sitting in the value on every unrelated save:
   ```ts
   const addedAssigneeIds = newIds.filter((uid) => !oldIds.has(uid));
   ```

2. **`app/api/pages/[id]/route.ts`** — added the same notify-once-per-new-editor logic the blocks-batch route already has, inside the same transaction that stamps `lastEditedBy`:
   ```ts
   if (!page.isDraft && page.createdBy && session.user.id !== page.createdBy && session.user.id !== page.lastEditedBy) {
     await triggerPageUpdateNotification(tx, { workspaceId: page.workspaceId, pageId: id, editorId: session.user.id, createdBy: page.createdBy, pageTitle: row.title ?? page.title ?? "Untitled" });
   }
   ```

## Why this fixes the root cause

The task-assignment fix matches the code to the data shape that's actually written everywhere else in the codebase, instead of a shape nothing ever produces. The page-update fix closes the cross-route interaction: both routes that can independently flip `lastEditedBy` now also independently notify-and-throttle, so whichever one a user's edit happens to hit first, the creator still gets notified exactly once for that new editor's changes — a metadata-only edit (title/icon/cover) no longer silently consumes the throttle that the content-save route depends on.

## Verification

Verified live end-to-end against the running dev server with two real accounts sharing a workspace: a non-owner renaming the page title produced a `page_update` notification for the creator immediately (confirmed via the notifications table, timestamped right after the rename, with `lastEditedBy` correctly flipped); a non-owner setting the Owner person property to the other user produced a `task_assigned` notification for that user (confirmed via the same table, correct `contentSnippet`). All test data and mutations made during verification were reverted afterward.
