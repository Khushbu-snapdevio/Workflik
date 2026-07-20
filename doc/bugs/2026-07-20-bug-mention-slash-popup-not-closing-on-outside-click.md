# Bug: "@" mention and "/" slash-command popups never close on outside click

**Reported:** 2026-07-20

## Symptom

Typing `@` (or `[[`) in the editor or a comment composer opens a suggestion popup (people/pages/dates for `@`, block types for `/`). Clicking anywhere outside it — the sidebar, the topbar, another panel — does nothing; the popup stays open indefinitely. Only continuing to type/delete inside the editor, or navigating away, made it go away.

## Root cause

Both `components/editor/mention-list.tsx` and `components/editor/slash-menu.tsx` render their popup as a bare `position: fixed` `<div>`, entirely outside the editor's own DOM, with no click-outside handling of their own — unlike essentially every other floating panel in this codebase (`EmojiGridPicker`, `SimpleDropdown`, the floating `CommentCard`, `FilterChip`'s dropdown, etc.), which all register their own `document.addEventListener("mousedown", ...)` listener.

Their visibility is driven entirely by TipTap's `@tiptap/suggestion` plugin (`onStart`/`onUpdate`/`onExit` → `opts.onUpdate(props | null)`), which only re-evaluates whether the suggestion is still "active" on document/selection transactions *inside that editor instance*. A click somewhere else on the page never produces such a transaction, so the plugin's internal state stays `active: true` forever — the popup calling `onExit` is the only thing that ever unmounts it, and nothing was telling it to.
