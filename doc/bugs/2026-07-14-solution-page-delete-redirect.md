# Solution: deleting a page now redirects to its parent page

**Fixed:** 2026-07-14

## What changed

Fixed all five inconsistent delete-and-navigate implementations found in [2026-07-14-bug-page-delete-redirect.md](2026-07-14-bug-page-delete-redirect.md) so each one follows the same rule: redirect to the deleted page's parent if it has one, otherwise fall back to **Library** (`/app/{workspaceSlug}/library`). No shared helper was introduced — each site already had (or now has) the parent's `shortId` available locally; the fix was removing the places that discarded it.

This went through two passes: the first pass fixed all five sites to fall back to workspace home, which was corrected after user feedback clarified the fallback should be Library instead (workspace home is a dashboard; Library is the actual page list a root-level page was most likely opened from). The snippets below reflect the final, corrected version.

1. **`components/pages/page-actions-menu.tsx`** — the database-page short-circuit branch now builds its redirect target from `parentShortId` the same way the regular-page branch below it already did, instead of hardcoding workspace home. The regular-page branch's two outcomes (`"soft"` vs `"permanent"` delete) were also collapsed into one, since both now resolve to the identical parent-or-Library target — the `res.json()` parse that distinguished them was no longer needed for anything else.

2. **`components/templates/template-page-client.tsx`** — its `<PageActionsMenu>` call now passes `parentShortId={breadcrumbs[breadcrumbs.length - 1]?.shortId ?? null}`, computed from `breadcrumbs`, which was already in scope in this component but never threaded through.

3. **`components/sidebar/page-tree.tsx`** — `confirmDelete` no longer special-cases `node.kind === "database"` to force `parentShortId = undefined`; it now always looks up the parent from the already-loaded `pages` array (`pages.find(p => p.id === node.parentId)?.shortId`), regardless of page kind.

4. **`components/sidebar/private-section.tsx`** — identical fix to #3 (this file's `confirmDelete` was a direct copy of page-tree.tsx's).

5. **`components/pages/trash-banner.tsx`** — added an optional `parentShortId` prop, used in `handlePermanentDelete`'s redirect. Threaded in from `app/app/[workspace]/[pageId]/page.tsx`, which already computes `breadcrumbs` for the same page and now passes `parentShortId={breadcrumbs[breadcrumbs.length - 1]?.shortId ?? null}` into `<TrashBanner>`.

## Why this fixes the root cause

The root cause wasn't one bug repeated by copy-paste of a single function — it was the same *rule* being reimplemented five times, with three of those reimplementations independently dropping the parent lookup specifically for the database-page case, and one (`trash-banner.tsx`) never having parent information plumbed to it in the first place. Each fix restores exactly the "use the parent I already have" logic, now consistently pointed at Library as the fallback instead of workspace home.

## Verification

`tsc --noEmit` passes across the whole project after all edits (both passes). Not verified in a live browser (no browser automation tool available in this environment) — worth clicking through: delete a database page with a parent, delete a root-level database page (should land on Library), and permanently delete a trashed page with no parent from Trash (should also land on Library).
