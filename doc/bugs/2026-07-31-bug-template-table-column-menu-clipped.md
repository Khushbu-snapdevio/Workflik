# Bug: column "⋯" menu (Rename / Edit property / Delete property) gets clipped in template table views

**Reported:** 2026-07-31

## Symptom

On a database page built from a template (e.g. a "Brainstorm Session" page), clicking the "⋯" menu on a column header — showing Rename / Edit property / Delete property — rendered with its options cut off instead of fully visible.

## Root cause

`components/templates/views/template-table-view.tsx`'s `ColumnHeader` component rendered this dropdown as a plain in-flow `<div className="absolute right-0 top-full ...">`, nested inside the table's horizontally-scrolling body. An `absolute`-positioned element clipped by any ancestor with `overflow` set (the scrollable table body here) gets cut off wherever that ancestor's box ends — which is exactly what the screenshot showed.

`components/database/table-view.tsx` has the equivalent column-header menu (`PropHeaderMenu`) for the *regular* (non-template) database view, and it already avoids this by rendering via `createPortal` to `<body>` with `position: fixed`, positioned from a snapshotted anchor rect and clamped to the viewport via `lib/ui/clamp-to-viewport.ts`. The template table view's version was never brought in line with that pattern.
