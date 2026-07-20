# Bug: "By Status" Board view renders as a table, with no way to switch layout

**Reported:** 2026-07-20

## Symptom

The Goals Tracker's "By Status" view (expected to be a Notion-style Kanban board grouped by the Status property) renders as a plain table — Name / Status / Due date / Priority rows — instead of grouped columns of cards. There was no visible way in the UI to change an existing view's layout to Board either.

## Root cause

Two distinct issues, neither of which was a missing renderer:

1. **The Board renderer already exists and works.** `components/templates/template-page-client.tsx` (the live renderer for every database page — `database-page.tsx` is a separate, less-used path) already switches on `activeView.type` and renders `TemplateBoardView` for `"board"`, with full `@dnd-kit` drag-and-drop, column grouping, card CRUD, etc. The problem was purely that the "By Status" view's `type` in the database was `"table"`, not `"board"` (`group_by_property_id` was also `null`). It was created/seeded as a table that happened to be named "By Status" — so it correctly rendered as a table.

2. **No UI to fix it.** The view context menu (the "⋮" next to each view tab) only offered Rename / Duplicate / Delete — there was no "Layout" option to change an existing view's type. The "Add a view" grid could only ever create a *new* view, never retarget an existing one. So a user stuck with a mis-typed view had no in-product way to convert it. Compounding this, the `PATCH /api/databases/[id]/views/[viewId]` route's `allowed` field list did not include `"type"`, so even a hand-crafted request couldn't change a view's layout.
