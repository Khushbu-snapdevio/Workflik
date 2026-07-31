# Solution: add a plain-text "@" autocomplete dropdown shared by all three comment inputs

**Fixed:** 2026-07-31

## What changed

**`hooks/use-mention-autocomplete.tsx`** (new) — `useMentionAutocomplete({ workspaceId, getText, setText, inputRef })`. Given a plain-text input's ref and get/set accessors for its value, it:
- Detects an in-progress "@query" ending at the caret (`onTextChanged(currentText)` — called with the input's fresh value directly, since reading back through `getText()` in the same handler that just called `setText()` would still see the pre-keystroke value).
- Fetches `GET /api/workspaces/:id/members` (the same endpoint `mention-extension.ts` already uses for the page editor's mention list) and filters to active members whose display name matches, capped at 6.
- Renders a positioned dropdown (portaled to `<body>`, positioned under the input) of matching members with avatar + name.
- Handles ArrowUp/ArrowDown/Enter/Tab/Escape via `handleKeyDown(e)`, returning whether it consumed the key so the caller's own Enter-submits handling can defer to it.
- On pick, splices `"@Display Name "` into the plain string in place of the typed query — no rich-text content model needed, matching how comments are already stored here.

**`components/database/cell-comment-popover.tsx`** — instantiated the hook three times (`newMention`, `editMention`, `replyMention`, one per text box), wired each input's `onChange`/`onKeyDown` to call into it and render its `.dropdown`, and updated `insertMention`/`insertEditMention`/`insertReplyMention` (the toolbar "@" button) to also trigger the dropdown immediately after inserting "@" (from inside the existing `setTimeout` that repositions the caret, so the ref's `selectionStart` is already up to date when checked).

**Follow-up**: the dropdown initially rendered but clicking a name did nothing — `CellCommentPopover` has its own capture-phase outside-click listener that closes the *entire* comment popover on any click outside `popoverRef`/`moreMenuRef`/`emojiMenuRef`, and it ran before the dropdown's own click handler since the dropdown is portaled to `<body>` (not a descendant of any of those refs). That listener already special-cases a `[data-comment-exempt]` attribute (the same convention `comment-card.tsx` uses for its own nested portals) — just never had anything to actually exempt inside this file. Added `data-comment-exempt` to the dropdown's container so clicking a suggestion no longer closes the popover out from under `selectItem`.

## Why this fixes the root cause

The "@" button and typing "@" were both just text insertion with nothing behind them. The hook adds the missing piece — detection, lookup, and a real dropdown — once, shared by all three inputs instead of tripling the same fetch/filter/keyboard-nav logic inline. Since every template view (table/board/gallery/calendar) renders comments through this one shared `CellCommentPopover`, fixing it here fixes it everywhere it's used.

## Verification

`tsc --noEmit` is clean. `biome check` is clean on the new hook file; the edited lines in `cell-comment-popover.tsx` match the file's existing (pre-existing, unbraced single-line `if`) style, so no new lint debt beyond what was already there. Traced the staleness concern by hand: `onTextChanged` takes the just-typed value as a parameter rather than reading back through the `getText` closure, so it never lags a keystroke behind.
