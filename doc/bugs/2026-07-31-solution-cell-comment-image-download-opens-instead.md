# Solution: the download button wasn't receiving clicks at all

**Fixed:** 2026-07-31

## What changed

Two earlier passes addressed a real but, it turned out, not-yet-relevant problem — the `download` attribute/client-side `fetch()` being unreliable for cross-origin (S3/CDN) URLs — and are still in place as genuine improvements:

- **`app/api/attachments/download/route.ts`** (new) — `GET ?url=&name=`, requires a session, allowlists `url`'s host against `NEXT_PUBLIC_APP_URL`/`CDN_URL`, fetches the attachment server-to-server (CORS never applies there), and returns it with `Content-Disposition: attachment`.
- **`components/database/cell-comment-popover.tsx`**'s `downloadAttachment` and **`components/editor/comment-card.tsx`**'s `downloadImage` both route http(s) URLs through that proxy instead of the original cross-origin one.

Neither one was the actual cause of the reported symptom, though — the button's click handler was never running in the first place. In `cell-comment-popover.tsx`'s posted-image hover overlay, the download button sits inside a wrapper `<div className="pointer-events-none absolute inset-0 ...">` (deliberately non-interactive, so the overlay doesn't block clicks meant for the image/lightbox underneath it). Its sibling — the zoom button — opts back into being clickable with its own `pointer-events-auto`. The download button never got that same class. `pointer-events: none` is inherited by descendants that don't override it, so every click on the visually-present, hover-highlighted download button was actually passing straight through to the div underneath it (`onClick={() => setLightbox(att.url)}`) — opening the lightbox regardless of what the button's own `onClick` did or how reliable its download logic was.

Added `pointer-events-auto` to the download button's className, matching the zoom button right next to it.

## Why this fixes the root cause

`pointer-events: none` on an ancestor makes an element (and anything inside it that doesn't explicitly re-enable pointer events) invisible to the mouse for hit-testing purposes — clicks fall through to whatever's rendered behind it. The button looked clickable (hover highlight, cursor, everything) but structurally wasn't. No amount of fixing what the `onClick` handler *does* could have mattered while the click was never reaching it.

## Verification

`tsc --noEmit` and `biome check` are clean on all changed files. Traced the CSS inheritance by hand: the overlay div is `pointer-events-none`; the zoom `<span>` has `pointer-events-auto` and was therefore always clickable; the download `<button>` lacked it and therefore wasn't — now it matches.
