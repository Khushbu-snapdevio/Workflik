# Solution: flush corner positioning, matching the existing `AvatarBadge` pattern

**Fixed:** 2026-07-15

## What changed

In both `components/sidebar/sidebar.tsx` and `components/admin/admin-sidebar.tsx`, the status dot's class list changed from:

```
absolute bottom-0 right-0 size-2.5 translate-x-1/3 translate-y-1/3 rounded-full border-2 border-popover bg-success
```

to:

```
absolute bottom-0 right-0 z-10 size-2.5 rounded-full bg-success ring-2 ring-popover
```

Removed the `translate-x-1/3 translate-y-1/3` outward push, and swapped `border-2 border-popover` for `ring-2 ring-popover` so the cutout ring doesn't eat into the dot's own box.

## Why this fixes the root cause

This mirrors the app's existing `AvatarBadge` component (`components/ui/avatar.tsx`), which already gets this right elsewhere: flush `right-0 bottom-0` positioning with a `ring` (not `border`) for the contrast cutout, no extra translate offset. The dot now sits directly on the avatar's corner instead of being pushed past it.

## Verification

`tsc --noEmit` passes for both touched files. Not verified in a live browser in this session — worth confirming visually: open the sidebar user popup and check the green dot sits tucked against the avatar's bottom-right edge, not floating away from it.
