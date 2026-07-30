# Bug: "Link to page" search dropdown stays open on top of the Comments panel

**Reported:** 2026-07-30 (user-reported with screenshot showing the "Link to page" RECENT dropdown still visible after opening the Comments side panel)

## Symptom

After inserting a "Link to page" block via the slash command but before picking a result, opening the Comments panel (via the toolbar button) leaves the page-search dropdown floating on screen, overlapping the Comments panel. Only one floating panel/popup should be open at a time.

## Root cause

The "Link to page" search UI in [components/editor/extensions/reference-blocks.tsx](components/editor/extensions/reference-blocks.tsx) is the node view for an unresolved `linkedPage` node (`LinkedPageView`, pageId empty). Unlike the sibling `BlockTypeSelect` component defined earlier in the same file (which closes itself on outside click via a `mousedown` document listener), `LinkedPageView` had **no dismiss affordance at all** — no outside-click handling and no Escape handling. The only way to make its dropdown go away was to pick a page from the results.

The Comments panel (`components/pages/page-comment-button.tsx`) manages its own open state independently via a Radix `Sheet`, with no coordination with any other UI in the app — there is no shared "active panel" registry anywhere in the codebase; every popup/panel manages only its own local state. Since the search dropdown renders at `z-[200]` and the Sheet at `z-50`, clicking the Comments toolbar button opened the Sheet but left the still-mounted, un-dismissed search dropdown rendering on top of it.
