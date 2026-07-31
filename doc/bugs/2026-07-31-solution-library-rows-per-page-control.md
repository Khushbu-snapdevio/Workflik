# Solution: guard the stepper's click race, wire arrow keys, filter input, persist the choice

**Fixed:** 2026-07-31

## What changed

**`app/app/[workspace]/library/library-client.tsx`**:

- Both chevron buttons now call `e.preventDefault()` in `onMouseDown`, so clicking them no longer blurs (and doesn't fire `submitPageSizeInput` on) the text input first — a single, unambiguous state update per click instead of two racing ones. Bumped their height from `h-2.5` to `h-3` for a slightly larger hit target.
- The input's `onKeyDown` now handles `ArrowUp`/`ArrowDown`, calling the same `changePageSize(pageSize ± 5)` the chevron buttons use (same step, same `MIN_PAGE_SIZE`/`MAX_PAGE_SIZE` clamp).
- The input's `onChange` now strips non-digit characters (`e.target.value.replace(/[^0-9]/g, "")`) before storing them, so only numbers can ever land in the field.
- Added a `PAGE_SIZE_STORAGE_KEY` localStorage entry: a `useEffect` on mount reads it and, if it holds a valid size different from the default, updates `pageSize`/`pageSizeInput` (which the existing fetch effect picks up on its own); a second `useEffect` writes `pageSize` to that key on every change. This survives navigating away and back regardless of how — link click or browser back — since it isn't tied to the URL.

## Why this fixes the root cause

The click/keyboard issues were two separate gaps in the same custom (non-native) stepper: no keyboard handling existed at all for arrow keys, and the mouse path had a focus-driven race between blur and click handlers. Both are now handled explicitly and go through the same `changePageSize` clamp, so mouse, keyboard, and the text field itself always agree. The numeric filter closes the only other way to get an invalid value into the field. The persistence gap was a missing feature, not a broken one — `pageSize` simply had nowhere durable to live — so storing it in localStorage (mirroring how a user's chosen page size is normally treated as a standing preference, not per-URL state) closes it.

## Verification

`tsc --noEmit` and `biome check` show no new errors introduced (the file has pre-existing formatting debt unrelated to this change, left as-is). Traced the mount sequence: the restore effect runs before the existing fetch effect on the same commit, so a restored non-default size is picked up by the normal fetch path rather than needing a duplicate fetch call.
