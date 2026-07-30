# Solution: same user's avatar fallback shows a different color in different parts of the app

## What changed

**`lib/utils.ts`** — added one canonical `getAvatarColor(seed: string): string`, using the 8-color palette that was already the majority implementation (`bg-primary`, `bg-destructive`, `bg-success`, `bg-warning`, `bg-muted-foreground`, and their `/70` variants), with the `(h * 31 + charCode) >>> 0` then `h % length` hash-to-index step.

Every other implementation was deleted and replaced with a call to this shared function:

- `components/sidebar/sidebar.tsx` — `UserAvatar`'s hardcoded `bg-primary` is now `getAvatarColor(name)` (this was the specific mismatch reported — it previously computed no color at all).
- `components/settings/settings-top-bar.tsx`, `components/settings/profile-section.tsx`, `components/settings/workspace-members-section.tsx`, `components/pages/share-panel.tsx`, `components/notifications/notification-toast.tsx`, `components/notifications/notification-card.tsx` — local `AVATAR_BG_CLASSES` + `avatarColor`/`avatarBgClass` definitions removed; all now import `getAvatarColor` from `@/lib/utils`.
- `app/orbit-admin/orbit/users/page.tsx`, `app/orbit-admin/orbit/users/[id]/page.tsx` — same consolidation, plus the seed changed from `u.id`/`user.id` to the already-computed `displayName` (name-or-email), matching what every other page hashes for that same user.

## Why this fixes the root cause

The bug was structural, not a one-off typo: eight independent implementations of "hash a string to a palette color" will drift the moment any one of them is copy-pasted with a tweak (bigger palette, different hash formula, different seed) — which is exactly what had already happened six times over, on top of the sidebar not implementing it at all. Deleting all seven duplicate/divergent implementations and routing every call site through one function in `lib/utils.ts` makes divergence structurally impossible going forward: there's only one place the palette or hash logic can live, and any future avatar spot has an existing, discoverable utility to reach for instead of writing a new one.

Using the display name (not `user.id`) as the seed everywhere also matches the letter of UI Rule 26 ("derived from the user's name") — the two Orbit Admin pages were the only ones hashing an opaque ID, which happened to still be deterministic per-user but was guaranteed to disagree with every name-based avatar of the same person elsewhere in the app.

Text color was left as the existing `text-white` (or `text-primary-foreground` → `text-white` in the sidebar, to match) — six of the eight sites already paired every palette color with white text, including `bg-warning`, so this doesn't introduce a new contrast combination.

## Verification

- `pnpm typecheck` — passes with zero errors.
- `pnpm build` — production build completes cleanly.
- `grep -rn "avatarBgClass\|AVATAR_BG_CLASSES\|function avatarColor" app components` — no remaining local implementations; every avatar-fallback call site now goes through `lib/utils.ts`'s `getAvatarColor`.
- Not manually verified in a running browser in this session — recommend confirming visually that the same signed-in user now shows the same color in the topbar, sidebar bottom user-menu, and Settings → My Profile page before considering this closed.
