# Bug: workspace home greeting keeps showing the old name after a profile name change

**Reported:** 2026-07-31

## Symptom

After changing the display name in Profile settings (e.g. "Smit" → "ABc"), the sidebar's user badge updated immediately to the new name, but the "Good morning, {name}" greeting on the workspace home page (`/app/[workspace]`) kept showing the old name until a full page reload.

## Root cause

`components/settings/profile-section.tsx` saves the name via `PATCH /api/user/profile`, then — for same-tab, no-reload feedback — dispatches a `workflik:user-name-changed` `CustomEvent` on `window` with the new name in `detail.name`.

`components/sidebar/sidebar.tsx` already listens for this event (`window.addEventListener("workflik:user-name-changed", ...)`) and updates its local `userName` state, so the sidebar badge reflects the change instantly.

`components/workspace/workspace-greeting.tsx`, however, was never wired into this pattern. It rendered `firstName` as a plain prop passed once from the server-rendered `session.user.name` on `/app/[workspace]/page.tsx`, with no listener for `workflik:user-name-changed`. So it stayed frozen at whatever name was current at the last full navigation/reload, even though the rest of the UI (sidebar) had already moved on.
