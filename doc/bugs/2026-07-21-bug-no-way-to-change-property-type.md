# Bug: no way to change an existing property's type anywhere in the UI

**Reported:** 2026-07-21

## Symptom

CLAUDE.md documents: "Change type: Click header → 'Edit property' → change type → existing values converted where possible; destructive conversions (→ Relation, → Person) require explicit confirmation and clear all existing values." In practice, this didn't exist. Concretely: a database's "Total votes" property was stuck as a plain Number with no way to turn it into the `count(prop("Upvoted by"))` Formula that would make it auto-update (see the paired fix in this doc series, `2026-07-21-*-total-votes-not-auto-counting.md`) — not because of anything wrong with Formula properties, but because there was no way to change *any* existing property's type at all, from any view.

## Root cause

The "Edit property" entry point existed in several places (table column header menu, the entry detail page's property list, a database row's right-click context menu, Board view's grouping-property panel, and the template/full-page-database equivalents of table and board view) — but every one of them opened the same `EditPropertySidePanel`, which only ever supported renaming and managing Select/Status/Multi-select options. Its "Type" row was static text, explicitly commented `{/* Type (locked) */}`. Most of those entry points also only revealed the "Edit property" button in the first place for `select`/`status`/`multi_select` properties, so even the option-management-only panel was unreachable for anything else.

Formula/Rollup/Relation configuration *did* exist as real, working UI (`FormulaConfigPicker`, `RollupConfigPicker`, `RelationDatabasePicker`) — but only reachable from "+ Add property" when creating a brand-new property, never for converting one that already existed.

The backend, on the other hand, was already fully built for this: `PATCH /api/databases/[id]/properties/[propId]` already accepted `type`/`config`, already detected a destructive conversion (converting to Relation or Person) and returned a `400` with the affected value count unless `confirmDestructive: true` was passed, and already cleared old values on a confirmed destructive change. The entire gap was on the frontend — nothing ever called this endpoint with a new `type`.

## Reproduction

1. Open any database, right-click a column header (or a property on an entry's own page) → "Edit property" (only shown at all for Select/Status/Multi-select).
2. The panel shows Name and a static, unclickable "Type" row — no way to change it, for any property.
