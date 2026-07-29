# Bug: can't filter a select property by more than one value at once

**Reported:** 2026-07-29

## Symptom

In a template/gallery database view's Filter panel, a `select`-type property (e.g. "Priority") can only be filtered against a single value ("is High" or "is not High"). There's no way to show entries matching either of two values (e.g. Priority is High OR Low) — and the panel actively blocks adding a second filter rule for the same property (`usedElsewhere()` excludes already-used properties from the property picker), so there's no workaround via a second rule either.

## Root cause

`components/templates/template-page-client.tsx`'s `FilterPanel` only implemented `is`/`is_not` operators for `select` properties (`getOperators`'s `case "select"`), each taking a single value. Blocking duplicate-property rules is actually correct given the panel's AND-across-rules semantics (`filterRules.every(...)` in the `displayedEntries` memo) — two rules on the same property ANDed together ("is High" AND "is Low") could never match anything, so allowing that would just be a dead end, not a real fix.

The real gap: the "real" (non-template) database's `FilterBar` (`components/database/filter-bar.tsx`) already solves exactly this with `is_any_of`/`is_none_of` operators plus a multi-checkbox `MultiOptionPicker`, and the server-side filter evaluation in `app/api/databases/[id]/entries/route.ts` already supports those operators too — `TemplatePageClient`'s `FilterPanel` was just never given the same capability.
