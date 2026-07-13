# Solution: sidebar "N more" popups now render above the sidebar

**Fixed:** 2026-07-14

## What changed

Bumped the z-index on all four sidebar "N more" flyout popups from `z-[300]` to `z-[560]` — just above the sidebar wrapper's `md:z-[550]` (documented in `components/layout/workspace-shell.tsx`), so they correctly paint on top of the sidebar instead of partially behind it:

- `components/sidebar/favorites-section.tsx`
- `components/sidebar/recently-visited-section.tsx`
- `components/sidebar/private-section.tsx`
- `components/sidebar/page-tree.tsx`

Added a short comment at each site explaining *why* `z-[560]` specifically (not just "a bigger number"), so a future edit to one of these doesn't regress back to an arbitrary z-index that happens to work by luck.

## Why this fixes the root cause

The bug wasn't about the popup's position math (top/left calculations were already correct) — it was purely a stacking-order mismatch between two elements that are siblings under `<body>` once one of them is portaled. Matching the popup's z-index to sit just above the sidebar's own documented tier (`z-[550]`) resolves it structurally, the same way the earlier `z-[580]`/`z-[590]` fix did for `AlertDialog` — rather than nudging position offsets to dodge the overlap, which wouldn't have survived the sidebar being resized or the popup appearing at a different scroll position.

## Verification

`tsc --noEmit` passes across the whole project. Not verified in a live browser (no browser automation tool available in this environment) — worth confirming visually: open each of the four "N more" popups (Favorites, Recently Visited, Private, Pages) while the sidebar itself has a visible scrollbar, and check the popup's left edge is no longer clipped.
