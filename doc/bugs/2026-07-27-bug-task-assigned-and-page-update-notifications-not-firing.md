# Bug: assigned users and page followers never get a notification, even with the preference enabled

**Reported:** 2026-07-27

## Symptom

With both "Task assignments" and "Page updates" notification preferences enabled, users never received a notification when: (1) another user assigned them to a task (set a person-type property to point at them), or (2) a page they created was edited by someone else.

## Root cause

Both underlying trigger functions (`triggerTaskAssignedNotification`, `triggerPageUpdateNotification` in `lib/notifications/triggers.ts`) were already called from the right places — the bug was in each call site's gating logic, not missing wiring.

1. **Task assignment** — `app/api/entries/[id]/property-values/[propId]/route.ts` assumed a person property's PATCH body was a bare array or string of user ids:
   ```ts
   const assigneeIds = Array.isArray(body.value) ? body.value as string[] : [body.value as string];
   ```
   Every person property value in this codebase is actually saved as `{ userIds: string[]; _members?: [...] }` (see `PersonEditor`'s `onSave` in `components/database/cells/cell-editor.tsx`, and every other reader of person values). So `Array.isArray(body.value)` was always `false`, `assigneeIds` became a one-element array containing the *whole object*, and `typeof assigneeId === "string"` was always `false` — the notification branch's condition could never be true, for every single assignment.

2. **Page updates** — `app/api/blocks/batch/route.ts` (the block-content autosave route) correctly notifies the page creator the first time a new editor saves content, throttled via `pages.lastEditedBy`. But `app/api/pages/[id]/route.ts` (the page metadata/title PATCH route) also unconditionally stamps `lastEditedBy` — without ever calling the notification trigger. A very common real flow — a collaborator renames a page's title before ever touching its content — silently poisoned the throttle: the title-rename PATCH set `lastEditedBy` to the new editor without notifying anyone, and the batch route's own throttle (`session.user.id !== page.lastEditedBy`) then saw itself already recorded and skipped the notification too. The creator never got notified for that entire edit session, even for a pure content edit that came after the silent title rename.
