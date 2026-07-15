# Bug: deleting a top-level page always redirects to Library instead of the nearest sibling

**Reported:** 2026-07-15

## Symptom

Deleting a nested page already redirects correctly to its parent (fixed in `doc/bugs/2026-07-14-bug-page-delete-redirect.md`). But deleting a **root-level** page, database, or database-kind page with no parent always redirected to `/app/{workspace}/library`, regardless of what else exists at the top level.

Compared to Notion's actual behavior: deleting a top-level item should land the user on the top-level item that was immediately before it (or after it, if it was first); only when it was the sole top-level item should the user land on workspace Home. Deleting a nested entry inside a database or template should still land on that database/template's own page — this part was already correct.

## Root cause

The five call sites that redirect after a page delete (`components/pages/page-actions-menu.tsx`, `components/templates/template-page-client.tsx`, `components/sidebar/page-tree.tsx`, `components/sidebar/private-section.tsx`, `components/pages/trash-banner.tsx`) all shared one fallback rule for the no-parent case: always `/app/{workspace}/library`. That fallback never looked at sibling order at all — Library was used purely because it "lists every page," not because it was the natural next place to land.

Two of the five sites (`page-tree.tsx`, `private-section.tsx`) already had the full, correctly-ordered top-level `pages` array available client-side (with `orderIndex`) and could have computed a sibling directly. The other three (`page-actions-menu.tsx`'s server-rendered callers, `trash-banner.tsx`) only ever received a `parentShortId` derived from the ancestor-chain breadcrumb query, which carries no sibling information for root-level pages.
