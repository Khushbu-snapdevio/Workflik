# Solution: add a page_created notification, broadcast to active workspace members

**Fixed:** 2026-07-15

## What changed

1. **`lib/db/schema/types.ts`** — added `"page_created"` to the `notificationType` pg enum (migration `0021_bright_mother_askani.sql`, generated via `pnpm db:generate` per Hard Rule 8, applied via `pnpm db:migrate`).

2. **`lib/notifications/triggers.ts`** — added `triggerPageCreatedNotification()`, following the existing `insertAndEnqueue` pattern used by every other trigger. Unlike the single-recipient triggers (mention, reply, page update), this one queries all `active` `workspaceMembers` for the workspace and inserts one notification per member, excluding the creator (Hard Rule 11 — never notify a user for their own action). It deliberately skips two cases: **private pages** (not visible to anyone but the creator — a notification linking to a page you can't open is worse than none) and **database entries** (`kind === "entry"`, created far too often — every row added to a tracker — to announce workspace-wide without becoming noise). Also added `page_created: "notifyPageUpdates"` to the email-preference category map, reusing the existing "Page updates" toggle rather than adding a new one.

3. **`app/api/pages/route.ts`** — one call to `triggerPageCreatedNotification(tx, ...)` added inside the existing `db.transaction`, right after the search-index upsert.

4. **UI/category wiring**, matching every other notification type's registry entries (Hard Rule 12 — extend the registries, don't scatter switches):
   - `components/notifications/notification-card.tsx` — `TYPE_ACTION["page_created"] = "created a new page"`, `TYPE_DOT_CLASS["page_created"] = "bg-primary"`.
   - `app/api/notifications/route.ts` — added to the `updates` filter category (alongside `page_update`, `access_granted`, etc.).
   - `lib/jobs/handlers/notification-digest-send.ts` — added to its own (duplicated) category-preference map so digest emails respect the same "Page updates" opt-out.

5. **`doc/CLAUDE.md`** — added the new trigger to the "A user receives notifications for" list, per Hard Rule 1.

## Why this fixes the root cause

This plugs page creation into the same notification registry every other event already uses, rather than inventing a separate mechanism — same transactional-insert pattern (Hard Rule 11), same email-preference gating, same UI label/color/category conventions. The private-page and database-entry exclusions were a deliberate scope decision (confirmed with the user) to keep the feature from becoming noisy or pointing at inaccessible content, not an oversight.

## Verification

Since the dev server's HTTP port was unreachable from this environment during testing (a networking/sandbox issue, not a code defect — another session was still able to reach it), the trigger was verified directly against the real database: created a second real workspace member, then called `triggerPageCreatedNotification` inside a transaction for four cases —

- Normal page, not private: notification correctly inserted for the other member (correct `type`, `senderId`, `contentSnippet`), and **zero** rows for the creator themself.
- Private page: zero notifications inserted.
- `kind: "entry"` page: zero notifications inserted.

All four matched the intended behavior exactly. `tsc --noEmit` passes and the migration applied cleanly. Test data (notifications, pages, and the temporary second member) was cleaned up afterward.
