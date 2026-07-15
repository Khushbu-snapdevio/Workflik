# Bug: "Any type" / "Any time" filter dropdowns in Search do nothing when clicked

**Reported:** 2026-07-15

## Symptom

In the global Search dialog (Ctrl+K), clicking the "Any type" or "Any time" filter chip does not open a list of filter options. The dropdowns appear completely dead.

## Root cause

Not a missing-implementation issue — the filter dropdown (`FilterChip` in `components/search/search-dialog.tsx`) has a fully working `open`/`setOpen` state, click handler, click-outside dismissal, and portal-rendered option menu (`createPortal` to `document.body`).

The actual defect is a z-index stacking mismatch. The Search dialog's backdrop is `z-[800]` and its panel is `z-[810]` (`components/search/search-dialog.tsx`). `FilterChip`'s portaled dropdown menu used `z-50` — far below both. Since the menu is positioned directly under the "Any type"/"Any time" button (i.e. within the same screen region as the dialog panel itself), the dialog's opaque `bg-background` panel visually covers the menu and intercepts clicks meant for it. The menu options were actually mounted in the DOM the whole time — just invisible and unclickable underneath the dialog surface.

This is the same bug class already diagnosed and fixed once before for the shadcn `Select` component (see the comment in `components/ui/select.tsx`), which explains it's not "not opening" so much as "opening underneath."
