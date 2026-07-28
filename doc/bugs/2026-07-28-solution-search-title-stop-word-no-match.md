# Solution: search title stop-word no-match

**Fixed:** 2026-07-28

## Change

Switched the Postgres text-search configuration from `english` to `simple` everywhere `search_index.search_vector` is built or queried, so it's consistent on both the write and read side:

- `lib/search/index-page.ts` — `to_tsvector('english', title)` → `to_tsvector('simple', title)`.
- `app/api/search/route.ts` — the `titleOnly` vector condition, the main `searchVector` match condition, and `ts_rank()` all switched from `'english'` to `'simple'`.

`simple` has no stop-word list and no stemming — it just lowercases and tokenizes, so a title that's or contains a word like "just", "the", or "and" still produces real lexemes instead of an empty vector.

Existing `search_index` rows were built with the old `'english'` vectors, so switching only the query side would have made previously-matching stemmed titles (e.g. an `'english'`-stemmed "Running" → lexeme "run") stop matching against the new `'simple'`-built queries. Added `scripts/reindex-search-simple-config.ts` (a one-off backfill, following the existing `scripts/migrate-voting-properties.ts` pattern) to rebuild every existing page's `search_index` row under the new config, and ran it against the dev database (18 pages reindexed).

## Why this fixes the root cause

The bug wasn't a missing indexer call or a missing Postgres trigger — `upsertPageSearchIndex` was already being invoked correctly on page create, title rename, and manual reindex. The actual defect was that `english`'s stop-word stripping silently reduced short titles like "JUst" to an empty tsvector/tsquery on both sides of the `@@` comparison, so no amount of reindexing could ever produce a match. Using `simple` removes the stop-word list entirely while keeping the same prefix-matching (`word:*`) behavior the search route already relies on, so normal titles (verified against "Brainstorm Session", "Launch back to school campaign", etc.) still match exactly as before.
