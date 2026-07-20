# Solution: silent draft pages, promoted on first meaningful edit

**Fixed:** 2026-07-20

## What changed

1. **`lib/db/schema/pages.ts`** — added `pages.isDraft` (boolean, default `false`; migration `0024_special_clint_barton.sql` via `pnpm db:generate` per Hard Rule 8). Also introduced `lib/pages/constants.ts`'s `DEFAULT_PAGE_TITLE = "Untitled"`, used everywhere draft detection compares against the literal (not a sweep of every unrelated `?? "Untitled"` display fallback elsewhere — those are orthogonal).

2. **`lib/pages/draft.ts`** (new) — `isMeaningfulTitle()` (true once the title is non-empty and isn't still the default) and `isMeaningfulBlockContent()` (true once any block holds real text, or isn't the initial default paragraph type at all — an image, table, heading, etc. the user deliberately chose).

3. **`lib/pages/promote-draft.ts`** (new) — `promoteDraftPage(tx, pageId)`, the single shared place a draft ever gets promoted. Race-safe conditional update (`WHERE id = ? AND is_draft = true`) so a title edit and a content autosave landing near-simultaneously can only promote (and notify) once; reads the promoted row's own `title`/`isPrivate`/`kind`/`createdBy` straight off the `RETURNING` clause — never a request payload or cached value — before calling `triggerPageCreatedNotification`.

4. **`app/api/pages/route.ts`** — a new page starts as a draft only when `kind === "page"` *and* its initial title is still the default; a caller that already supplies a real title (duplicate, template) is never a draft and notifies immediately, same as before.

5. **`lib/notifications/triggers.ts`** — `triggerPageCreatedNotification` gained an `isDraft` param; its existing suppression guard (`isPrivate || kind === "entry"`) now also short-circuits on `isDraft`.

6. **`app/api/pages/[id]/route.ts`** (title PATCH) and **`app/api/blocks/batch/route.ts`** (content autosave) — both call `promoteDraftPage` when their respective edit first makes the page meaningful; `blocks/batch`'s existing `triggerPageUpdateNotification` (for edits by someone other than the creator) is now also gated on `!page.isDraft`, and its response includes a `promoted` flag. Same file's `DELETE` handler skips `triggerTrashWarningNotification` for still-draft pages — a trash warning would leak the existence of a page nobody else was ever told about.

7. **Visibility filtering**, mirroring the existing `isPrivate` pattern exactly (`or(eq(pages.isDraft, false), eq(pages.createdBy, session.user.id))`) in every place that already filtered `isPrivate`: `app/api/workspaces/[id]/pages/tree/route.ts`, `app/api/search/route.ts`, `app/api/workspaces/[id]/pages/stream/route.ts` (so a creator's own draft edits still nudge their own other tabs, never anyone else's), and `app/app/[workspace]/page.tsx`'s Home dashboard page-count/list queries (which, while there, also picked up the equivalent `isPrivate` filter they'd been missing entirely).

8. **UI** — `components/pages/page-draft-context.tsx` + `page-draft-pill.tsx` (new, mirroring `page-privacy-context.tsx` / `page-privacy-pill.tsx`) show a small "Draft" badge next to the title, wired into `app/app/[workspace]/[pageId]/page.tsx`. `components/pages/page-client.tsx` and `components/editor/editor.tsx` clear it live the instant a PATCH/autosave response reports a promotion — no reload. `components/sidebar/page-tree.tsx` shows a small "DRAFT" tag on the creator's own unpromoted pages.

## Why this fixes the root cause

Rather than bolting a delay or a client-side "don't show it yet" flag onto the existing all-or-nothing creation flow, a page now has a real state — draft vs. promoted — that every layer already checks the same way it checks `isPrivate`. Promotion happens exactly once, race-safe, and always reflects the page's actual current DB state rather than whatever the triggering request happened to send.

## Verification

`pnpm db:generate && pnpm db:migrate` applied cleanly; `npx tsc --noEmit` passed. Verified live with two real accounts in one workspace (headless-browser harness): creating a page was completely invisible to the other user (sidebar, bell, Home stats all unchanged); typing a real title promoted it instantly, delivering exactly one notification with the real title and correct sender name to the other user while the creator's own "Draft" badge disappeared without a refresh; deleting an unedited draft produced zero trash-warning notifications.
