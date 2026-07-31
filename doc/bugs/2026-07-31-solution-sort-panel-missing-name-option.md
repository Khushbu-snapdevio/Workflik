# Solution: expose Name in the Sort panel via the existing `__title__` sentinel

**Fixed:** 2026-07-31

## What changed

**`components/templates/template-page-client.tsx`**

- Added `TITLE_SORT_ID = "__title__"` next to `SYSTEM_TYPES` — deliberately the same sentinel `app/api/databases/[id]/entries/route.ts` already sorts on, so a saved view sort round-trips through the server refetch path (view switching / entry reload) and produces the same order the client computes.
- `SortPanel` now builds its dropdown from `[{ id: TITLE_SORT_ID, name: "Name" }, ...non-system properties]` instead of the raw property list. The list is narrowed to `{ id, name }[]` — the only two fields the panel reads — so no fake `DatabaseProperty` has to be fabricated for a column that has no property row. `atLimit` counts Name too, so "Add sort" stays enabled while Name is still unused.
- The `displayedEntries` comparator special-cases `rule.propertyId === TITLE_SORT_ID`, comparing `{ text: a.title }` / `{ text: b.title }` through the existing `compareVals` (its default branch reads `value.text`), so null-handling and asc/desc inversion stay identical to every other property.

No server change was needed — the `"__title__"` branch in the entries route already existed and is now actually reachable.

## Why this fixes the root cause

The gap was that Name has no `database_properties` row, so anything derived from the property list structurally couldn't offer it. Prepending a synthetic option keyed by the sentinel the API already understands closes the gap at both ends — the picker can offer it, and both the client comparator and the server's sort path resolve it to `pages.title` — without inventing a `"title"` property type, which would mean a schema enum change and a migration for every existing database.

## Verification

`tsc --noEmit` is clean. Confirmed by grep that nothing else resolves a sort rule's `propertyId` back to a property (the template views take pre-sorted entries; `template-table-view.tsx` has no column-header sort menu), so a rule carrying the sentinel can't hit a "property not found" path anywhere else.

## Not covered

The inline/embedded database (`components/database/sort-bar.tsx`, used by editor reference blocks) has the same missing-Name gap. It's a separate component whose property list comes from `/api/databases/[id]/properties`, and it was out of scope for this fix.
