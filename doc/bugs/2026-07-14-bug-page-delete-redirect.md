# Bug: deleting a page doesn't redirect to its parent page

**Reported:** 2026-07-14

## Symptom

When a user opens a page (e.g. found via Library) and deletes it from within that page, the app redirects to the workspace home (or, depending on the entry point, some other non-parent destination) instead of going back to the page's parent — the natural "where was I" location.

Expected: deleting any page, from anywhere in the app, should redirect to that page's parent. Only a page with no parent (a root-level page) should fall back — and that fallback should be **Library** (which lists every page), not workspace home. This was clarified after an initial round of fixes that fell back to workspace home instead — Library is the correct fallback, since it's the "where was I" page list a root-level page was most likely opened from, not the dashboard-style workspace home.

## Root cause

There is no single shared "delete a page and navigate away" implementation — four separate places each reimplement this logic, and three of them diverge from the "go to parent" rule for database pages specifically:

1. **`components/pages/page-actions-menu.tsx`** (`confirmDelete`) — the topbar "⋯" menu. For regular pages it correctly falls back to a `parentShortId` prop. But for `pageKind === "database"` it short-circuits to workspace home *unconditionally*, ignoring `parentShortId` even when one exists.

2. **`components/templates/template-page-client.tsx`** — the topbar for database pages calls the same `PageActionsMenu`, but never passed it a `parentShortId` prop at all, even though `breadcrumbs` was already available in the same component. So the database bug in #1 was doubly broken here: no parent info was even reaching it.

3. **`components/sidebar/page-tree.tsx`** (`PageTreeNode.confirmDelete`) — the sidebar page tree's own row-level delete. For `node.kind === "database"` it hardcoded `parentShortId = undefined`, discarding a parent lookup that was sitting right there in the already-loaded `pages` array.

4. **`components/sidebar/private-section.tsx`** (`PrivateRow.confirmDelete`) — the new "Private" sidebar section's row-level delete, copied from #3 including the same hardcoded `undefined` for database pages.

5. **`components/pages/trash-banner.tsx`** (`handlePermanentDelete`) — the "Delete forever" button shown on an already-trashed page. This one never had *any* parent-fallback logic — it always navigated to workspace home, and wasn't even given a `parentShortId` prop to work with.

Net effect: any page-level delete redirects correctly to the parent *only* for regular (non-database) pages deleted from the topbar or the main sidebar tree. Database pages, and permanent deletes from Trash, always land on workspace home regardless of whether a parent page exists.