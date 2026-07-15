# Solution: resolve reactor names server-side, show "X reacted with 😀" everywhere

**Fixed:** 2026-07-16

## What changed

- **`app/api/pages/[id]/comments/route.ts`** — after loading all comments for the page, collects every distinct reactor user ID referenced across all comments' `reactions` JSON, resolves them to names in one batch `users` query, and returns the result as a new `reactionUsers: Record<userId, name>` field alongside the existing `comments` array. This is additive — the `reactions` shape itself (`Record<emoji, userId[]>`) is untouched, so nothing that reads/writes it (optimistic toggle logic, the react POST endpoint) needed to change.
- **`lib/comments/format-reaction-tooltip.ts`** (new) — a single shared `formatReactionTooltip(emoji, userIds, nameById)` helper used by every reaction badge, so the phrasing ("X reacted with 😀", "X and Y reacted with 😀", "X, Y, and N others reacted with 😀") is identical everywhere instead of being reimplemented per component. It always shows the reactor's real name, including for your own reaction — an initial version substituted "You" for the current user, but that was explicitly reversed per user feedback in favor of always naming the actual reactor.
- **`components/editor/comment-card.tsx`** — `CommentsData` now carries `reactionUsers`; it's threaded from `CommentCard` through both `ThreadSection` render sites (inline + floating variants) and down into `ReplyRow`. `ThreadSection`'s reaction badge tooltip switched from the generic "Add/Remove reaction" action hint to the resolved "X reacted with 😀" text. `ReplyRow` had no hover-tooltip mechanism at all on its reaction badge — added `useHoverTooltip` + the `IconTooltip` portal (matching the pattern already used elsewhere in the same file) and wired it to the same formatter.
- **`components/database/cell-comment-popover.tsx`** — added a `reactionUsers` state populated from the same `/api/pages/[id]/comments` response (it already fetches from that endpoint, so no new request), and wired the existing `showTooltip`/`hideTooltip` hook (already used for other icons in this file) onto the reaction badge with the same shared formatter.
- **`components/pages/page-comment-button.tsx`** — the sidebar "Comments"/"All discussions" panel (`PageCommentButton` → `DiscussionItem`) is a third, independent reaction-badge implementation that was missed in the first pass. Same treatment: `reactionUsers` state populated from its own `load()` call to `/api/pages/[id]/comments`, threaded into `DiscussionItem` as a new prop, and wired onto its reaction badge with the already-present `useHoverTooltip` hook (it already showed tooltips for the row's other action icons — the reaction badge just never had `onMouseEnter`/`onMouseLeave` at all) using the same shared formatter.

## Why this fixes the root cause

The badges never had names to show because `reactions` only ever carried IDs — no amount of tooltip wiring alone would have fixed it. Resolving names once, server-side, in a single batched query (rather than per-badge or per-emoji) keeps this cheap regardless of how many people reacted, and putting the phrasing in one shared helper means every reaction surface in the app — page/block comments, replies, and database cell comments — reads identically instead of drifting into inconsistent wording over time.

## Verification

`tsc --noEmit` passes for all touched files. Not manually verified in a live browser in this session — worth confirming visually: react to a comment (including your own) and check the tooltip reads "{name} reacted with {emoji}" using the actual reactor's name in every case, in the page comments panel, a database cell's comment popover, and the sidebar "Comments"/"All discussions" panel.
