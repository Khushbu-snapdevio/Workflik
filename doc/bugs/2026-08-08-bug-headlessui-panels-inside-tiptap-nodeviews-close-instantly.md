# Bug: Headless UI dropdowns inside a TipTap NodeView open and close on the same click

**Reported:** 2026-08-08

## What's broken

Inside an **inline** database (a database embedded in a page via `/database`,
rendered through the `inlineDatabase` TipTap NodeView), the toolbar's
dropdowns don't work. Clicking "Add a view" or the Group-by picker (the
button reading "None ▾") makes the panel flash open and vanish on the same
click — the user sees a blink and nothing else. Repeated clicking never
gets a usable panel.

The *identical* toolbar on the standalone full-page database works
perfectly. The bug only appears when the toolbar is rendered inside the
ProseMirror editor.

## Reproduction

1. In a page, insert an inline database (`/database`) and create/link one.
2. Click "Add a view" in its toolbar → panel blinks and closes.
3. Same for the Group-by "None ▾" Listbox, the view `⋯` menu, and Layout.
4. Open the same database as a full page (`Open ↗`) → all of them work.

## Root cause

Headless UI floating panels (`MenuItems`, `ListboxOptions`, `PopoverPanel`,
`ComboboxOptions`) default to **`modal: true`**. In that mode Headless UI
runs `useInertOthers`, which walks the document and marks every element
*outside* the open panel as `inert` / `aria-hidden` — real attribute
mutations on real DOM nodes (`@headlessui/react/dist/hooks/use-inert-others.js`,
invoked from each panel component as `useInertOthers(w, { allowed: ... })`).

When the panel lives inside a TipTap NodeView, "everything outside the
panel" **includes ProseMirror's own editor DOM** (`view.dom`) and its
descendants. ProseMirror's `DOMObserver` sees that burst of attribute
mutations inside the document it owns, marks the affected node view dirty,
and rebuilds it. Rebuilding the node view constructs a *new* `ReactNodeView`
→ a new `ReactRenderer` with a new portal id → React unmounts the old
portal subtree entirely. That subtree is what holds the Headless UI `Menu`
and therefore its open state — so the menu is destroyed a tick after it
opened. Hence the blink.

This also explains the collateral detail that every node view in the
document is recreated, not just the clicked one: the inert sweep touches
the whole document, so every node view's DOM is mutated at once.

## How it was diagnosed

Root-caused **empirically**, not by reading source — two earlier
theory-driven attempts (blaming event propagation, then event phase) were
both wrong and are recorded here so the same dead ends aren't re-walked:

- **Wrong theory 1 — "ProseMirror's mousedown steals focus, stop the event."**
  Adding `onMouseDown`/`stopPropagation` on the NodeViewWrapper changed
  nothing.
- **Wrong theory 2 — "wrong event phase, use capture."** Also wrong, and
  actively harmful: a capture-phase `stopPropagation` on an *ancestor*
  wrapper prevents the event from ever reaching the button inside it.
  Headless UI opens its menu on `onPointerDown` (see `use-handle-toggle.js`),
  not `mousedown`, so neither handler was even on the open path.

The actual method: a throwaway public page rendered the real
`DatabaseToolbar` both inside a TipTap NodeView and outside it (control),
driven by headless Chrome over CDP with genuine `Input.dispatchMouseEvent`
input. Instrumenting mount/unmount showed **every click recreated all node
views**, while clicking a plain paragraph recreated none — pointing at the
menu-open side effect rather than at click handling. A config matrix then
isolated the single variable: `modal={false}` fixed it; node-spec changes
(`draggable`, `selectable`, `contentEditable`, `ignoreMutation`,
`stopEvent`) all did not.

## Fix

See the paired solution doc.
