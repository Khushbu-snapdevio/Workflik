# Bug: green "active" status dot on the sidebar user avatar sits off-position

**Reported:** 2026-07-15

## Symptom

In the sidebar's bottom-left user profile popup (opened by clicking the user avatar/name), the small green online-status dot on the avatar doesn't sit cleanly on the avatar's bottom-right edge — it looks detached/floating away from the circle instead of tucked into the corner.

## Root cause

`components/sidebar/sidebar.tsx` (and an identical copy in `components/admin/admin-sidebar.tsx`) positioned the dot with:

```
absolute bottom-0 right-0 size-2.5 translate-x-1/3 translate-y-1/3 rounded-full border-2 border-popover bg-success
```

The `translate-x-1/3 translate-y-1/3` was meant to nudge the dot outward so it straddles the avatar's circular edge, but on a 40px circular avatar the square wrapper's bottom-right corner is already outside the visible circle — pushing the dot further out via `translate` made it read as floating in the empty corner space rather than sitting on the avatar. The codebase's own `AvatarBadge` primitive (`components/ui/avatar.tsx`) already solves this correctly (flush `right-0 bottom-0`, no translate, `ring-2` instead of `border-2`), but this hand-rolled dot wasn't using it.
