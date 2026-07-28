# Solution: type-aware comparators, duplicate guards, themed dropdowns, and correct "no value" semantics

**Fixed:** 2026-07-28

## What changed

**1. Sort order** — `app/api/databases/[id]/entries/route.ts` and `template-page-client.tsx` both got a `sortKeyFor(value, type, options)` helper that extracts the actual comparable key per property type (a select's `optionId` resolved to its option `name`/label, a real number for Number, boolean for Checkbox, etc.) instead of stringifying the whole value blob. `compareValues`/`compareVals` now take `(a, b, type, options)` and dispatch on the extracted key's runtime type.

**2. Duplicate rules** — all four panels (`sort-bar.tsx`, `filter-bar.tsx`, and the template's `SortPanel`/`FilterPanel`) gained a `usedElsewhere(excludeId/idx)` helper. `add()`/`addSort()`/`addRule()` now picks the first property not already used by another rule; each rule's property dropdown filters out properties used elsewhere; the "Add" button disables (with a tooltip) once every sortable/filterable property already has a rule.

**3. Native selects** — all property/operator/direction/value pickers across the four panels were converted to `components/ui/select.tsx`'s `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`. The template `FilterPanel`'s select-type "value" dropdown needed one adjustment: Radix `Select` items can't have an empty-string value (reserved for "unset"), so an `ANY_OPTION` sentinel string is used and translated to/from `""` at the read/write boundary.

**4. "Any" filter value** — `evaluateFilter` (API route) and `applyFilter` (template client) both now short-circuit to `true` for the `select`/`status` "is"/"is_not" operators when the filter value is empty, before doing the equality check. `is_any_of`/`is_none_of` were left as-is — an empty array there is a real "nothing selected yet" state from the multi-picker, not the same as "unset."

**5. Dropdown selection not registering** — `template-page-client.tsx`'s outside-click handlers for `showFilter`/`showSort` now bail out early when the click target is inside a Select's portaled dropdown (`target.closest('[data-slot="select-content"]')`, the attribute `components/ui/select.tsx` sets on its content), before checking whether it's outside the panel's own ref. The real database's `SortBar`/`FilterBar` (`components/database/sort-bar.tsx`/`filter-bar.tsx`) aren't affected — they render as an inline toolbar strip in `database-page.tsx`, not a floating popup with its own outside-click-to-close listener, so there was nothing to fix there.

## Why this fixes the root cause

Each fix targets the actual mismatch rather than the visible symptom: sorting needed the real display key, not a storage detail (id); duplicate rules needed to be structurally prevented rather than just visually confusing; the native-select swap is a pure presentation change with the same controlled `value`/`onChange` contract; "Any" needed to mean "rule not yet constraining" rather than "match nothing"; and the outside-click handler needed to know that a Radix `Select`'s portal is logically part of the panel that opened it, even though it isn't part of that panel's DOM subtree.

## Verification

`npx tsc --noEmit` passes on all touched files (`app/api/databases/[id]/entries/route.ts`, `components/database/sort-bar.tsx`, `components/database/filter-bar.tsx`, `components/templates/template-page-client.tsx`). `biome check` shows no new findings — the few pre-existing flags (an unused `Check` import in `filter-bar.tsx`, an unused import in the API route, a `noUnusedExpressions` line in the template client) all predate this diff, confirmed via `git diff`. Not independently browser-tested beyond the reported screenshots — worth confirming live that Priority sort now orders Low/Medium/High correctly, "Priority is Any" shows the full list, and picking an option in any Filter/Sort dropdown now actually applies.
