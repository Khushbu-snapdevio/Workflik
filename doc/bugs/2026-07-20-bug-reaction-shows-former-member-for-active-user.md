# Bug: comment/reaction shows "Former Member" for an active, current user

**Reported:** 2026-07-20

## Symptom

Reacting to a comment (or being its author) shows "Former Member" in the tooltip/byline instead of the actual logged-in user's name — even though that user is very much still an active workspace member, not someone whose account was removed.

## Root cause

`app/api/pages/[id]/comments/route.ts`'s `GET` handler built two things this way:

- Comment/reply `author` objects: `{ id: r.authorId, name: r.authorName, ... }`, then the client (`components/editor/comment-card.tsx`) rendered `thread.author?.name ?? "Former Member"`.
- Reactor names: `reactionUsers = Object.fromEntries(reactorRows.map((u) => [u.id, u.name]))`, then `lib/comments/format-reaction-tooltip.ts` rendered `nameById[id] || "Former Member"`.

Both fell back to "Former Member" whenever `users.name` was falsy — but `users.name` is simply `null` for any user who never set a display name (it's an optional profile field, not a marker of account status). "Former Member" is meant for the *different* case where the user no longer exists at all (author/reactor id doesn't resolve to any `users` row — the genuinely deleted-account case per `doc/CLAUDE.md`'s Account Deletion section). The code never distinguished "name field is empty" from "this person is gone" — any active user who hadn't set a name was mislabeled as one who'd left.

While tracing this, also found two now-dead queries at the top of the same handler (`roots` and `replies`, an earlier all-comments-then-just-replies approach) that were fully superseded by a later `allComments` re-query but never removed — two wasted DB round-trips on every single request, unrelated to the identity bug but in the same file.
