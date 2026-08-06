# Bug: "Add a view" (and "Layout") dropdown renders full viewport width instead of ~320px

**Reported:** 2026-08-08

## What's broken

Opening "Add a view" in a database's toolbar (inline or standalone) shows
the view-type picker panel stretched almost the full width of the browser
window — overlapping the sidebar on the left and running to the far right
edge — instead of a small ~320px box anchored under the button. The same
"Layout" panel (opened from a view's `⋯` menu → Layout) has the identical
problem.

This was previously masked in the inline-database context by the separate
"blink" bug (the panel used to close itself almost instantly — see
`2026-08-08-*-inline-database-toolbar-dropdowns-blink-closed.md`), so the
oversized layout only became visible once that fix let the panel actually
stay open.

## Reproduction

1. Open any database (inline or full-page), click "Add a view."
2. Observe the dropdown spans nearly the entire browser width, not a small
   box under the button.
3. Same result for a view's `⋯` menu → "Layout."

## Root cause

Both panels are `MenuItems`/`PopoverPanel` (`@headlessui/react`) using the
`anchor` prop, with:

```
className="z-600 w-[calc(100vw-24px)] max-w-80 overflow-hidden ..."
```

The intent was "shrink to fit narrow viewports, but cap at 320px on
anything wider" — a `width` + `max-width` combo that would work for a
plain CSS-positioned element. But Headless UI's `anchor` positioning is
implemented via `@floating-ui/react`'s `size()` middleware
(`node_modules/@headlessui/react/dist/internal/floating.js`), which runs
on every position update and does:

```js
apply({ availableWidth, elements }) {
  Object.assign(elements.floating.style, {
    overflow: "auto",
    maxWidth: `${availableWidth}px`,
    ...
  })
}
```

This sets `maxWidth` **directly on the floating element's inline `style`**
— and an inline style always wins over any class-based rule for the same
property, regardless of specificity or source order. So the `max-w-80`
Tailwind class's `max-width: 20rem` is silently discarded every time
Headless UI repositions the panel; only `elements.floating.style.maxWidth`
(computed from `availableWidth`, effectively close to the full viewport
width when no `anchor.padding` is configured) actually applies. With
`max-w-80` neutralized, the only width rule left in effect is the
`w-[calc(100vw-24px)]` class itself — hence the panel renders at nearly
full viewport width.

Other `MenuItems`/`Listbox` panels in the same file that use a plain fixed
width (`w-48`, etc., no `calc(100vw...)` involved) never hit this, because
their intended width is already comfortably under whatever `availableWidth`
Headless UI computes, so the (overridden, oversized) inline `max-width`
never actually needs to constrain anything.

**Also affects** `components/workspace/workspace-share-button.tsx`'s
`PopoverPanel` (same `anchor` + `w-[calc(100vw-24px)] max-w-80` pattern) —
not fixed here since it wasn't part of what was reported, but it's the
identical bug and should get the identical fix. The similar-looking
`w-[calc(100vw-24px)] max-w-*` usages in `template-page-client.tsx` are
**not** affected — those are plain `absolute`-positioned `<div>`s, not
Headless UI `anchor`-based panels, so nothing overrides their `max-width`.

## Fix

See the paired solution doc.
