# Solution: reuse the existing `ImageLightbox` for the composer's pending attachment

**Fixed:** 2026-07-21

## What changed

**`components/editor/comment-composer.tsx`**:
- Added a `previewOpen` boolean state.
- Wrapped the pending image thumbnail in a `<button onClick={() => setPreviewOpen(true)}>` (matching `ImageAttachment`'s pattern in `comment-card.tsx`) with `cursor-zoom-in`.
- Renders `<ImageLightbox src={attachment.preview} alt={attachment.name} onClose={...} />` when `previewOpen` is true — imported directly from `@/components/editor/comment-card`, the same component already reused by `database/cell-comment-popover.tsx`, `database/cells/cell-editor.tsx`, and `database/cells/cell-display.tsx` for this exact purpose.
- The existing "×" remove button is a sibling of the new preview button (not nested inside it), so clicking it still only removes the attachment and does not also open the lightbox.

No changes to `comment-card.tsx` — `ImageLightbox` was already exported and used by three other call sites; the composer just wasn't one of them.

## Why this fixes the root cause

The thumbnail was missing an `onClick` entirely, not a broken one — there was no gap in `ImageLightbox` itself to fix. Wiring the same shared component the app already uses everywhere else an attachment/file thumbnail needs a click-to-zoom preview makes the composer's pre-send state match the post-send state exactly, with no new preview implementation to maintain.

## Verification

`npx tsc --noEmit` passed with no new errors in `comment-composer.tsx` or `comment-card.tsx`.
