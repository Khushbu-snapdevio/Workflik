# Bug: Home nav item appears highlighted during the onboarding tour

**Reported:** 2026-07-21

## Symptom

During the guided onboarding tooltip tour (e.g. step 4 of 5, "Stay in the loop", which points at Notifications), the sidebar's "Home" item also shows a highlighted/active pill background — as if it were part of the guided sequence — even though no tour step ever targets Home.

## Root cause

Two independent highlight mechanisms happen to look alike and run at the same time:

- `components/onboarding/tooltip-tour.tsx` draws a `position: fixed` spotlight box around whichever single DOM node matches the current step's `data-tour` selector (`TOUR_STEPS`, none of which ever reference Home), with a border in `var(--color-primary)` and a semi-transparent dimming overlay behind it.
- `components/sidebar/sidebar.tsx`'s `NavButton`/`CollapsedNavItem` for Home computes `active={pathname === \`/app/${workspaceSlug}\` && !searchOpen}` — ordinary current-route highlighting, rendered as `bg-primary/[0.2] text-primary`. Onboarding lands users on the workspace root, so Home's `active` is `true` for the entire tour, independent of which step is showing.

Both styles resolve to the same brand primary color, and Home sits directly next to Search/Notifications in the nav list, so the two unrelated highlights read as one continuous "guided" highlight spanning three items instead of one.
