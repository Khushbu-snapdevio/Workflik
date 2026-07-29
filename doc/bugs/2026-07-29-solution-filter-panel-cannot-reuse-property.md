# Solution: allow reusing a property across rows, OR them together, AND across distinct properties

**Fixed:** 2026-07-29

## What changed

`components/templates/template-page-client.tsx`:
- `FilterPanel`: removed the `usedElsewhere()` exclusion from every row's property dropdown and from `addRule()`'s default pick — any property can now be selected for any row, including one already used by another row. `atLimit` now only means "no filterable properties exist at all" (`props.length === 0`), not "every property already has a rule".
- Each row past the first now shows a small `and`/`or` connector pill: `or` (warning-colored) if it shares a property with an earlier row, `and` (primary-colored) otherwise — so the new implicit grouping is visible, not silent.
- `displayedEntries`'s filter evaluation now groups `filterRules` by `propertyId` first: within a group, rules OR together (`.some(...)`); across groups (distinct properties), groups still AND together (`.every(...)`) — same overall behavior as before whenever no property repeats.

## Why this fixes the root cause

The blocking behavior was solving a real problem (two ANDed conditions on one property is a contradiction) but with the wrong fix (hiding the option entirely). Grouping by property and OR-ing within a group lets "Priority is Medium" + "Priority is High" as two separate, freely-added rows mean exactly what a user expects — entries matching either — without requiring them to discover the `is_any_of` operator, while properties used only once still behave exactly as before (a group of one rule is equivalent to that rule alone).

## Verification

`npx tsc --noEmit` passes with no new errors.
