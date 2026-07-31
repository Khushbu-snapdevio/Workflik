# Bug: Library's "select all" only selects the current page's visible rows, not every page

**Reported:** 2026-07-31

## Symptom

On the Library page, with "All Pages" showing a total of 66, clicking the header "select all" checkbox selected only 15 (the current pagination page's row count) instead of all 66. Sub-pages of a collapsed parent weren't selected either, even though they matched the filter.

## Root cause

`app/app/[workspace]/library/library-client.tsx`'s `toggleSelectAll` selected `visibleIds` — the ids in `displayRows`, which is:

1. Bounded by pagination — `rows` (and therefore `displayRows`) only ever holds the current page-size window of results, not every page matching the tab/search (`lib/pages/library.ts`'s `getLibraryPage` is genuinely paginated — see its own comments on why).
2. Bounded by tree expansion — `buildDisplayRows` only includes a parent's children once that parent's id is in `expandedIds` (collapsed by default), so a collapsed parent's children were excluded from `visibleIds` even when they were part of the loaded `rows`.

So "select all" only ever meant "select whatever happens to be both loaded on this page AND currently expanded" — nowhere close to literally all 66 matching pages.
