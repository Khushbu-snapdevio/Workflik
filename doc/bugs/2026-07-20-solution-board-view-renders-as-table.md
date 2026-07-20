# Solution: add a "Layout" picker to change an existing view's type

**Fixed:** 2026-07-20

## What changed

1. **`app/api/databases/[id]/views/[viewId]/route.ts`** — added `"type"` to the PATCH handler's `allowed` field list, so a view's layout can actually be persisted (it was silently dropped before).

2. **`components/templates/template-page-client.tsx`** (the live database renderer) — added a **Layout** entry to the per-view "⋮" context menu, between Rename and Duplicate. Selecting it swaps the small context menu for a 4-tile layout picker (Table / Board / Calendar / Gallery, matching the existing "Add a view" grid's visual language), with the current type marked active (checkmark + primary tint) and a back arrow to return. Picking a type calls a new `changeViewType(viewId, type)` callback that optimistically updates local state and PATCHes `{ type }`. Reused the same `viewMenuTarget`/`viewMenuRect` portal and `closeAllToolbarPopups`/outside-click plumbing the existing menu already had — one new `showLayoutPicker` boolean toggles between the two menu contents.

Switching an existing view to Board with no group-by set needs no extra step: `template-page-client.tsx` already had an "auto-wire board group property" effect (keyed on `activeView.type === "board" && !groupByPropertyId`) that finds — or creates — a Select/Status property and persists it as the view's `groupByPropertyId`. Converting a view to Board now triggers exactly that same path, so it lands on a real grouped Kanban rather than the "no group-by property" empty state.

The parallel (less-used) `components/database/toolbar.tsx` + `app/api/databases/[id]/views/[viewId]/route.ts` path used by `components/database/database-page.tsx` got the equivalent Layout menu + picker too, so both database renderers behave the same.

## Why this fixes the root cause

The Board renderer, drag-and-drop, grouping, and data layer were all already built and correctly wired — the actual gap was (a) the seed data typed this specific view as a table, and (b) there was no user-facing control to correct a view's layout after creation. Adding a Layout picker (plus allowing `type` through the PATCH endpoint) is the general fix: it works for *any* database view, driven entirely by the view's stored `type`, not hardcoded for Goals Tracker. Converting "By Status" to Board immediately produces the expected three-column Kanban (Not started / In progress / Done) with the goals as draggable cards.

## Verification

`npx tsc --noEmit` passed. Verified live in the browser against the real "Goals Tracker" database (using a temporary QA member added to — then removed from — the workspace, never touching the owner's account): opened the "By Status" view's "⋮" menu → Layout → Board; confirmed the view converted to a proper Kanban with columns "Not started" / "In progress" / "Done", each goal as a card in the correct column, "+ Add card" at the bottom of each column, and item counts beside each column title. Confirmed the change persisted to the DB (`type: 'board'`, `group_by_property_id` set to the real Status property). The entries' own Status values were left unchanged. Temporary test users and their workspace membership were removed afterward; the database's own data was untouched.
