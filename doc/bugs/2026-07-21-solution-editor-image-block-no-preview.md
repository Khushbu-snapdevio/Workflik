# Solution: wire the editor's Image block to the shared `ImageLightbox`

**Fixed:** 2026-07-21

## What changed

**`components/editor/extensions/media-blocks.tsx`**:
- Imported `ImageLightbox` from `@/components/editor/comment-card` (the same shared component already reused by three database-cell call sites, and by the comment composer's pending-attachment thumbnail as of the prior fix in this pair series).
- `ImageBlockView` gained a `previewOpen` boolean state.
- The block's `<img>` now has `onClick={() => setPreviewOpen(true)}` and `cursor-zoom-in`. It sits as a sibling of the absolutely-positioned `MediaActions` overlay (Caption/Delete/Change), not a parent of it, so those buttons' clicks never bubble into the new image-click handler and vice versa — no `stopPropagation` needed.
- Renders `<ImageLightbox src={src} alt={captionDraft || "Image"} onClose={...} />` when `previewOpen` is true.

`VideoBlockView`, `AudioBlockView`, and `FileBlockView` (which reuse the same `MediaActions` overlay) were left unchanged — video/audio already have their own native playback controls, and the generic file block has no image-specific "preview" concept to add.

## Why this fixes the root cause

`ImageBlockView` is the one node view behind every uploaded image in the block editor — pages, database entry bodies, and templates all render through it, since TipTap extensions are registered once and shared app-wide. Fixing it here (rather than per-surface) closes the gap everywhere images can be uploaded in the editor in one change, and reuses the exact lightbox component the rest of the app already standardized on instead of introducing a second preview implementation.

## Verification

`npx tsc --noEmit` passed with no new errors in `media-blocks.tsx` or `comment-card.tsx`.
