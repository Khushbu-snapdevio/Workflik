# Bug: "Created by" property is missing from the Meeting Notes template (and never renders once added)

**Reported:** 2026-07-15

## Symptom

Notion's own "Meeting Notes" template has a "Created by" column showing who created each row. Pagevo's version of the same template is missing that column entirely — comparing the two side by side (Pagevo vs. a real Notion workspace), every other property lines up (Date, Category, Attendees) except "Created by".

## Root cause

Two separate defects, both required to explain the missing column:

1. **`created_by` was never a real property type.** The Meeting Notes template's seed data (`app/api/orbit/templates/seed/route.ts`) already listed `{ name: "Created by", type: "created_by" }` in its schema — someone had planned for this — but `created_by` was never added to the Postgres `property_type` enum, the client-side `PropertyType` unions, or the property registry. Worse, `lib/templates/instantiate.ts`'s `SUPPORTED_PROP_TYPES` allowlist silently *dropped* any property whose type it didn't recognize when forking a template into a real database. So using the template never even created the column — the "Created by" property was discarded during instantiation with no error.

2. **Even after wiring up the type**, the column rendered as a permanent empty dash. `components/templates/views/template-table-view.tsx` (the actual live table renderer for a database page — a similarly-named but unrelated `components/database/table-view.tsx` is not what's used here) has its own hardcoded `CellContent` switch over property types with a `default: return <span>—</span>` fallback and no `case "created_by"`.

3. **A third, deeper bug surfaced while fixing #2**: even with a correct `case "created_by"` computing the value server-side, the column still showed "Empty" on first page load. `app/app/[workspace]/[pageId]/page.tsx` (the server component for `/app/[workspace]/[pageId]`) fetches `propertyValues` directly via a raw Drizzle query and passes them straight to `TemplatePageClient` — it never calls the same rollup/formula/created-by computation logic that `app/api/databases/[id]/entries/route.ts` uses. That logic only ran once the client made its *own* fetch (e.g. switching table views), so any computed property type — this affects Rollup and Formula too, not just Created-by — was invisible until a view switch, silently correct-looking on the surface but wrong on the very first render.

## Reproduction (pre-fix)

1. Use the "Meeting Notes" template from the template gallery.
2. Open the new database page — no "Created by" column exists at all.
3. (Once `created_by` is added as a real type) Add a "Created by" property manually to any database via "+ Add property" — the column header appears, but every cell shows "—" regardless of who created the entry, even after a full page refresh.
