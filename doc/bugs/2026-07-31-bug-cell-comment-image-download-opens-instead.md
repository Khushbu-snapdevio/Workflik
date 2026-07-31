# Bug: clicking "download" on a comment image opens it instead of downloading

**Reported:** 2026-07-31

## Symptom

Hovering an image attached to a database entry comment shows a zoom and a download button. Clicking download opened the image (same as zoom) instead of downloading it.

## Root cause

`components/database/cell-comment-popover.tsx` rendered the download control as `<a href={att.url} download={att.name}>`. The HTML `download` attribute is only honored by browsers for same-origin (or `blob:`/`data:`) URLs — for a cross-origin URL, it's silently ignored and the browser just navigates to (opens) it instead. `lib/storage/drivers/s3.ts`'s `getPublicUrl` serves attachments from a separate CDN/S3 host (`env.CDN_URL`), so whenever that storage driver is active, every attachment URL is cross-origin from the app's own domain — exactly the case `download` doesn't work for.
