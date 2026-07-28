# Bug: database Sort and Filter panels had several correctness and UX issues

**Reported:** 2026-07-28

## Symptom

Working through the Sort and Filter panels on a database view ("Brainstorm Session") surfaced four related issues in the same UI area:

1. **Wrong sort order on Select properties.** Sorting by "Priority" (Low/Medium/High) didn't produce alphabetical or any sensible order — rows looked randomly ordered regardless of A→Z / Z→A.
2. **Duplicate sort/filter rules allowed.** "Add sort" / "Add filter" let the same property be picked more than once (e.g. two "Priority" rules), and each rule's property dropdown didn't exclude properties already used elsewhere.
3. **Native, unstyled dropdowns.** The property/operator/direction/value pickers in these panels rendered as the browser's own unstyled `<select>` popup instead of matching the app's design system.
4. **"Any" filter value hid every row.** Adding a filter on a Select property defaulted to "Any" and immediately showed zero rows instead of leaving the list unfiltered; switching to a specific option looked broken too since there was no visible baseline to contrast against.
5. **Selecting any dropdown option did nothing.** After converting the pickers to the themed `Select` (point 3), clicking an option in the template's Filter/Sort panels just closed the dropdown without applying the choice — property, operator, and value pickers were all affected.

## Root cause

All four trace back to two duplicated implementations of the same panels — `components/database/sort-bar.tsx` + `components/database/filter-bar.tsx` (real databases) and the `SortPanel`/`FilterPanel` functions inside `components/templates/template-page-client.tsx` (template previews) — plus their backing comparator/filter functions:

1. Both sort comparators (`compareValues` in `app/api/databases/[id]/entries/route.ts`, `compareVals` in `template-page-client.tsx`) were type-agnostic: they `JSON.stringify`'d the whole stored value and did a lexicographic string compare. A select property's value is `{ optionId: "<uuid>" }`, so this sorted by the random generated id, not the option's label.
2. `add()`/`addSort()`/`addRule()` in all four panel implementations always defaulted to the first property in the list regardless of what other rules already used, and each rule's property dropdown rendered the full unfiltered list — nothing prevented picking the same property twice.
3. All four panels used plain HTML `<select>`/`<option>` elements instead of this app's own themed `components/ui/select.tsx` (Radix-based), whose dropdown can't be restyled to match native OS chrome.
4. Both filter evaluators (`evaluateFilter` in the API route, `applyFilter` in the template client) did a literal `optionId === filterValue` check for the `select`/`status` "is"/"is_not" operators. A freshly-added filter rule (or the "Any" choice) stores `""` as its value, and `optionId === ""` is false for every real row — so the unset/"no constraint" state actively filtered everything out instead of matching everything.
5. `template-page-client.tsx`'s Filter/Sort panels close themselves on outside click via a document `mousedown` listener that checks `filterPanelRef.current.contains(e.target)` / `sortPanelRef.current.contains(e.target)`. Radix `Select` (introduced by the point-3 fix) portals its open dropdown to `document.body` — a sibling of the panel's own DOM subtree, not a descendant — so a click on an option was never `contains`ed by either ref. Since `mousedown` fires before Radix's own `click`-based selection commits, this handler unmounted the whole panel out from under the click before the value change could apply.
