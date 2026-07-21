# Solution: real pan state + edge-clamped drag, plus wheel-to-zoom

**Fixed:** 2026-07-21

## What changed

**`components/editor/comment-card.tsx`** (`ImageLightbox`):
- Added `pan: { x, y }` state alongside `zoom`, applied together via a single `transform: translate(pan.x, pan.y) scale(zoom/100)` on the `<img>`. The surrounding container switched from `overflow-auto` (which does nothing for a `transform`-scaled element) to `overflow-hidden`, since panning is now handled entirely by the `translate` offset instead of native scroll.
- Added a `clampPan(pan, zoomPct, natural, container)` helper: given the image's natural pixel dimensions (captured via the `<img>`'s `onLoad`) and the current container size, it computes the same fit-to-container base size CSS `object-contain` would produce, scales it by the current zoom, and clamps the pan offset so the image can be dragged right up to its edges but never past them — every part of the image stays reachable, and it can never be dragged away into empty space with no way back.
- Drag-to-pan uses the Pointer Events API (`onPointerDown` / `onPointerMove` / `onPointerUp` on the `<img>`, with `setPointerCapture`/`releasePointerCapture`) rather than document-level mouse listeners — simpler cleanup, and it unifies mouse/touch/pen input for free. Dragging is only armed when `zoom > 100` (at ≤100% the whole image already fits, so panning would be a no-op).
- Added scroll-wheel zoom (`onWheel`, proportional to `deltaY`) for continuous "smooth" zooming alongside the existing stepped +/− buttons, and double-click to toggle between 100% and 200% (re-centering pan first).
- `applyZoom(nextZoom)` is now the single path for every zoom change (buttons, wheel, reset, double-click) — it clamps the zoom value, then immediately re-clamps the *existing* pan against the *new* zoom, so zooming out after panning to a corner doesn't leave the pan offset pointing at empty space.
- The CSS transition on the image transform is now conditional: disabled while actively dragging (so the image tracks the cursor 1:1 with no lag), enabled otherwise (buttons, wheel, reset) so those changes animate smoothly instead of jumping.
- Added `useScrollLockWhileOpen(true, () => false)` — locks page/touch scrolling behind the overlay for as long as it's mounted, matching every other modal in this app, and is also what makes wheel-to-zoom and touch-drag-to-pan safe: without it, a wheel/touch gesture over the image would also scroll the page underneath.

## Why this fixes the root cause

`transform: scale()` alone was never going to work here — it doesn't participate in layout, so there was structurally no way for `overflow` to produce scrollbars for it. The fix replaces "let the browser's scroll box handle overflow" with an explicit pan offset that the component computes and clamps itself, which is what image viewers actually do under the hood. Deriving the clamp bounds from the image's real natural size (rather than guessing) means the math holds for any image aspect ratio or container size, so the "can always reach every edge, never past it" guarantee holds regardless of what's being previewed.

## Verification

`npx tsc --noEmit` passed with no new errors. `biome check` findings on the touched region are all pre-existing categories (attribute-sort ordering, a11y warnings on the click-outside-to-close backdrop) confirmed present on the pre-change baseline via `git stash`.
