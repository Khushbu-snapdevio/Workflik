# Bug: Global search "Any type" / "Any time" filters don't work

## What's broken (user's perspective)

In the global search (Ctrl+K), the **type** filter ("Any type / Pages / Entries /
Comments") and the **time** filter ("Any time / Past 24h / 7d / 30d") have no useful
effect — changing them doesn't meaningfully change the results. Database entries also
don't appear in search at all.

## Root causes

The frontend ([components/search/search-dialog.tsx](../../components/search/search-dialog.tsx))
and the API ([app/api/search/route.ts](../../app/api/search/route.ts)) both wire the
filters correctly. The problem is in how the search index is populated.

1. **Everything was indexed as `source_type = "page"`.**
   [lib/search/index-page.ts](../../lib/search/index-page.ts) hardcoded `sourceType:
   "page"` and ignored the page's `kind`. So database rows (`kind = "entry"`) were never
   indexed as `"entry"`, and comments were never indexed at all. The type filter's
   `sourceType = 'entry'`/`'comment'` conditions therefore matched nothing, and "Pages"
   returned everything — the filter couldn't distinguish anything.
   Verified on real data: 3 entries existed but the index held only `page` rows.

2. **Entries weren't indexed on creation.** The entry-create path
   ([app/api/databases/[id]/entries/route.ts](../../app/api/databases/%5Bid%5D/entries/route.ts))
   used `createPageWithClosure` without calling the indexer, so entries only entered the
   index via a manual reindex — and even then as `"page"` (bug #1).

3. **The date filter used the index row's time, not the page's edit time.** The API
   filtered/sorted on `searchIndex.updatedAt`, which a reindex bumps to "now" for every
   row. So every result looked "recent" and the time filter had no real effect (and it
   never matched the "last edited" time shown elsewhere).

4. **"Comments" filter can never work** — no code writes comment bodies to
   `search_index`, so the option could only ever return empty.

## 5. Filters have no effect with an empty query

With the search box empty, the dialog always showed the (unfiltered) "Recently
visited" list. Selecting a type/date filter without typing therefore looked like it did
nothing — the recents ignored the filter. There was no way to simply *browse* "all
entries" or "everything edited in the past 24h".

## Not fixed (noted)

- **Body/content search** — `search_vector` is built only from the page title
  (`to_tsvector('english', title)`), so search is title-only regardless of the "Title
  only" toggle. Full-body search would require indexing block content.
- **Comment search** — not implemented (see #4).
