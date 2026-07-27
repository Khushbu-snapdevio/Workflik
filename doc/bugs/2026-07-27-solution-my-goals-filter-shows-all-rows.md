# Solution: write real filter rules at instantiation, and evaluate person/created_by filters at query time

**Fixed:** 2026-07-27

## What changed

1. **`lib/templates/instantiate.ts`** — added `filterKey`/`filterValue` to the `SchemaView` type, and view creation now resolves them into a real `filters` rule: for `person`/`created_by` properties, `filterValue: "me"` becomes `{ propertyId, operator: "is", value: "@me" }` (reusing the same `"@me"` sentinel already used for default values, so it re-evaluates against whoever is actually viewing the view — not whoever instantiated the template); for `select`/`multi_select` properties, the seed's option *name* is resolved into the option's generated id.

2. **`app/api/databases/[id]/entries/route.ts`** — `evaluateFilter()` gained a `case "person": case "created_by":` that reads the `{ userIds: [...] }` value shape (matching every person-value writer in the codebase), resolves `"@me"` against the requesting session's user id, and supports `is`/`is_not`. The function signature now takes `currentUserId`, threaded from the route's own `session.user.id`.

3. **Backfilled already-instantiated views** — since the instantiation fix only affects future templates, directly repaired the persisted `filters` column for every already-created affected view in the dev database: the reported "My Goals" plus the same pattern in Tasks Tracker, Meeting Notes, Issue Tracking, Feature Requests, Projects, Document Hub, and two `Status`-based filtered views ("Published Docs", "Won").

## Why this fixes the root cause

Both halves of the pipeline were silently no-ops: the filter was never written, and the one type of filter these templates need (person/created_by "assigned to me") was never implemented in the evaluator even if it had been written. Fixing both, plus reusing the existing `"@me"` convention instead of inventing a new one, makes "My X" views behave the same way regardless of which workspace member is looking at them.

## Verification

Verified both directions live against the running dev server with two real accounts sharing the workspace: as a user who owns none of the three goals, "My Goals" correctly shows "No entries yet"; as the user who owns exactly one of them, "My Goals" shows exactly that one goal and none of the others.
