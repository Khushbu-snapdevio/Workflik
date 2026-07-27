# Bug: "My Goals" (and every "My X" template view) shows every row, not just the current user's

**Reported:** 2026-07-27

## Symptom

The Goals Tracker template's "My Goals" view was supposed to show only goals owned by the signed-in user, but showed every goal in the database regardless of Owner — including rows with no owner at all and rows owned by a completely different user.

## Root cause

Two independent, stacked bugs, both affecting every "My X"-style template view (Tasks Tracker's "My Tasks", Meeting Notes' "My Notes", Issue Tracking's "My Issues", Feature Requests' "Assigned to Me", Projects' "My Projects", Document Hub's "My Docs" — not Goals-specific):

1. **The filter never made it into the database.** The seed data (`app/api/orbit/templates/seed/route.ts`) declares `{ filterKey: "Owner", filterValue: "me" }`, but `lib/templates/instantiate.ts`'s `SchemaView` type didn't even declare those fields, and the view-insert code never read them or set a `filters:` value — the row was created with the schema default `filters: []`. Confirmed directly against the dev database: every instantiated "My X" view had `filters: []`.

2. **Even a correct filter would have been ignored.** The one filter-evaluation function, `evaluateFilter()` in `app/api/databases/[id]/entries/route.ts`, had no `case` for `person`-type properties at all (only text/number/select/status/checkbox/date) — it fell through to `return true` for every row regardless of the rule. There was also no "current user" resolution anywhere in the filter system; the only existing `"@me"` sentinel in the codebase resolves a property's *default value* on entry creation, not a filter comparison.
