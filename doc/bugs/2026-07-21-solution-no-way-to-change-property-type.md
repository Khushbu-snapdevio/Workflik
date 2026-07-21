# Solution: a real "change type" picker, wired into every edit-property entry point

**Fixed:** 2026-07-21

## What changed

**`components/database/change-property-type-picker.tsx`** (new): `ChangePropertyTypePicker`, modeled on `table-view.tsx`'s existing (unexported) `AddPropertyMenu` — same type list, same Relation/Rollup/Formula sub-picker delegation — but aimed at *changing* an existing property instead of creating a new one:
- Picking a type that isn't in a small `DESTRUCTIVE_TARGET_TYPES` set (`relation`, `person`, `formula`, `rollup`, `created_by` — mirrors the server's own check) commits immediately via the existing `onUpdateProperty` prop.
- Picking one of those shows a `ConfirmDialog` naming the property and warning that existing values will be cleared, then commits with `confirmDestructive: true` on confirm — reusing the backend's already-built destructive-conversion handling rather than adding a second one.
- Picking the property's current type is a no-op close, not a redundant PATCH.

**`components/database/edit-property-panel.tsx`**: the static `{/* Type (locked) */}` row is now a button that opens `ChangePropertyTypePicker` anchored to it. The Select/Status-only option-management UI and "Display as" section are now gated behind an `isSelectType` check (computed from the property's *current* type) instead of being the panel's only reason for existing — so the same panel now works for every property type, not just select-likes. A successful type change calls a new `onChanged` callback (wired to the panel's own `onClose`) rather than just dismissing the type-picker submenu: the panel's local state (`options`, `groupedByStatus`, etc.) is derived once from the property's *original* type via `useState(() => ...)` initializers and won't reactively follow a changed type/config prop, so closing the whole panel avoids a class of stale-derived-state bugs rather than trying to reconcile them.

**`app/api/databases/[id]/properties/[propId]/route.ts`**: `destructiveTypes` expanded from `["relation", "person"]` to also include `formula`, `rollup`, `created_by` — converting *to* any of those discards existing values just as much as converting to Relation/Person does, since all three are computed on every read and never consult `property_values` at all; anything stored under the old type would've become silently unreachable rather than just stale.

**Every "Edit property" entry point** — `table-view.tsx`'s column header menu and its `PropHeaderMenu`, `entry-properties-panel.tsx` (the entry detail page), and `template-table-view.tsx`'s equivalent column header (full-page databases and templates share this component) — had their `SELECT_TYPES`-only gates widened to `!prop.isSystem`, and all eight `EditPropertySidePanel` call sites (`table-view.tsx` ×2, `board-view.tsx`, `entry-context-menu.tsx`, `entry-properties-panel.tsx`, `template-table-view.tsx` ×2, `template-board-view.tsx`) now thread through the two new props (`properties`, `workspaceId`) the type-picker's Formula/Rollup/Relation sub-pickers need.

## Scope boundary

`board-view.tsx`'s own edit-property entry point (opened from a Status cell specifically, for that view's Display-as/Wrap-content) and `entry-context-menu.tsx`'s value-popover-triggered path were left at their existing, narrower trigger conditions — only the props needed to compile against the panel's new required props were added there. The two entry points a first-time user actually hits (a table's column header, and a database entry's own property list) are the ones fully widened.

## Why this fixes the root cause

The backend was already correct and complete; the fix is entirely about giving the frontend a way to reach it. Reusing `AddPropertyMenu`'s exact type-list/sub-picker pattern (rather than inventing a new one) and the server's own existing destructive-conversion handling (rather than duplicating value-clearing logic client-side) means "change type" behaves identically to "add property" for config, and identically to the server's own safety check for anything destructive — no new conversion logic to keep in sync with either.

## Verification

`npx tsc --noEmit` passed with no errors across all eleven touched files plus the two new ones. `biome check` on `edit-property-panel.tsx` shows the same finding categories before and after (attribute-sort, exhaustive-deps, a pre-existing `noNegationElse` on unrelated code) — no new categories introduced, confirmed via `git stash` comparison.

Not verified live in a real browser — same limitation as the rest of this session (no test credentials for the local dev instance). Please try changing a property's type — including a destructive one, to see the confirmation dialog — and let me know if anything doesn't work as expected.
