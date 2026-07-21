# Bug: @-mention never shows any workspace members, only Dates

**Reported:** 2026-07-21

## Symptom

Typing `@` in a comment (or the page editor) and starting to type a person's name never surfaces any workspace members in the suggestion popup — only the "Dates" section (Today/Tomorrow/Yesterday/Next Monday/etc.) ever appears, regardless of how many members the workspace actually has.

## Root cause

`fetchMentionItems()` in `components/editor/extensions/mention-extension.ts` fetched `/api/workspaces/:id/members` and read each row as `{ userId, id, name, image }`:
```ts
const id = m.userId ?? m.id;
if (id && m.name) {
  items.push({ mentionType: "user", id, label: m.name, image: m.image });
}
```
But that endpoint (`app/api/workspaces/[id]/members/route.ts`) actually returns rows shaped `{ userId, userName, userEmail, userImage, status, ... }` — every other consumer in the codebase (`workspace-members-section.tsx`, `user-hover-card.tsx`, `share-panel.tsx`, `cell-editor.tsx`) reads `m.userName`/`m.userEmail`/`m.userImage`. Since `m.name` was always `undefined` on the real response shape, `if (id && m.name)` was false for every single member, so the People list was silently empty every time — leaving only the always-included Dates section visible. The endpoint also doesn't support the `q`/`limit` query params the mention code was sending, so filtering-as-you-type was never happening either.
