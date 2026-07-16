# Solution: render created_by in the entry panel, and compute values in the per-entry endpoint

**Fixed:** 2026-07-15

## What changed

1. **`app/api/entries/[id]/property-values/route.ts`** — the endpoint `EntryPropertiesPanel` fetches from now calls the shared `computeDerivedValues` helper (`lib/databases/compute-values.ts`, already used by the entries-list API route and the page's server component) after loading the entry's stored `propertyValues`. It fetches the entry's own database properties (via `entry.databaseId`), builds the same `valMap`, and appends Rollup/Formula/Created-by results in the same `{ id: "computed:...", entryId, propertyId, value }` shape as every other caller — so this third data source now agrees with the other two instead of being the one place still returning raw, incomplete data.

2. **`components/database/entry-properties-panel.tsx`** — added a dedicated render branch for `prop.type === "created_by"`, alongside the existing `INLINE_TYPES`/`POPOVER_TYPES` branches: renders via the shared `CellDisplay` (now also passed `workspaceId`, previously missing from this call site) with no click handler — matches Rollup/Formula in spirit: computed and read-only, nothing to open a popover for.

## Why this fixes the root cause

The blank cell had two independent causes and both needed fixing: the panel had genuinely never learned how to render this type, and even a correct render case would have shown nothing because the data it receives never included the computed value in the first place. Fixing only the render branch would have kept showing "Empty" forever; fixing only the endpoint would have changed nothing since the component still wouldn't know how to display what it got back.

## Verification

`tsc --noEmit` passes. Live-tested against the real dev DB: added a "Created by" property to the existing "Tasks Tracker" database, opened one of its entries ("Improve website copy") as a full page, and confirmed via a headless-browser screenshot that the "Created by" row now shows the correct creator's avatar + name (previously fully blank) alongside the existing "Assignee" row, both rendering correctly.
