# Solution: freeze position-tracking from mousedown, and give the drop handler a self-contained node reference

**Fixed:** 2026-07-21

## What changed

**`components/editor/block-handle.tsx`**:
- Added a `dragIntentRef`, set to `true` in the grip's `onMouseDown` (not just once `dragstart` fires) and reset to `false` by a single global `mouseup` listener — covering a click, a completed drag, and an abandoned one alike. The `mousemove`-driven repositioning effect and the scroll-repositioning effect both now bail out early while `dragIntentRef.current` is true, so the grip's DOM node and position stay untouched for the entire mousedown→drop window, not just once a drag is already confirmed underway.
- `handleDragStart` now sets `view.dragging = { slice, move: true, node: nodeSel }` — passing the already-created `NodeSelection` as `.node`, which isn't part of `view.dragging`'s public `{slice, move}` type but is read by ProseMirror's internal drop handler when present. With it set, the source deletion at drop time uses `node.replace(tr)` (which maps the `NodeSelection`'s *own* captured position through the drop transaction) instead of `tr.deleteSelection()` (which deletes whatever the *live* editor selection is at that moment) — removing the drop's correctness from depending on that selection surviving unchanged for the duration of the drag.
- Corrected the stale comment above the focus call, which attributed the `view.dom.focus()` requirement to an `editorOwnsSelection()`/`view.hasFocus()` gate inside the drop handler — that gate is actually part of `selectionToDOM` (syncing the *model* selection into the *native DOM* selection for rendering), unrelated to `tr.deleteSelection()`'s behavior. The focus call is still correct to keep (it's what a real in-editor drag would also do), just not for the reason previously written down.

## Why this fixes the root cause

Bridging an external native drag into ProseMirror's internal drop handling is inherently a "make it look like this came from inside the editor" exercise, and both fixes tighten that illusion at exactly the two points it was leaking: the DOM identity of the drag source has to survive untouched from `mousedown` to `dragstart` (not just from `dragstart` onward, which is all the previous code protected), and the drop's own bookkeeping needs to work off state captured once at drag-start rather than state that has to coincidentally still be correct when the drop actually lands.

## Verification

`npx tsc --noEmit` passed with no new errors. `biome check` reports the same finding count on this file before and after (38, confirmed via `git stash`) — no new issues introduced.

Not verified live in a real drag gesture — the local dev instance is invite-only with no test credentials available in this environment, so this is reviewed against ProseMirror's actual installed source (`prosemirror-view@1.41.9`) rather than click-tested. Please confirm block drag-reorder now works as expected.
