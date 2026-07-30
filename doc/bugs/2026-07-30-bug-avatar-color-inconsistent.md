# Bug: same user's avatar fallback shows a different color in different parts of the app

**Reported:** 2026-07-30 (user-reported, with screenshots comparing the topbar/profile-page avatar against the sidebar's bottom user-menu avatar for the same account)

## Symptom

A user with no profile photo gets a colored circle with their initials as a fallback avatar. For the same user, that color differed depending on where in the app it was rendered — e.g. orange in the topbar/Settings → My Profile page, but blue in the sidebar's bottom user-menu avatar (and vice versa in a second reported example).

Expected behavior per `doc/CLAUDE.md` UI Rule 26: "Background color: derived from the user's name deterministically (same name = same color every time)."

## Root cause

There was no shared avatar-color utility. Eight separate call sites each hand-rolled their own hash-and-palette logic independently:

- `components/settings/settings-top-bar.tsx`
- `components/settings/profile-section.tsx`
- `components/settings/workspace-members-section.tsx`
- `components/pages/share-panel.tsx`
- `components/notifications/notification-toast.tsx`
- `components/notifications/notification-card.tsx`
- `app/orbit-admin/orbit/users/page.tsx`
- `app/orbit-admin/orbit/users/[id]/page.tsx`

The specific, directly-reported mismatch: `components/sidebar/sidebar.tsx`'s `UserAvatar` (used for the collapsed rail avatar, the user-menu popup, and the bottom user-menu trigger) never derived a color at all — it hardcoded `bg-primary` for every user, unconditionally — while `settings-top-bar.tsx` and `profile-section.tsx` computed a genuine per-user hash color from the same 8-color palette. Same person, one fixed color in the sidebar vs. a name-derived color everywhere else.

Beyond that one directly-reported pair, the other six implementations were also silently divergent from each other and would produce inconsistent colors for the same user across other parts of the app:

- Palette size varied: 8 colors (4 files), 9 colors (2 notification files, extra `bg-warning/70`), or 6 colors (2 Orbit Admin files, using `bg-secondary-foreground` instead of the `/70` variants).
- Hash-to-index math varied: some did `h = (h*31+code)|0` then `Math.abs(h) % len`, others did `h = (h*31+code) >>> 0` then plain `h % len` — not equivalent for the same input.
- The seed string varied: most hashed the display name (name-or-email), but the two Orbit Admin pages hashed `user.id` instead — a different value from what every other page hashes for that same user, guaranteeing a mismatch even if the palette and hash math had matched.

This is exactly the kind of drift Rule 26 exists to prevent, but nothing enforced a single implementation — each new avatar spot was copy-pasted and tweaked independently.
