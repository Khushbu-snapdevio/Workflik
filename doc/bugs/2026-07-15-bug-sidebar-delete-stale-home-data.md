# Bug: deleting a page from the sidebar leaves stale data on Home

**Reported:** 2026-07-15

## Symptom

Deleting a page from the sidebar (three-dot menu → Delete / Move to Trash) while sitting on the workspace Home route leaves the "Pages" stat count and the "Jump back in" recent-pages list showing the just-deleted page until the browser is manually reloaded.

## Root cause

The DB-level delete itself is correct: `DELETE /api/pages/[id]` (`app/api/pages/[id]/route.ts`) does a real soft delete, setting `isDeleted = true` on the page and its descendants. Home's queries (`app/app/[workspace]/page.tsx`) already filter `eq(pages.isDeleted, false)` for both the page count and the "Jump back in" join — so a fresh fetch would already be correct.

The gap is that nothing ever triggers that fresh fetch. `confirmDelete` in `components/sidebar/page-tree.tsx` and `components/sidebar/private-section.tsx` only update the sidebar's own local `useState` tree (`onPagesChange`) after a successful delete. They only force a full reload (`window.location.replace`) when the user is currently viewing the deleted page, or it's a database. If the user is on Home and deletes some *other* page, neither condition is true, so nothing tells Next.js to re-render the Home Server Component — it keeps showing its last-fetched snapshot. The Sidebar lives in the persistent workspace layout, as a sibling of the route content, so a purely local state update in the sidebar has no way to reach Home's RSC segment.
