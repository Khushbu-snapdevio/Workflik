# Solution: let IconPicker's outside-click check exclude its own trigger button

**Fixed:** 2026-07-31

## What changed

**`components/pages/icon-picker.tsx`** — added an optional `triggerRef?: React.RefObject<HTMLElement | null>` prop. The `mousedown` outside-click handler now returns early (does nothing) when the click target is inside `triggerRef.current`, before it ever reaches the `pickerRef` containment check.

Updated every caller to pass its own trigger button's ref:
- **`components/pages/page-header.tsx`** — one shared `iconBtnRef` for its two icon buttons (mutually exclusive: "Add icon" vs. "change icon"). Also changed the "Add icon" button's `onClick` from always-`setShowPicker(true)` to a proper `(p) => !p` toggle, matching the other button and the fix's intent.
- **`components/pages/page-client.tsx`** — same shared-ref treatment, same toggle fix for its two buttons (both previously always `setShowPicker(true)`).
- **`components/templates/template-page-client.tsx`** — shared `iconBtnRef` for its two buttons; both already toggled correctly (`(p) => !p`), so only the ref was missing.
- **`components/orbit/template-form.tsx`** and **`components/settings/workspace-general-section.tsx`** — both already had a dedicated trigger ref for positioning the portaled picker (`iconTriggerRef`, `btnRef`); just passed the existing ref through as `triggerRef` too.

`components/database/entry-context-menu.tsx`'s `IconPicker` usage wasn't touched — its "Edit icon" trigger and the picker are two different views of an already-open context menu (`view === "icon"` replaces the menu's content entirely), not a persistent button a user clicks again to toggle, so this race doesn't apply there.

## Why this fixes the root cause

The picker was closing and reopening in the same click because its outside-click detection didn't know the trigger button existed — from its perspective, that button was just another "outside" element. Excluding it via `triggerRef` means a click on the trigger no longer fires the picker's own `onClose()` at all; the trigger's own `onClick` toggle is the sole source of truth for open/closed, so it behaves like a normal toggle: open → close, closed → open.

## Verification

`tsc --noEmit` shows no new errors across all six changed files. Traced the click sequence by hand for each caller: with `triggerRef` set, the `mousedown` handler's new early-return fires before the `pickerRef` check, so `onClose()` is never called from a click on the trigger — only the trigger's own `onClick` (now a toggle everywhere) decides the next state.
