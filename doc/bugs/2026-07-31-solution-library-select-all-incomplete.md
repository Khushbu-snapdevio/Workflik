# Solution: fetch every matching id for "select all", and bulk-delete server-side to keep it safe

**Fixed:** 2026-07-31

## What changed

**`lib/pages/library.ts`** — added `getAllLibraryPageIds(workspaceId, userId, { tab, search })`, an unpaginated, id-only query matching the same tab/search conditions `getLibraryPage` already uses (reuses the "All Pages tab with no search = every non-deleted page" shortcut that `tabCounts.all` already relies on; otherwise applies the same base/search conditions, flat).

**`app/api/workspaces/[id]/pages/library/ids/route.ts`** (new) — `GET ?tab=&search=` wrapping that function, returning `{ ids: string[] }`.

**`app/app/[workspace]/library/library-client.tsx`**:
- `toggleSelectAll` now fetches every matching id from that new endpoint and selects all of them, instead of just `displayRows`'s ids. Deselects instead when the current selection already covers the expected total.
- `allSelected`/`someSelected` now compare `selectedIds.size` against an `expectedSelectAllTotal` (`tabCounts[tab]` normally, or `totalCount` once a search is active, since `tabCounts` doesn't account for search — see the inline comment) instead of comparing against `visibleIds`.
- Added a `selectingAll` loading state (spinner in the header checkbox) while the id fetch is in flight.

**Bulk delete, to keep this safe**: once selection can include ids the client never loaded (e.g. a page on a different pagination page, or a collapsed descendant), the old client-side "fold each selected id up to the topmost *also-selected* ancestor" trick (used to avoid firing a redundant DELETE for a child whose parent's delete already cascaded to it — see `deletePageCascade`'s "already deleted → hard delete" rule) can't work anymore: it only ever looked up parents in the currently-loaded `rows`, so an id outside that set would never get folded, and firing its own DELETE after its ancestor's cascade already soft-deleted it would hard-delete it instead of trashing it.

- **`lib/pages/delete-page.ts`** (new) — extracted the existing single-page soft/hard-delete cascade (previously inline in `app/api/pages/[id]/route.ts`'s DELETE handler) into `deletePageCascade(pageId, userId)`, unchanged in behavior.
- **`app/api/pages/[id]/route.ts`** — DELETE handler now just calls `deletePageCascade` and returns its result.
- **`app/api/workspaces/[id]/pages/bulk-delete/route.ts`** (new) — `POST { ids: string[] }`. Queries `page_closure` for every (ancestor, descendant) pair *within the selected set* to authoritatively determine which selected ids have a selected ancestor (not topmost) and fold them under whichever selected id is topmost — correct for the whole workspace, not just whatever the client had loaded. Deletes only the topmost ids (each exactly once), then reports a per-original-id result back.
- **`library-client.tsx`**'s `handleDeleteSelected` now POSTs the whole `selectedIds` set to this one endpoint instead of computing its own (now-unreliable) fold and firing one DELETE per id.

## Why this fixes the root cause

Selection now comes from a query that matches everything the tab/search actually returns, not from whatever page-size window and expand-state happened to be loaded client-side — so "select all" means all. Moving the parent/child fold into the bulk-delete endpoint means it's computed against `page_closure` (the authoritative source of every ancestor/descendant relationship in the workspace) instead of a client-side map that could only ever see what was already fetched, closing the hard-delete race for selections that span beyond the loaded rows.

## Verification

`tsc --noEmit` and `biome check` are clean on every new/changed file (the two pre-existing files — `library-client.tsx`, `app/api/pages/[id]/route.ts` — carry unrelated pre-existing formatting debt left as-is). Traced the bulk-delete fold logic by hand: for a selection containing a root and one of its grandchildren (depth 2), `page_closure` returns that pair (depth > 0), so the grandchild is excluded from `topmostIds` and folds under the root via `effectiveTopIdOf`; only the root gets an actual `deletePageCascade` call, and the grandchild's result is reported based on the root's outcome — matching the single-request-per-independent-subtree invariant the old client-side code was already trying to guarantee, now correct for any selection regardless of what's loaded.
