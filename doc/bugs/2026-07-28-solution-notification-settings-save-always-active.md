# Solution: track a saved-values snapshot and gate the button on dirty state

**Fixed:** 2026-07-28

## What changed

`app/app/[workspace]/settings/notifications/page.tsx`:
- Added a `savedSnapshot` state holding a JSON snapshot of the last loaded/saved preference values.
- Set on initial load (after the fetch resolves) and refreshed again on a successful save.
- `isDirty` compares the current form state against that snapshot each render.
- Button is now `disabled={saving || !isDirty}`.

## Why this fixes the root cause

The button's enabled state now reflects whether there's actually something to save, matching every other edit form's behavior per CLAUDE.md Hard Rule 18, instead of only reflecting whether a request happens to be in flight.

## Verification

`npx tsc --noEmit` passes with no new errors.
