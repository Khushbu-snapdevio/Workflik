# Solution: subscribe the greeting to the same name-change event the sidebar already uses

**Fixed:** 2026-07-31

## What changed

**`components/workspace/workspace-greeting.tsx`** — kept `firstName` as the server-rendered initial value but now tracks it as local state (`useState(firstName)`) instead of rendering the prop directly. Added a `useEffect` that listens for `pagevo:user-name-changed` on `window` (the same event `components/sidebar/sidebar.tsx` already listens for) and updates the local state to the first token of the new name, mirroring the server's own `name.split(" ")[0]` derivation.

## Why this fixes the root cause

The greeting now participates in the same same-tab update mechanism the sidebar already relies on, instead of being a dead end for that event. Saving a new name in Profile settings dispatches one event that both components react to, so they stay in sync without a page reload — no new event, no server round trip, no change to how the name is persisted.

## Verification

`tsc --noEmit` on the changed file shows no new type errors. Traced the flow: `profile-section.tsx`'s `patch("name", value)` dispatches `pagevo:user-name-changed` with `detail.name = value` on a successful save; the greeting's new listener sets `name` to `value.trim().split(" ")[0]`, matching the initial server-side computation in `app/app/[workspace]/page.tsx` (`session.user.name?.split(" ")[0]`).
