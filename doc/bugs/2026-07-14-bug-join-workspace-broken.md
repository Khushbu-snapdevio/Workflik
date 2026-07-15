# Bug: sidebar's "Join workspace" option was broken and confusing

**Reported:** 2026-07-14

## Symptom

The sidebar's workspace switcher had a prominent "Join workspace" option — paste an invite link, click Join. It never worked: pasting any link (even a genuinely valid, freshly-generated one from Settings → General) always showed "This invite link is invalid."

Root cause (see full audit in the conversation this was diagnosed in): there are two separate invite mechanisms in this app —
1. A per-person **email invite** (admin invites a specific email + role from Settings → Members) — fully functional end to end.
2. A **shareable link** (generate/copy/regenerate/disable from Settings → General, "anyone with this link joins at a preset role") — fully built on the *generating* side, but the accept page/API only ever checked the email-invite's token, never the shareable link's token. Nothing could actually join through that link.

So the switcher's "Join workspace" button was a fully-built UI pointing at a feature that could never succeed, while the *actual* working way to add someone (email invite) was buried in Settings → Members, requiring a full page navigation away from wherever the user currently was.

This is also a mismatch with the product itself: Workflik targets small, known teams (3–15 people) — a "anyone with this link can join" mechanism is a pattern suited to larger, open communities, not a small team where the admin already knows exactly who should have access.
