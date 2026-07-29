# Bug: closing a nested property dropdown also closes the whole Filter/Sort panel

**Reported:** 2026-07-29

## Symptom

With the database view's Filter panel open and a filter rule's property-picker dropdown (a Radix `Select`, e.g. choosing "Category" / "Total votes" / "Upvoted by") also open, clicking to close that dropdown — either its trigger again, or empty space elsewhere inside the Filter panel — closes the entire Filter panel instead of just the dropdown. Same issue on the Sort panel's property/direction pickers.

## Root cause

`components/templates/template-page-client.tsx`'s `FilterPanel`/`SortPanel` outside-click handlers (`useEffect` blocks around what are now lines 833–862) close the panel via a plain `mousedown` listener + `panelRef.current.contains(e.target)` check. Radix `Select` (used for the property/operator/value/direction pickers inside these panels) hardcodes `disableOutsidePointerEvents: true` internally — not exposed as an opt-out `modal` prop the way Popover/Dialog have one — which sets `document.body.style.pointerEvents = "none"` for the entire document while the Select's dropdown is open.

With `pointer-events: none` on `<body>`, a click meant to close the open Select (its trigger again, or elsewhere inside the panel) can't hit-test the panel's own DOM — the browser resolves `e.target` to `<html>`/`document` instead. The panel's `.contains(e.target)` check then reads that as "outside the panel" and closes it, even though Radix's own `pointerdown` listener already correctly dismisses just the Select.

This is a different failure mode from the earlier `isInsideSelectPortal` fix (`doc/bugs/2026-07-28-bug-database-sort-filter-panel-issues.md`), which handles clicks *landing inside* the portaled dropdown content (picking an option). This bug is about the click *landing outside* the portal but still being misattributed because of the `pointer-events: none` side effect.
