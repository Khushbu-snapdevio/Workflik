# Solution: correct the seed's view type, and backfill already-instantiated views

**Fixed:** 2026-07-27

## What changed

1. **`app/api/orbit/templates/seed/route.ts`** — changed `type: "table"` to `type: "board"` for the five "By Status" views that group by a valid groupable property (a `select` property): Task Tracker, Goals Tracker, Content Calendar, Social Media Planner, Event Management. Fixes all *future* template instantiations.

2. **Left one occurrence unchanged** — "Docs by Category" in the Engineering Docs template groups by `Category`, a `multi_select` property. Board grouping only supports `select`/`status`/`checkbox`/`person` (`GROUPABLE_TYPES` in `components/database/grouping.ts`), so converting that one to `type: "board"` would not have worked correctly; it's a separate, lower-priority issue.

3. **Backfilled the already-instantiated database row** for the specific Goals Tracker page reported — since fixing the seed alone doesn't retroactively update pages already created from it, directly updated that page's "By Status" `database_views` row to `type: "board"` with `groupByPropertyId` pointing at the Status property.

## Why this fixes the root cause

The instantiation code (`lib/templates/instantiate.ts`) was already correct — it just never ran its board-grouping branch because the seed told it the view was a table. Fixing the seed's `type` field is sufficient for every future instantiation; the direct backfill was necessary only because a Postgres row written under the old, wrong seed data doesn't self-correct when the seed changes.

## Verification

Queried the backfilled view row directly: `type: 'board'`, `groupByPropertyId` correctly set to the Status property's id, confirmed to belong to the reported "Goals Tracker" page.
