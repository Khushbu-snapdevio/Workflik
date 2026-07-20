# Solution: dispatch the suggestion plugin's own exit transaction on outside click

**Fixed:** 2026-07-20

## What changed

**`components/editor/mention-list.tsx`** and **`components/editor/slash-menu.tsx`** each gained:
- A `containerRef` on the popup's root `<div>`.
- A `useEffect` registering a `document` `mousedown` listener (same pattern as every other floating panel in this codebase) that, when the click target isn't inside `containerRef`, calls `exitSuggestion(editor.view, <pluginKey>)` — `@tiptap/suggestion`'s own exported utility for programmatically closing a suggestion "without touching the document or causing mapping errors" (per its own doc comment). `editor` comes straight off `suggestionProps` (`SuggestionProps.editor`), already available in both components.
- `mention-list.tsx` exits **both** `MENTION_PLUGIN_KEY` (`@`) and `PAGE_LINK_PLUGIN_KEY` (`[[`) unconditionally, since the same `MentionList` is shared between both triggers and only one is ever actually active — exiting the inactive one is a harmless no-op. `slash-menu.tsx` exits its own `SLASH_COMMANDS_PLUGIN_KEY`.

Dispatching the plugin's real exit transaction (rather than only hiding the React component) means the plugin's `onExit` callback fires normally and clears the parent's state (`mentionProps`/`slashProps` → `null`) exactly as if the user had pressed Escape — so both editor.tsx's and comment-composer.tsx's existing state management needed no changes at all; both consume the same shared `MentionList`/`SlashMenu` components.

## Why this fixes the root cause

The popup was never missing a "hide" mechanism — Escape and picking an item both already worked. What was missing was any way to tell the underlying ProseMirror plugin "the user is done" from an interaction that happens entirely outside the editor's own event handling. Using the library's own exported `exitSuggestion` (rather than e.g. force-unmounting the React component while the plugin still thinks it's active) keeps the plugin and the UI in sync — a stray `@query`/`/query` remains as plain, uncommitted text, matching what Escape already does.

## Verification

`npx tsc --noEmit` passed. Verified live in the browser on a real page: typed `/` in the page body → block-type menu opened → clicked the topbar (outside the editor) → menu closed immediately, leaving the literal `/` as plain text. Repeated with `@` → the "Dates" suggestion list (Today/Tomorrow/Yesterday/Next Monday/Next Wednesday — the exact popup from the original report) opened and closed the same way on an outside click.
