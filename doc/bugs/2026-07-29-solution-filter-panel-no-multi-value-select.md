# Solution: port the existing "is any of" / "is none of" pattern from FilterBar into FilterPanel

**Fixed:** 2026-07-29

## What changed

- `components/database/filter-bar.tsx`: exported `MultiOptionPicker` (was file-local) and loosened its `options` prop to the minimal `{ id, name }[]` shape it actually renders, so it's reusable outside this file without requiring the full `SelectOption` type (`color`, `group`, etc.).
- `components/templates/template-page-client.tsx`:
  - `getOperators`'s `select` case gained `is_any_of` ("is any of") and `is_none_of` ("is none of"), matching `filter-bar.tsx`'s existing operator labels.
  - `applyFilter`'s `select` case now checks `Array.isArray(rule.value) && rule.value.includes(optId)` (and the negation) for those two operators, mirroring the same logic already in `app/api/databases/[id]/entries/route.ts`.
  - `FilterPanel`'s value picker now renders the imported `MultiOptionPicker` (checkbox list, multiple selection) when the rule's operator is `is_any_of`/`is_none_of`, instead of the single-value `Select`. Changing the operator resets `value` to `[]` for the multi-value operators (was `""` for single-value).

## Why this fixes the root cause

The underlying AND-across-rules filter architecture didn't need to change — the fix is scoped to what one rule can express. A single `select` rule can now match a *set* of values via one `is_any_of` rule (e.g. Priority is any of [High, Low]) instead of requiring two contradictory ANDed rules on the same property, which is what the user actually needed and is exactly how the app's other (non-template) database filter bar already works.

## Verification

`npx tsc --noEmit` passes with no new errors.
