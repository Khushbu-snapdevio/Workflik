# Bug: uploaded images in the page editor can't be clicked to preview

**Reported:** 2026-07-21

## Symptom

Insert an image into a page (via `/image`, drag-drop, or paste) and it renders inline with hover actions ("Caption", "Delete", "Change"). Clicking the image itself does nothing — there's no way to see it at full size without those three hover buttons, none of which show a larger preview. This is inconsistent with every other place in the app that shows an uploaded image thumbnail (posted comment attachments, the database Files & media property, and — after the prior fix in this doc series — the comment composer's pending attachment), all of which already open a full-size lightbox on click.

## Root cause

`ImageBlockView` in `components/editor/extensions/media-blocks.tsx` (the TipTap node view backing the editor's Image block — shared by every page, template, and database entry that uses the block editor) renders a bare `<img>` with only an `onError` handler; it was never given an `onClick`. `MediaActions` (the "Caption / Delete / Change" overlay, also defined in this file and reused by the Video/Audio/File block views) covers editing/replacing the image but has no view/preview action at all.

The rest of the app already solved this exact problem with a shared `ImageLightbox` component (`components/editor/comment-card.tsx`), reused by three other call sites (`database/cell-comment-popover.tsx`, `database/cells/cell-editor.tsx`, `database/cells/cell-display.tsx`) — the editor's own Image block was simply never wired up to it.
