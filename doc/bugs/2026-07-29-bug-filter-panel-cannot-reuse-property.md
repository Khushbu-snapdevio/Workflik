# Bug: can't add a second filter row for a property that's already used

**Reported:** 2026-07-29

## Symptom

With a filter row already set (e.g. "Priority is Medium"), opening a second row's property dropdown to pick "Priority" again (intending "Priority is Medium OR High") doesn't offer Priority as an option — only properties not yet used by another rule are listed. There's no way to add a second condition for an already-filtered property from the row-adding flow, even though [2026-07-29-bug-filter-panel-no-multi-value-select.md](2026-07-29-bug-filter-panel-no-multi-value-select.md) had already added an `is_any_of` operator that can express the same thing from a single row.

## Root cause

`components/templates/template-page-client.tsx`'s `FilterPanel` still excluded already-used properties from every row's property `Select` (`usedElsewhere()`), and `addRule()` skipped past already-used properties when picking a default for a new row. That restriction made sense under the old strict AND-across-all-rules evaluation (two ANDed conditions on one property, e.g. "is Medium" AND "is High", could never both be true), but it also blocked the natural UX of just adding a second row for the same property, which is what a user reaches for before they'd know to look for a dedicated "is any of" operator.
