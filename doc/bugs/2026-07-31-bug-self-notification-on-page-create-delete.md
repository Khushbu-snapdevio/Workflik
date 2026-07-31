# Bug: users receive notifications for their own page creates and deletes

**Reported:** 2026-07-31

## Symptom

Creating a page, or moving a page to Trash, put a notification in the actor's *own* notification bell/center — e.g. their own name reading "created a new page". Notifications for these events should only ever reach *other* workspace members. This violates `doc/CLAUDE.md` Hard Rule 11: "A user never receives a notification for their own action."

## Root cause

Two triggers in `lib/notifications/triggers.ts` were the only ones in the file that never excluded the actor from their recipient list. Every other trigger there uses a direct `if (actorId === recipientId) return;` guard.

**1. `triggerPageCreatedNotification`** — queries every `active` workspace member and inserts one `page_created` notification per member, with the loop guard `if (!userId) continue;`. The creator is themselves an active member, so they always landed in the recipient set. `creatorId` was only ever used as `senderId`, never compared against the recipient.

This was a regression, not the original design. `doc/bugs/2026-07-15-solution-no-notification-on-page-create.md` describes the trigger as "excluding the creator (Hard Rule 11 — never notify a user for their own action)". A later change flipped that and added a comment claiming the inclusion was "an intentional exception ... the user explicitly asked for a confirmation entry in their own Notifications panel" — that comment was itself the bug, rationalizing the broken behavior.

**2. `triggerTrashWarningNotification`** — built `recipients = new Set([deletedBy, createdBy])` with no exclusion of `deletedBy` (the actor). In the common self-delete case (`deletedBy === createdBy`) the Set deduped to a single entry — the actor — so deleting your own page notified you about it.

The subtlety here is that this one function served two callers with genuinely different semantics:
- `app/api/pages/[id]/route.ts` `DELETE` — fires the moment a page is trashed, with `deletedBy: session.user.id`. This *is* "you just did X", so Hard Rule 11 applies.
- `lib/jobs/handlers/warn-expiring-trash.ts` — a daily cron that warns when a page is 3 days from permanent deletion. There is no live actor here (`deletedBy` is read from a historical column); it's a forward-looking deadline alert, and the owner must still be warned even when they were also the deleter. Applying a blanket actor-exclusion to the shared function would have silently broken this documented feature for the majority of cases.
