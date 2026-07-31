# Bug: skipping the name/workspace-name onboarding step keeps the typed-but-unwanted text

**Reported:** 2026-07-31

## Symptom

On the "Name your workspace" onboarding step, typing a name (e.g. "Testing11") and then clicking "Skip this step" — without first clearing the input — still created the workspace with that typed name. The workspace should fall back to the default name (e.g. "My Workspace") when the step is skipped, since clicking Skip signals the user does not want to commit that value. The same problem occurs on the earlier "What's your name?" profile step with the display name field.

## Root cause

`app/platform/onboarding/_onboarding-ui.tsx`'s `handleSkip()` advanced `step` for the profile step and the workspace-name step without resetting `displayName`/`jobTitle` or `workspaceName` back to empty. Whatever text was still sitting in the input at the moment Skip was clicked stayed in state and was submitted as-is by `finish()` → `completeOnboardingAction`, which only applies its own defaults ("My Workspace"/"My Team", or leaving the account's existing name untouched) when the corresponding field is empty. Since Skip never emptied these fields, the server had no way to distinguish "user skipped this step" from "user typed a value and continued."
