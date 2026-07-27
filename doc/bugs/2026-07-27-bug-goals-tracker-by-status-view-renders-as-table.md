# Bug: "By Status" template views render as a table instead of a Kanban board

**Reported:** 2026-07-27

## Symptom

The Goals Tracker template's "By Status" view (and the same "By Status" view in several other built-in templates) was supposed to render as a Kanban board grouped into Not Started / In Progress / Done columns, but rendered as a plain table identical to "All Goals".

## Root cause

`app/api/orbit/templates/seed/route.ts` seeded these views with `type: "table"` while still carrying a `groupBy: "Status"` field:

```ts
{ name: "By Status", type: "table", groupBy: "Status" },
```

`lib/templates/instantiate.ts` only resolves `groupBy` into an actual `groupByPropertyId` when `type === "board"` — with `type: "table"`, that branch never runs, so the grouping was silently dropped and the view was created as an ordinary table. `BoardView` (`components/database/board-view.tsx`) itself was already fully built and working; it simply never got selected because the persisted `type` was wrong. The same copy-pasted mistake appeared in Task Tracker, Content Calendar, Social Media Planner, and Event Management's "By Status" views.
