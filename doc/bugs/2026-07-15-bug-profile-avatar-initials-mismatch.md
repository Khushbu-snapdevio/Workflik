# Bug: profile initials show differently in the sidebar vs. header vs. Settings

**Reported:** 2026-07-15

## Symptom

The current user's avatar fallback initials (shown when no profile photo is set) are different depending on where they're rendered: the sidebar's bottom-left user avatar showed "SP" for a user named "Sahaj Patel", while the top-right header avatar and the Settings → My Profile page avatar both showed "SA" for the same user.

## Root cause

The same underlying `users.name` value (same DB row, same session) was being run through two different, independently-written initials algorithms:

- `components/sidebar/sidebar.tsx`'s local `initialsFromName()` — split the name on whitespace and took the first letter of the first word + first letter of the last word ("Sahaj Patel" → "SP").
- `components/settings/settings-top-bar.tsx` and `components/settings/profile-section.tsx` — both inlined `displayName.slice(0, 2).toUpperCase()`, taking the first two characters of the full display name string regardless of word boundaries ("Sahaj Patel" → "Sa" → "SA").

Not a stale-data or wrong-context bug — both queries selected `users.name`/`users.image` from the same row. The divergence was purely from duplicating the initials formula in three places instead of sharing one implementation. A third, slightly different variant also existed in `components/settings/workspace-members-section.tsx` for other members' avatars.
