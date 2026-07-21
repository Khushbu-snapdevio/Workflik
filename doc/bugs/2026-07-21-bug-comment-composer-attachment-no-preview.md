# Bug: pending image attachment in the comment composer can't be clicked to preview

**Reported:** 2026-07-21

## Symptom

When writing a comment and attaching an image (via the paperclip button or drag-drop), the thumbnail shown above the "Write a comment…" box before sending is a static image — clicking it does nothing. The only interactive element on it is the small "×" remove button that fades in on hover. Once the comment is actually posted, the same image (rendered by `ImageAttachment` in `comment-card.tsx`) *does* open a full-size lightbox preview on click — so the pre-send draft state is inconsistent with the post-send state.

## Root cause

`components/editor/comment-composer.tsx`'s attachment preview rendered a bare `<img>` with no click handler at all — it was only ever wrapped for layout (`relative inline-block group`, to position the hover "×" button), never made interactive. `components/editor/comment-card.tsx` already has this exact pattern solved for posted comments: `ImageAttachment` wraps its `<img>` in a `<button onClick={() => setOpen(true)}>` and renders `ImageLightbox` (a portaled full-screen preview, closable via the backdrop, its own "×", or Escape) when open. The composer's draft thumbnail just never got the same treatment.
