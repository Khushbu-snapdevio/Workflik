# Solution: derive a display name from email before ever falling back to "Former Member"

**Fixed:** 2026-07-20

## What changed

All in **`app/api/pages/[id]/comments/route.ts`**:

1. Added a small local helper, `displayName(name, email)`, returning `name || email.split("@")[0]` — the same "no name set → use the email's local part" fallback already used elsewhere in the app (e.g. the workspace home greeting), rather than a label implying the person left.
2. Comment/reply `author` objects now resolve `name: displayName(r.authorName, r.authorEmail)` instead of the raw (possibly-null) `r.authorName`. `author` itself is still `null` exactly when `authorId` is null — the real "this account no longer exists" case — so `comment-card.tsx`'s existing `thread.author?.name ?? "Former Member"` now only ever hits that fallback for that case, with no client change needed.
3. `reactorRows` now also selects `email`, and `reactionUsers` maps each id through the same `displayName()` helper. An id is only *absent* from the map when it no longer belongs to any user, so `format-reaction-tooltip.ts`'s existing `nameById[id] || "Former Member"` is now correct as-is.
4. Removed the two dead `roots` and `replies` queries (superseded by `allComments`, never read afterward) — two fewer DB round-trips per request, no behavior change.

## Why this fixes the root cause

"Former Member" and "no display name set" were being treated as the same signal (any falsy `name`) when they're not — one means the account is gone, the other means a perfectly normal user hasn't filled in an optional field. Resolving a real fallback name server-side, in the one place both the comment-author and reaction-tooltip paths already get their data from, means "Former Member" now only ever appears when it's actually true, without touching either client component's rendering logic.

## Verification

`npx tsc --noEmit` passed. Verified directly against the API: created an isolated test user with `users.name = NULL`, had them author a comment and react to it, signed in as them, and confirmed `GET /api/pages/:id/comments` returned `author.name: "qa-noname"` and `reactionUsers: { "<id>": "qa-noname" }` (derived from their email) instead of `null` — which the client would have rendered as "Former Member" before this fix. Test data cleaned up afterward.
