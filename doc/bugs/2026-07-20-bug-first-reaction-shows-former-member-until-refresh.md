# Bug: your first reaction on a page shows "Former Member" until you refresh

**Reported:** 2026-07-20

## Symptom

Follow-up to the same day's `reaction-shows-former-member-for-active-user` fix: even after that server-side fix, clicking an emoji to react showed "Former Member" in the tooltip immediately, correcting itself to the real name only after a manual page refresh.

## Root cause

The server-side fix resolved names correctly on `GET /api/pages/:id/comments`, but the reaction UI doesn't refetch that endpoint after reacting — `ThreadSection`/`ReplyRow` (`components/editor/comment-card.tsx`) and `DiscussionItem` (`components/pages/page-comment-button.tsx`) all optimistically patch the `reactions` (emoji → user-id list) map locally and call `POST /api/comments/:id/react`, which only ever returned `{ reactions }`. The separate `reactionUsers` (id → name) map they read from is only ever populated by the last full comments fetch — so the very first time a given user reacts to *anything* on a page, their own id simply isn't in that map yet, and the tooltip's existing `nameById[id] || "Former Member"` fallback (correctly, by design) kicks in for what looks to the user like a wrong name rather than a missing one.
