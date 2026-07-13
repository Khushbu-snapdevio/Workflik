# Bug: sidebar "N more" popups render partially behind the sidebar

**Reported:** 2026-07-14

## Symptom

The "N more" flyout popups in the sidebar (Favorites, Recently Visited, Private, and the main Pages tree's own root-level overflow popup) render with their left side visually hidden behind the sidebar itself — most noticeably behind the sidebar's scrollbar when the sidebar's content is tall enough to scroll.

## Root cause

Each of these four popups is rendered via `createPortal(..., document.body)`, so in the actual DOM they become **siblings** of the sidebar's own wrapper element, not descendants of it. That wrapper (`components/layout/workspace-shell.tsx`) is deliberately given `md:z-[550]` so its own dropdowns (workspace switcher, profile menu, page-tree row menus — none of which portal to body) paint above the main content area's popovers.

All four "N more" popups used `z-[300]` — comfortably above ordinary page content, but well below the sidebar wrapper's `z-[550]`. Since portaling makes them siblings under `<body>`, not descendants, their stacking is decided purely by z-index at that shared level — and `z-[300] < z-[550]` means the sidebar wrapper wins wherever the two visually overlap, clipping the popup's left edge (and its scrollbar area specifically, since that's the part of the sidebar closest to where the popup starts).

Affected files:
- `components/sidebar/favorites-section.tsx`
- `components/sidebar/recently-visited-section.tsx`
- `components/sidebar/private-section.tsx`
- `components/sidebar/page-tree.tsx` (the root-level "Pages" overflow popup)

This is the same category of bug as `2026-07-14-bug-page-delete-redirect.md`'s sibling case from earlier today — a component using a z-index that doesn't account for the sidebar's documented `z-[550]` stacking tier — just affecting a popup instead of a confirm dialog.
