# Solution: clear the step's input state when it is skipped

**Fixed:** 2026-07-31

## What changed

**`app/platform/onboarding/_onboarding-ui.tsx`** — `handleSkip()` now resets the relevant state before advancing:
- Profile step: `setDisplayName(""); setJobTitle("");` before moving to the first question step.
- Workspace-name step: `setWorkspaceName("");` before moving to the invite step (team) or template step (solo).

## Why this fixes the root cause

`completeOnboardingAction` (`app/actions/onboarding.ts`) already has the correct default-fallback logic — it only applies "My Workspace"/"My Team" or leaves the account name untouched when the field is empty (`data.workspaceName.trim() || …`, `if (data.displayName) …`). The bug was that Skip never produced an empty value when the user had typed something and forgotten to clear it. Clearing the field in `handleSkip` makes "Skip" reliably mean "discard whatever is in this field," letting the existing server-side defaults take over.

## Verification

Traced both skip paths: profile step Skip now clears `displayName`/`jobTitle` before `finish()` sends `displayName: ""` — the server leaves `users.name` unchanged, falling back to the account's existing name. Workspace-name step Skip now clears `workspaceName` before `finish()` sends `workspaceName: ""` — the server names the workspace "My Workspace" (or "My Team" for team onboarding). `tsc --noEmit` shows no new errors from the changed file.
