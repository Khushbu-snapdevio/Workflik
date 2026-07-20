# Solution: the react endpoint returns the reactor's resolved name; clients merge it in instantly

**Fixed:** 2026-07-20

## What changed

1. **`lib/users/display-name.ts`** (new) — extracted the `displayName`-style fallback (real name, else the email's local part) out of the comments route into a shared helper, `resolveDisplayName()`, so it isn't duplicated between the comments GET route and the react endpoint.
2. **`app/api/pages/[id]/comments/route.ts`** — now imports and uses the shared helper instead of its own local copy (no behavior change, just deduplication).
3. **`app/api/comments/[id]/react/route.ts`** — the response now includes `reactorId` and `reactorName` (resolved via `resolveDisplayName(session.user.name, session.user.email)` — already available on the session, no extra query) alongside the existing `reactions`.
4. **`components/editor/comment-card.tsx`** — `CommentCard` gained `mergeReactionUser(id, name)`, merging a single id/name pair into its `data.reactionUsers` state. Threaded down as a new `onReactionUserResolved` prop through both `ThreadSection` and `ReplyRow` (each has its own `toggleReaction`), called with the react endpoint's `reactorId`/`reactorName` right after a successful reaction.
5. **`components/pages/page-comment-button.tsx`** — identical fix for the sidebar "All discussions" pane's own separate `DiscussionItem`/`toggleReaction`, which duplicates this same reaction-handling logic independently of `comment-card.tsx`.
6. **`components/database/cell-comment-popover.tsx`** — no change needed. It uses a different endpoint path (`PATCH /api/pages/:id/comments/:commentId` with `action: "react"`) and already calls a full `fetchComments()` after every reaction, which was already picking up the corrected name from the earlier server-side fix.

## Why this fixes the root cause

Rather than forcing every reaction to trigger a full comments-list reload just to refresh one name (which the two affected surfaces deliberately avoid, for instant optimistic feedback), the one new piece of data actually needed — "what's my own display name" — now comes back on the same request that persists the reaction, and gets merged into local state immediately. `reactionUsers` staying otherwise untouched means no unrelated re-render or flash.

## Verification

`npx tsc --noEmit` passed. Verified directly against the API: created an isolated no-name test user, signed in, and reacted to a comment that had **zero** existing reactions (so their id could not already be in any cached `reactionUsers` map) — `POST /api/comments/:id/react` returned `reactorName: "qa-noname2"` (derived from their email) in the same response as the reaction itself. Test data cleaned up afterward.
