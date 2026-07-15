# Solution: shared `getInitials()` helper

**Fixed:** 2026-07-15

## What changed

1. **`lib/utils.ts`** — added `getInitials(name: string): string`, the first-letter-of-first-word + first-letter-of-last-word algorithm (previously only in the sidebar).
2. **`components/sidebar/sidebar.tsx`** — removed the local `initialsFromName()` function; `UserAvatar` now calls the shared `getInitials()`.
3. **`components/settings/settings-top-bar.tsx`** and **`components/settings/profile-section.tsx`** — replaced the inline `displayName.slice(0, 2).toUpperCase()` with `getInitials(displayName)`.

`components/settings/workspace-members-section.tsx`'s variant (used for other workspace members, not the current user) was left as-is — it already handles email-fallback word-splitting that `getInitials()` doesn't, and was out of scope for this "current user" inconsistency.

## Why this fixes the root cause

The three surfaces (sidebar, header, Settings profile) already read the same `users.name` field from the same DB row — the bug was purely algorithmic duplication. Routing all three through one shared helper in `lib/utils.ts` guarantees they can never diverge again; any future call site gets the same behavior for free instead of re-implementing the formula.

## Verification

`tsc --noEmit` passes for all four touched files (no new errors introduced; two pre-existing unrelated errors elsewhere in the repo are untouched). Not verified in a live browser in this session — worth confirming visually: sidebar, header, and Settings → My Profile all show identical initials for the same account.
