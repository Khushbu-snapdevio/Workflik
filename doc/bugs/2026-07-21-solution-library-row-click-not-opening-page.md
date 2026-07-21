# Solution: make the whole row clickable, remove the hover "OPEN" button

**Fixed:** 2026-07-21

## What changed

**`app/app/[workspace]/library/library-client.tsx`**:
- The row's outer `<div>` now has `onClick={() => router.push(\`/app/${workspaceSlug}/${page.shortId}\`)}` and `cursor-pointer`, so clicking anywhere on the row (page name, icon, or blank space) navigates into the page — matching how the sidebar page tree and search results already behave.
- The hover-only "OPEN" `<Link>` pill (and its tooltip) was removed — it's redundant now that the row itself is the click target.
- The favorite-star button's wrapper got `onClick={(e) => e.stopPropagation()}` so starring/unstarring a page from the row no longer also triggers a navigation. The row checkbox and the row-actions (`⋯`) menu already had their own `stopPropagation` from before and needed no change.
- Removed `useHoverTooltip`, `IconTooltip`, and the `createPortal` tooltip render — that infrastructure existed solely to show "Open full page" on hover of the now-deleted OPEN button and had no other caller in this file.

## Why this fixes the root cause

The row never had a click handler; only the small OPEN `<Link>` did. Adding the navigation directly to the row (while keeping `stopPropagation` on the checkbox, favorite star, and actions menu so those controls still work independently) makes the whole row a single, obvious click target instead of one small sub-element inside it — consistent with how every other page list in the app opens on a direct row/item click.

## Verification

`npx tsc --noEmit` passed with no new errors in `library-client.tsx`.
