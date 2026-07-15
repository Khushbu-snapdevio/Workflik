# Solution: fall back to the nearest top-level sibling, then Home

**Fixed:** 2026-07-15

## What changed

1. **`lib/pages/root-sibling.ts`** (new) — `findRootFallback(pages, deletedId)`, a pure function that takes the full page array (with `id`/`parentId`/`orderIndex`), finds the root-level items (same root definition as the sidebar's own tree builder: no `parentId`, or a `parentId` that doesn't resolve within the array), sorts by `orderIndex`, and returns the sibling immediately before the deleted item — or immediately after, if it was first. Returns `null` if it was the only root item. Private and shared root pages share one `orderIndex` axis (there's no separate ordering for the Private section), so they're treated as one combined list, matching how the two sidebar sections stack together.

2. **`components/sidebar/page-tree.tsx`** and **`components/sidebar/private-section.tsx`** — both already hold the full ordered `pages` array client-side, so their `confirmDelete` now computes `parentShortId ?? findRootFallback(pages, id)?.shortId ?? null` and falls back to `/app/{workspace}` (Home) only when that's also `null`.

3. **`app/app/[workspace]/[pageId]/page.tsx`** — added a `rootFallbackShortId` server query, run only when the current page has no ancestors (`breadcrumbs.length === 0`): look up the previous root sibling by `orderIndex` (`ORDER BY orderIndex DESC WHERE orderIndex < page.orderIndex LIMIT 1`), or the next one if there's no previous. Passed down as a new prop to `TemplatePageClient`, `TrashBanner`, and `PageActionsMenu`.

4. **`components/pages/page-actions-menu.tsx`**, **`components/pages/trash-banner.tsx`**, **`components/templates/template-page-client.tsx`** — accept the new `rootFallbackShortId` prop and use `parentShortId ?? rootFallbackShortId ?? null` as the redirect target, falling back to workspace Home (`/app/{workspace}`) instead of Library when there's truly no other top-level item.

Nested-page behavior (redirect to parent) is unchanged — this only touches the no-parent fallback.

## Why this fixes the root cause

The fallback now actually looks at sibling order instead of defaulting to a generic list page. Two different mechanisms compute the same rule depending on what data is already on hand: a pure array function for the two sidebar components that already have the full page list, and a targeted two-query server lookup (previous, then next) for the three components that only ever had ancestor-chain breadcrumbs. Both converge on the same semantics: previous sibling → next sibling → Home.

## Verification

`tsc --noEmit` passes across the whole project (no new errors in any touched file). Not verified in a live browser in this session — worth confirming: with 3 top-level items (a page, a database, a template-kind page), delete the third and check it lands on the second; delete the first of two and check it lands on the second; delete the only top-level item and check it lands on workspace Home; delete a nested entry inside a database/template and check it still lands on that database/template's own page.
