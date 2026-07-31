# Solution: lift workspace-switcher open state into the sidebar and mutually close both menus

**Fixed:** 2026-07-31

## What changed

**`components/sidebar/workspace-switcher.tsx`** — converted from an internally-managed `open` state to a controlled component: it now takes `open: boolean` and `onOpenChange: (open: boolean) => void` props instead of owning `useState(false)`. Removed the now-redundant portaled `fixed inset-0` click-catcher entirely — outside-click-to-close is handled by the sidebar's existing `document` `mousedown` listener (see below), the same mechanism already used for the "+" menu and the user menu.

**`components/sidebar/sidebar.tsx`**:
- Added a `workspaceMenu` state and passes it down as `open`/`onOpenChange` to `<WorkspaceSwitcher>`.
- The "+" button's `onClick` now also calls `setWorkspaceMenu(false)`, so opening the Create menu always closes the workspace switcher — regardless of z-index stacking, since this closes it directly rather than relying on a click reaching some other element.
- `WorkspaceSwitcher`'s `onOpenChange` closes the "+" menu (`setNewMenu(false)`) whenever the workspace switcher is opened.
- The shared `document` `mousedown` outside-click handler now also resets `workspaceMenu` alongside `newMenu` when the click falls outside `newMenuRef` (the header wrapper that contains both).

## Why this fixes the root cause

Both dropdowns now share one coordination point instead of each managing state (and its own outside-click detection) in isolation. Opening either one explicitly closes the other via direct state updates, so it no longer matters which element has the higher `z-index` or whether one trigger happens to sit inside the other's "outside click" ref boundary. This also removes a second, competing outside-click-closing mechanism (the portaled click-catcher) in favor of the single pattern already proven to work for the "+" and user menus.

## Verification

Manually traced both directions of the interaction against the updated code: opening the "+" menu while the workspace switcher is open now calls `setWorkspaceMenu(false)` directly in the same click handler; opening the workspace switcher while the "+" menu is open now calls `setNewMenu(false)` via `onOpenChange`. Clicking fully outside the header now resets both via the shared `mousedown` listener. `pnpm typecheck`-equivalent (`tsc --noEmit`) shows no new errors introduced by either changed file.
