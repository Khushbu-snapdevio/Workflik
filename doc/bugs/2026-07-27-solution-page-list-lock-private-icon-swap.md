# Solution: swap the row badge icons to match their actual flag

**Fixed:** 2026-07-27

## What changed

**`app/app/[workspace]/library/library-client.tsx`** — swapped the icon assignment so `page.isLocked` renders `Lock` (padlock) and `page.isPrivate` renders `PenOff`, matching the meaning each icon actually conveys ("locked" = padlock, "private" = editing/visibility restricted).

## Why this fixes the root cause

The dropdown menu's own lock/unlock action already used the correct icon pairing — only the table row's status badges had it backwards. Fixing just the badge assignment (no state/handler changes needed, since the underlying `isLocked`/`isPrivate` data and the per-row action wiring were already correct) makes the visual badge match the row's actual lock state, so it now agrees with what the "..." menu reports.
