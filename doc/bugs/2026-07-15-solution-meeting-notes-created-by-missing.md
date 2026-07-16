# Solution: make `created_by` a real, computed property type end-to-end

**Fixed:** 2026-07-15

## What changed

**Made `created_by` a first-class property type**, following the exact pattern already used for Rollup/Formula (computed server-side, never stored):

- `lib/db/schema/types.ts` — added `"created_by"` to the `property_type` Postgres enum; generated migration `drizzle/0020_powerful_scalphunter.sql` (`ALTER TYPE ... ADD VALUE`).
- `components/database/types.ts` and `components/database/property-registry.ts` — added `"created_by"` to the `PropertyType` union, plus a `PROPERTY_REGISTRY`/`PROPERTY_TYPE_ICON` entry (👤 / `User` icon, `emptyValue: null`, matching Rollup/Formula's "computed, no meaningful empty value" reasoning).
- `app/api/databases/[id]/properties/route.ts` and `.../properties/[propId]/route.ts` — added `"created_by"` to both `VALID_PROPERTY_TYPES` allowlists.
- `lib/templates/instantiate.ts` — added `"created_by"` to `SUPPORTED_PROP_TYPES` so it's no longer silently dropped when a template is forked into a real database.

**Extracted the computed-value logic into a shared module** so it can't drift between the two places entries actually get rendered:

- New `lib/databases/compute-values.ts` — `computeRollupValues`, `computeCreatedByValues` (new), `computeFormulaValues`, and their shared helpers, unified behind one `computeDerivedValues(properties, entries, valMap)` entry point that runs them in dependency order (Rollup → Created-by → Formula, so a Formula can reference either) and merges results into `valMap`.
- `app/api/databases/[id]/entries/route.ts` — now imports and calls `computeDerivedValues` instead of three local copies of this logic.
- `app/app/[workspace]/[pageId]/page.tsx` — **the real fix for the "Empty on first load" bug** — now calls the same `computeDerivedValues` after its own raw `propertyValues` query, so Rollup/Formula/Created-by all render correctly on the very first server-rendered paint, not only after a client-side view switch. Also added `createdBy: pages.createdBy` to this file's entries `select()`, which was previously missing it.

**Rendered the value.** `components/database/cells/cell-display.tsx` — folded `"created_by"` into the existing `"person"` case (the value is saved in the identical `{ userIds, _members }` shape, just always a single read-only user). `components/templates/views/template-table-view.tsx` — the actual live table renderer (a separate, similarly-named `components/database/table-view.tsx` turned out to not be what's used here) — added a `case "created_by"` to its `CellContent` switch, rendering via `CellDisplay` with no click handler (read-only, like Rollup/Formula), plus a matching case in its local `getPropertyText` helper for copy/comment-quote support.

## Why this fixes the root cause

The property type now exists everywhere the system checks a type against an allowlist, the template no longer silently loses it during instantiation, and — critically — both places that ever render a database's entries (the live API route and the initial server-rendered page) now run through the identical computation function. Before, only the API route knew how to compute Rollup/Formula/Created-by, so anything relying on the initial server render (every fresh page load) saw a blank value.

## Verification

`tsc --noEmit` passes. Live-tested against a real Postgres dev DB (not just typecheck): signed in via a real magic-link session, used the "Meeting Notes" template via `POST /api/templates/:id/use`, and confirmed via a headless-browser screenshot that the "Created by" column shows the correct creator's avatar + name on every row of a freshly loaded page (not just after switching views). Migration `0020` applied cleanly via `pnpm db:migrate`.
