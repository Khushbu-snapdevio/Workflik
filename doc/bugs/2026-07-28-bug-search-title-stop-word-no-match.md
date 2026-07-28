# Bug: search can't find a page by its own title if the title is (or contains only) a stop word

**Reported:** 2026-07-28

## Symptom

A page titled "JUst" appeared correctly in the sidebar and in the search dialog's "Recently visited" list, but typing "JUst" into the global search box returned "No results" — even the "Index pages now" manual reindex fallback didn't fix it.

## Root cause

`lib/search/index-page.ts` builds `search_index.search_vector` with `to_tsvector('english', title)`, and `app/api/search/route.ts` queries it with `to_tsquery('english', ...)`. PostgreSQL's built-in `english` text-search configuration treats common words ("just", "the", "and", "is", ...) as **stop words** and strips them to zero lexemes on both sides:

```sql
SELECT to_tsvector('english', 'JUst');  -- → '' (empty — no lexemes at all)
SELECT to_tsquery('english', 'JUst:*'); -- → '' (empty)
```

Since both the stored vector and the search query reduce to nothing, `@@` can never match — regardless of how many times the page is indexed or reindexed. This affects any page whose title *is* or *contains* a stop word, not just "JUst" specifically. `search_index.title` itself was correctly populated and stayed in sync (which is why the sidebar and "Recently visited" — which read `pages.title` directly, not the tsvector — showed the page fine).

Titles are short identifiers, not prose, so `english`'s stemming isn't worth losing stop-word matches for — especially since the search route already does prefix matching (`word:*`), which independently covers most of what stemming would (e.g. `run:*` matches "running").
