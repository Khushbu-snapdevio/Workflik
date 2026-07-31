# Solution: portal the column menu to &lt;body&gt; with fixed, clamped positioning

**Fixed:** 2026-07-31

## What changed

**`components/templates/views/template-table-view.tsx`**, in `ColumnHeader`:

- The "⋯" button's `onClick` now snapshots its own `getBoundingClientRect()` into a new `menuRect` state before opening the menu.
- The dropdown is now rendered via `createPortal(..., document.body)` instead of as an in-flow `absolute` child, with `position: fixed` and `top`/`left` computed by `getClampedTop`/`getClampedLeft` (from `lib/ui/clamp-to-viewport.ts`) against `menuRect` — the same helpers `table-view.tsx`'s equivalent menu already uses.
- Added a `dropdownRef` on the portaled menu and included it in the existing outside-click handler's containment check — the menu is no longer a DOM descendant of the wrapper `menuRef` once portaled, so that check needed its own ref to still recognize clicks inside the menu as "inside."
- Added `useScrollLockWhileOpen` while the menu is open, matching `table-view.tsx`'s `PropHeaderMenu` — `menuRect` is a one-time snapshot, so without this, scrolling the table while the menu is open would leave it visually detached from the "⋯" button that anchored it.

## Why this fixes the root cause

The menu was being clipped by its scrollable ancestor because it was still inside that ancestor's DOM subtree. Portaling it to `<body>` removes it from that subtree entirely, so nothing left in its ancestor chain can clip it; `position: fixed` plus the clamp helpers keep it anchored to the "⋯" button and fully on-screen regardless of where that button sits in the scrolled table. This mirrors the pattern the non-template database table view already uses for the identical menu, rather than introducing a new one.

## Verification

`tsc --noEmit` shows no new errors. Traced the outside-click and scroll-lock paths by hand: both now check `dropdownRef` in addition to `menuRef`/`triggerRef`, so clicking a menu item (Rename, Edit property, Delete property) is recognized as "inside" and doesn't spuriously close the menu before the click handler runs.
