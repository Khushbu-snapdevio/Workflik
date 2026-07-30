# Solution: "Link to page" search dropdown stays open on top of the Comments panel

## What changed

- [components/editor/extensions/reference-blocks.tsx](components/editor/extensions/reference-blocks.tsx) — `LinkedPageView`:
  - Destructured `deleteNode` from `NodeViewProps` and added a `wrapperRef` around the unresolved search UI.
  - Added a `mousedown` document listener (mirroring the existing `BlockTypeSelect` pattern in the same file) that calls `deleteNode()` whenever the click lands outside the wrapper while no page has been picked yet — since an unresolved "Link to page" block has nothing worth keeping once the user has moved on.
  - Added an `Escape` key handler on the search input that also calls `deleteNode()`.

## Why this fixes the root cause

The unresolved `linkedPage` node had no way to be dismissed short of picking a result, so it (and its dropdown) stayed mounted and rendered on top of anything opened afterward, including the Comments panel. Clicking the Comments toolbar button is a `mousedown` outside the node's wrapper, so it now removes the pending, unresolved node in the same interaction that opens the panel — the two are no longer both visible at once. This follows the same self-contained dismiss pattern already used by `BlockTypeSelect` elsewhere in this file, rather than introducing a new cross-component coordination mechanism the codebase doesn't otherwise have.

## Verification

- `npx tsc --noEmit -p .` — no type errors.
- Not verified in a running browser session (no dev server available in this environment) — recommend a manual pass: insert "Link to page" via the slash command, don't pick a result, then click the Comments toolbar button and confirm the search dropdown is gone and only the Comments panel is open. Also verify Escape dismisses it, and that picking a result still works normally.
