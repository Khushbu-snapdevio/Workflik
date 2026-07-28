# Solution: database view tab lost on back navigation

**Fixed:** 2026-07-28

## Change

`components/templates/template-page-client.tsx` now mirrors the active view tab into the URL's `?view=` query param, following the same `router.replace(..., { scroll: false })` pattern already used in `components/pages/page-comment-button.tsx`:

- `switchView(viewId)` now also does `router.replace` with `view` set to the new view's id, so the browser history entry for the database page always reflects whichever tab is currently active.
- The initial `activeViewId` state now prefers a `view` query param that matches one of the database's views over the server-provided `defaultViewId`, falling back to `defaultViewId` (then the first view) exactly as before when there's no `view` param.

## Why this fixes the root cause

Clicking a card opens the entry via `router.push`, which pushes a new history entry on top of the (now URL-synced) database page URL. Browser back returns to that exact URL, `?view=<galleryViewId>` included, so when `TemplatePageClient` re-mounts it picks the "Gallery" view back up instead of silently falling through to `page.defaultViewId`. This also makes a specific view tab bookmarkable/shareable as a side effect, with no change to `page.defaultViewId`'s own meaning (still just the view shown on a fresh/first visit with no `?view=` param).

The embedded database view (`components/database/database-page.tsx`) has the same underlying pattern but wasn't touched — the reported flow is the full-page database (`TemplatePageClient`), and this fix was scoped to that.
