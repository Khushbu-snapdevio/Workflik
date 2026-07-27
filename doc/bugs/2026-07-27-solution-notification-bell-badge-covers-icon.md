# Solution: anchor the badge by `left` instead of `right`

**Fixed:** 2026-07-27

## What changed

**`components/notifications/notification-bell.tsx`** — changed the expanded-row badge's positioning from `-top-1 -right-1.5` to `-top-1 left-[9px]`, and reduced its text to `text-[10px]` (matching the identical badge style already used correctly in `notification-panel.tsx`).

## Why this fixes the root cause

Anchoring by `left` keeps the badge's overlap with the icon constant regardless of digit count — extra width from a wider count (e.g. "99+") now grows outward to the right, away from the icon, instead of consuming it. The collapsed sidebar-rail variant of the bell wasn't affected by this bug (its badge anchors to the full button's corner, not the icon's own bounding box) and didn't need a change.
