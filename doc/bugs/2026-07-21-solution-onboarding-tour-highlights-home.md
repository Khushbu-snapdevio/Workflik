# Solution: suppress the sidebar's route-active highlight while the tour is running

**Fixed:** 2026-07-21

## What changed

**`components/onboarding/tooltip-tour.tsx`**:
- Added an effect that dispatches `document.dispatchEvent(new CustomEvent("workflik:tour-active"))` / `"workflik:tour-inactive"` whenever the tour's `active` state changes — mirroring the existing `"workflik:open-search"` / `"workflik:search-closed"` event-bus pattern this codebase already uses for cross-sibling UI state (`TooltipTour` and `Sidebar` are siblings under the workspace layout, not nested, so a prop can't be threaded between them).

**`components/sidebar/sidebar.tsx`**:
- Added a `tourActive` boolean state, kept in sync via `document.addEventListener` on the two new events, next to the existing `searchOpen` listener.
- Home, Library, and Templates nav items' `active` expressions (both the collapsed icon-only rail and the expanded nav) now also require `!tourActive`, so none of them show the "current page" highlight while the tour's own spotlight is on screen.

## Why this fixes the root cause

The tour never targeted Home — the bug was Home's ordinary route-active indicator visually competing with the tour's spotlight because both use the same primary color and sit adjacent to each other. Suppressing the route-active highlight specifically while the tour is running removes the coincidental visual overlap without touching the tour's own target logic (`TOUR_STEPS` still only ever spotlights one element per step) or Home's normal behavior outside of onboarding.

## Verification

`npx tsc --noEmit` passed with no errors in either file.
