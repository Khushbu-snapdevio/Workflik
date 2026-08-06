# Solution: `modal={false}` on Headless UI panels rendered inside the editor

**Fixed:** 2026-08-08

## What changed

Added `modal={false}` to every `anchor`-based Headless UI floating panel that
can render inside a TipTap NodeView:

- **`components/database/toolbar.tsx`** — "Add a view" `MenuItems`, the view
  `⋯` `MenuItems`, the Group-by/Date/Gantt `PropertyPickerListbox`
  `ListboxOptions`, and the Layout `PopoverPanel`. (The "Add a view" one
  carries a short comment marking the prop as load-bearing, since it looks
  cosmetic and would otherwise be an easy "cleanup" casualty.)
- **`components/database/filter-bar.tsx`** — the filter `ListboxOptions`.
- **`components/database/board-view.tsx`** — the add-option `PopoverPanel`.
- **`components/database/cells/cell-editor.tsx`** — the file-cell `MenuItems`.
- **`components/editor/extensions/reference-blocks.tsx`** — the block-type
  `ListboxOptions` (renders directly in a node view).

Panels already passing `static` were left alone: with the `RectAnchorTrigger`
pattern (see `[[headlessui-rect-anchor-pattern]]`) the Popover never reaches
Headless UI's open state, so its modal machinery never engages.

## Why this fixes the root cause

`modal={false}` disables `useInertOthers`, so opening a panel no longer
writes `inert`/`aria-hidden` attributes across the rest of the document.
ProseMirror's `DOMObserver` therefore sees no mutation inside the editor,
doesn't mark the node view dirty, doesn't rebuild it — and the React subtree
holding the menu (and its open state) survives the click.

Nothing of value is lost here. These are dropdowns, not modals: they aren't
supposed to inert the page behind them or lock scroll, and Headless UI still
provides its own outside-click and Escape dismissal in non-modal mode
(`useOutsideClick` is independent of the `modal` flag). If anything the
non-modal behavior is the more correct one for this UI — it matches the
plain fixed-width dropdown behavior the rest of the app already has.

## Verification

Verified **empirically against the real `DatabaseToolbar`**, not a mock: a
throwaway public page mounted the actual component both inside a TipTap
NodeView and outside it, driven by headless Chrome over CDP with real
`Input.dispatchMouseEvent` input.

Controlled A/B in a single run — one panel with the fix, one without, same
page, same click harness:

| panel | outside editor | inside NodeView |
|---|---|---|
| "Add a view" *without* `modal={false}` | opens (menu 320×203) | **no panel, `aria-expanded` stays false** |
| "None" *with* `modal={false}` | opens (listbox 192×157) | **opens (listbox 192×157)** |

After restoring the fix on both, all four combinations open correctly.
`npx tsc --noEmit -p .` is clean across every changed file (the only other
errors are in gitignored `.next/dev/types/routes.d.ts`, a stale generated
artifact unrelated to this work).

The 320px measurement also independently confirms the sibling width fix
(`2026-08-08-*-database-toolbar-dropdown-full-viewport-width.md`) — the panel
renders at exactly `w-80`, not viewport width.

Not verified in the user's own logged-in session (this dev instance is
invite-only and holds real workspace data, so no credentials were available);
the harness deliberately mounted the real component with stub props instead,
which exercises the same code path that was broken.

## Applies to future work

Any Headless UI floating panel added inside the TipTap editor — inline
databases, node-view toolbars, block widgets — needs `modal={false}` or it
will silently reproduce this bug. The failure mode is very misleading (it
looks like a click/event-propagation problem and invites fixes on the wrong
layer), so prefer this prop over anything that manipulates events.
