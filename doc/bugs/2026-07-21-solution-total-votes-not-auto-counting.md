# Solution: add a general count() formula function, wire "Total votes" to it

**Fixed:** 2026-07-21

## What changed

**`lib/formula/evaluator.ts`**: `FormulaEvalContext` gained an optional `resolveCount?: (name: string) => number`, and `count(prop("Name"))` is now special-cased in the `"call"` node handler — it requires exactly one argument that's a direct property reference, and calls `resolveCount` instead of the normal evaluate-args-then-call-function path every other function uses. This has to be special-cased rather than added to `FORMULA_FUNCTIONS`: by the time a normal function receives its arguments, `resolveProp` has already collapsed a Person/Multi-select/Relation property down to a scalar (a joined string, or for Relation, already a count) — the underlying list is gone by then. `count()` needs the raw list, so it intercepts the property reference before that collapse happens.

**`lib/databases/compute-values.ts`** (the real, server-side computation — runs on every read, same place Rollup/Created-by/Formula properties are already computed): added `rawToCount()`, returning how many items a Person/Created-by (`_members.length`), Multi-select (`optionIds.length`), or Relation (`entryIds.length`) property holds; anything else throws a clear error. `makeResolveProp` became `makeFormulaResolvers`, now returning both `resolveProp` and `resolveCount` together (both call sites — the recursive formula-references-a-formula case, and the top-level formula computation — updated to match).

**`components/database/formula-config-picker.tsx`** (the client-side live preview shown while authoring a formula expression): got its own parallel `rawToCount()` and a `resolveCount` added to its `evaluateFormulaValue` call, mirroring its existing independent copy of `rawToFormulaValue` (this file deliberately doesn't share code with the server version — see its existing comment).

**`lib/templates/instantiate.ts`** (forks a template's snapshot into a real database page — used by both the template gallery's "Use template" and onboarding): `"formula"` was missing from `SUPPORTED_PROP_TYPES` entirely, so a `type: "formula"` property in a template's schema would have been silently dropped when instantiated. Added it, added `expression?: string` to `SchemaProp`, and added the `config = { expression: p.expression ?? "" }` branch alongside the existing select/multi-select options branch.

**`app/api/orbit/templates/seed/route.ts`**: the "Brainstorm Session" template's "Total votes" property is now `{ name: "Total votes", type: "formula", expression: 'count(prop("Upvoted by"))' }` instead of a plain number, and the `sample_rows` no longer set a `"Total votes": 0` (a formula property is never stored, so a seeded value for it would have been silently ignored anyway).

## Why this fixes the root cause

The two properties were never wired together — "Total votes" needed to actually *be* a computation over "Upvoted by", not a separately-editable number next to it. `count()` gives the Formula system (which already recomputes on every read, with no caching/invalidation to manage) a correct, general way to express that, and it works for any Person, Multi-select, or Relation property in any database — not just this one template — since it's a first-class formula function, not template-specific logic.

## Scope note — existing pages aren't retroactively updated

This fixes the *template*, which only takes effect for a "Brainstorm Session" database created after this change (or after a platform admin re-seeds built-in templates via `POST /api/orbit/templates/seed` with `{"force": true}` — that deletes and recreates every built-in template's row from the current source, so use it with that in mind). A "Brainstorm Session" page created *before* this fix keeps its old plain-`number` "Total votes" property as-is; nothing here retroactively rewrites already-created pages. To fix one by hand: open its "Total votes" column header → Edit property → change the type to Formula → set the expression to `count(prop("Upvoted by"))`.

## Verification

`npx tsc --noEmit` passed with no new errors across all five changed files.
