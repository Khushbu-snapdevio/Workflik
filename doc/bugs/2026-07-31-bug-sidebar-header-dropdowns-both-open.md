# Bug: sidebar "+" menu and workspace switcher can both stay open at once

**Reported:** 2026-07-31

## Symptom

In the sidebar header, opening the "+" (Create) dropdown and then clicking the workspace name — or the reverse order — opened the second dropdown without closing the first. Both remained open and rendered overlapping each other.

## Root cause

`components/sidebar/sidebar.tsx` and `components/sidebar/workspace-switcher.tsx` each managed their own open/close state independently, with no coordination between the two:

- The "+" menu (`newMenu` state in `sidebar.tsx`) closes on outside click via a `document` `mousedown` listener that checks `newMenuRef.contains(e.target)`. `newMenuRef` is attached to the whole header `<div>`, which wraps **both** the "+" button and `<WorkspaceSwitcher>`. So a click on the workspace switcher button is *inside* `newMenuRef` and never counted as an "outside click" — the "+" menu never closed when the workspace switcher was opened.
- `WorkspaceSwitcher` closed itself via its own full-viewport `fixed inset-0` click-catcher portaled to `document.body` at `z-40`. But the "+" button sits at `z-50` (`components/sidebar/sidebar.tsx`), so a click on the "+" button while the workspace switcher was open never reached that click-catcher — the browser delivers the click to the topmost element at that point, which was the "+" button, not the underlying overlay. The workspace switcher's `open` state was never reset.

Because neither widget knew about the other's open state, clicking one trigger while the other was open left both dropdowns' `open` state `true` simultaneously.
