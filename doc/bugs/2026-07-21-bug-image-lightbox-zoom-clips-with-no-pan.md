# Bug: zooming in the image preview clips the image with no way to see the rest

**Reported:** 2026-07-21

## Symptom

In the image preview/lightbox (opened from comment attachments, database Files & media cells, or the editor's Image block), clicking "Zoom in" past 100% visually enlarges the image but the parts that grow past the visible area are simply gone — there's no way to drag/scroll to see the rest of the image at higher zoom. The viewer is unusable for actually inspecting a zoomed-in region.

## Root cause

The toolbar redesign added earlier in this doc series (`2026-07-21-solution-comment-composer-attachment-no-preview.md` and friends) implemented zoom as a bare CSS `transform: scale(zoom/100)` on the `<img>`, with the surrounding container left at `overflow: auto`. `transform: scale()` is purely visual — it does not change the element's layout box, so the browser has nothing to attach scrollbars to; the scaled-up image just overflows its container and gets clipped by the flex layout with no scroll path to the clipped region. Panning (drag-to-scroll) was never implemented at all, so once zoomed in there was no way to reach anything outside the initially-centered viewport.

## Reproduction

1. Open any image preview (e.g. click an image attached to a comment).
2. Click "Zoom in" a few times.
3. The image grows, but its edges/corners are cut off by the preview frame with no scrollbar, drag, or other affordance to bring them into view.
