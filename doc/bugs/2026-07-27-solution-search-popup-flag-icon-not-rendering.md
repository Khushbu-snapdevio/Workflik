# Solution: route the search popup's icon rendering through the shared `PageIcon` component

**Fixed:** 2026-07-27

## What changed

**`components/search/search-dialog.tsx`**:
- `SourceIcon` now renders via `<PageIcon icon={icon} size={size - 2} />` whenever `parseIcon(icon)` resolves a real icon, falling back to the existing Database/Comment/FileText icons only when there's none.
- `RecentRow`'s inline `item.page?.icon?.length <= 4 ? <span>...</span> : <FileTextIcon />` was replaced the same way, using `parseIcon`/`PageIcon`.

Both import `PageIcon` and `parseIcon` from `@/components/pages/page-icon` — no API or query changes were needed, since `app/api/search/route.ts` already returned the raw `pages.icon` value unchanged.

## Why this fixes the root cause

The search modal now uses the exact same icon-resolution logic (`parseIcon` → `flagIconCode` → `flag-icons` SVG) already proven correct in the sidebar and Library table, instead of a second, simplified implementation that never handled flags (or JSON-encoded custom icon/image types) at all. Fixing it in the shared component's two call sites covers both the search-results list and the "Recently visited" list in the same modal.
