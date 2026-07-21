# Bug: dragging the block handle grip to reorder blocks does nothing

**Reported:** 2026-07-21

## Symptom

Hovering a block in the page editor reveals the "⠿" grip handle (tooltip: "Drag to reorder · Click for options"). Pressing and dragging it down over other blocks, intending to reorder, silently does nothing — no block moves, no error, no visual feedback that anything went wrong.

## Root cause

`components/editor/block-handle.tsx` bridges a native HTML5 drag (the grip button, `draggable`, rendered in a `document.body` portal outside the editor's own DOM) into TipTap/ProseMirror's internal drop handling by manually priming `view.dragging` before the browser-native drag begins — necessary because ProseMirror's own `dragstart` handler only ever fires for drags that start on `view.dom` itself, which this portal-rendered button isn't part of. Two things about that bridge were fragile enough to produce exactly this "quietly does nothing" failure mode:

1. **The drag-in-progress window raced the component's own mouse tracking.** `BlockHandle` repositions the grip via a `document`-level `mousemove` listener that re-resolves "which block is the cursor over" on every move. Native HTML5 drag requires the exact DOM element that received `mousedown` to stay in place until the browser commits to the gesture and fires `dragstart` — but there's a real window (the few pixels of movement browsers wait for before committing) where that `mousemove` listener is still live. If the cursor drifted back over the editor content during that window, the listener could re-resolve to a different block and reposition the grip out from under the in-progress gesture, which can silently prevent `dragstart` from ever firing.
2. **The drop-time delete depended on live selection state.** ProseMirror's drop handler, given `view.dragging.move`, deletes the source by either (a) mapping a `NodeSelection` stored on `view.dragging.node` through the drop transaction, or (b) falling back to `tr.deleteSelection()` — deleting whatever `view.state.selection` happens to be *at the moment the drop lands*. The code only ever set `{ slice, move: true }` — no `node` — so it was always on path (b), relying on the `NodeSelection` it dispatched at drag-start to still be the live editor selection by drop time. Since the drag originates from a button entirely outside the contenteditable DOM (which steals and only later restores focus), that's a narrower assumption than it looks.

## Reproduction

1. Open any page with a few blocks of content.
2. Hover a block to reveal its "⠿" grip handle.
3. Press and drag it down past one or more other blocks, then release.
4. The blocks stay in their original order — no reorder, no error.
