# Bug: collapsing Favorites/Recently Visited/Private in the sidebar doesn't stick

**Reported:** 2026-07-31

## Symptom

Collapsing the "Favorites", "Recently Visited", or "Private" section in the sidebar, then collapsing the whole sidebar to icon-only and expanding it again, showed all three sections back open — as if they'd never been collapsed.

## Root cause

`components/sidebar/favorites-section.tsx`, `recently-visited-section.tsx`, and `private-section.tsx` each track their own open/closed state as plain `useState(true)`. None of it is persisted anywhere, so collapsing the sidebar (which unmounts these section components) and re-expanding it remounts them fresh, always defaulting back to `expanded = true`.
