# Solution: bail out of the outer close-check while a Radix modal layer has body pointer-events disabled

**Fixed:** 2026-07-29

## What changed

`components/templates/template-page-client.tsx`: added an `isRadixModalLayerOpen()` helper (checks `document.body.style.pointerEvents === "none"`) alongside the existing `isInsideSelectPortal()` helper, and added it as an early-return condition in both the `showFilter` and `showSort` outside-click `mousedown` handlers.

## Why this fixes the root cause

Radix sets `body.style.pointerEvents = "none"` synchronously when a `Select` inside these panels opens, and only restores it once the Select's own dismissal has committed — which happens after the same physical click's `mousedown` has already been dispatched to every listener, including the panel's. Checking that flag at the moment the panel's handler runs reliably detects "a Radix modal layer (the nested Select) currently owns this click" and skips the panel's own close logic for it, leaving Radix's own `pointerdown` listener to dismiss just the Select as it normally would. Once the Select finishes closing and pointer-events are restored, the very next outside click closes the panel as usual.

## Verification

`npx tsc --noEmit` passes with no new errors.
