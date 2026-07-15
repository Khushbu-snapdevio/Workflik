# Bug: hovering a comment reaction badge doesn't show who reacted

**Reported:** 2026-07-16

## Symptom

When a comment (page/block comment or a database cell comment) has an emoji reaction on it, the reaction badge only shows the emoji and a count (e.g. "😊 1"). Hovering over it gives no indication of who reacted — at most a generic "Add reaction"/"Remove reaction" hint, and for replies in the page-comments panel, no tooltip at all. Notion shows a tooltip like "Khushbu Pambhar reacted with 😀" on hover; Workflik showed nothing equivalent.

## Reproduce

1. Open any page and add a comment (or open a database entry's property comment popover).
2. React to the comment with an emoji.
3. Hover the resulting reaction badge.
4. Expected (Notion-style): a tooltip naming who reacted, e.g. "Khushbu Pambhar reacted with 😀". Actual: no name shown anywhere in the UI.

This also applies to the sidebar "Comments" panel (topbar comment button → `Sheet` listing every discussion on the page, with Open/Resolved tabs) — its reaction badges had no hover behavior whatsoever, not even a generic action hint.

## Root cause

`comments.reactions` is stored (and returned by `GET /api/pages/[id]/comments`) as `Record<emoji, userId[]>` — only raw user IDs, no names. Every reaction-badge renderer had only those IDs, so there was no way to display a name even if a tooltip had been wired up:

- `ThreadSection` (`components/editor/comment-card.tsx`) showed a generic "Add/Remove reaction" action hint instead of naming reactors.
- `ReplyRow` (same file) had no hover tooltip mechanism on its reaction badge at all.
- `cell-comment-popover.tsx`'s thread reaction badges had no tooltip either.
- `DiscussionItem` in `components/pages/page-comment-button.tsx` (the sidebar "Comments"/"All discussions" panel) — a third, independent reaction-badge implementation — also had no tooltip wiring on its badge, which is why hovering it showed nothing at all.
