# Solution: Make the search type & time filters work

## What changed

1. **Classify entries correctly** —
   [lib/search/index-page.ts](../../lib/search/index-page.ts) now derives
   `sourceType = kind === "entry" ? "entry" : "page"`. It also deletes any existing index
   row for the page (keyed on `sourceId` alone) before inserting, so a kind change can't
   leave a stale differently-typed row behind (one row per page, always the right type).
   The helper's param type gained `"delete"`.

2. **Reindex is now a clean rebuild** —
   [app/api/search/reindex/route.ts](../../app/api/search/reindex/route.ts) deletes the
   workspace's index rows, then re-inserts every non-deleted page via
   `upsertPageSearchIndex` (so existing rows previously mis-classified as `"page"` are
   corrected, including the database and its entries).

3. **Index entries on creation** —
   [app/api/databases/[id]/entries/route.ts](../../app/api/databases/%5Bid%5D/entries/route.ts)
   calls `upsertPageSearchIndex` inside the create transaction, so new entries are
   searchable (and match the "Entries" filter) immediately.

4. **Date filter uses the page's real edit time** —
   [app/api/search/route.ts](../../app/api/search/route.ts) filters, orders, and returns
   `pages.updatedAt` instead of `searchIndex.updatedAt`. The time filter now reflects when
   content was actually edited and matches the "last edited" shown elsewhere.

5. **Removed the non-functional "Comments" type option** —
   [components/search/search-dialog.tsx](../../components/search/search-dialog.tsx) — until
   comment indexing exists, so the filter set only offers what actually works.

6. **Filter-only browse (empty query + active filter)** —
   [app/api/search/route.ts](../../app/api/search/route.ts) now allows an empty query when
   a type/date filter is active: it skips the text-match condition, orders purely by
   `pages.updatedAt`, and returns the matching items (empty-query browse isn't logged to
   analytics). [components/search/search-dialog.tsx](../../components/search/search-dialog.tsx)
   shows "Recently visited" only in the true idle state (no query **and** no filter); with
   a filter active it browses and renders results, or a "Nothing matches these filters"
   empty state (with the reindex button) instead of the misleading recents list.

## Applying to existing data

Existing indexes still hold the old (all-`page`, entries-missing) rows. A **reindex**
rebuilds them correctly: search any entry's title (which currently returns nothing) and
click **"Index pages now"**, or `POST /api/search/reindex?workspaceId=…`. Verified on real
data: after the rebuild the index holds 3 `entry` + 5 `page` rows (was 4 `page`), so the
Entries filter and entry search work.

## Verified

Read-only DB check confirmed 3 entries existed while the index held only `page` rows, and
that the new classification yields the correct `entry`/`page` split. Type-checks clean.
