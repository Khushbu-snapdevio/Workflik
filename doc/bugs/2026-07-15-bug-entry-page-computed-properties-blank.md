# Bug: Rollup/Formula/Created-by properties show blank when an entry is opened as its own full page

**Reported:** 2026-07-15

## Symptom

Opening a database entry as its own full page (e.g. clicking into a "Tasks Tracker" row like "Improve website copy") shows the entry's property list at the top (Status, Assignee, Due date, etc.). A "Created by" property added to that database showed as completely blank — not even an "Empty" placeholder, just nothing where the row's value should be. The same class of property (Rollup, Formula) would show the same way: blank instead of their computed result.

## Root cause

Two separate defects stacked on top of each other:

1. **`components/database/entry-properties-panel.tsx`** decides how to render each property's value column via two type buckets — `INLINE_TYPES` (text/number/url/email/phone) and `POPOVER_TYPES` (select/status/multi_select/date/person/relation). `created_by` (and `rollup`/`formula`) belong to neither bucket, so the value column's conditional rendering matched nothing at all for those types — no value, no "Empty" placeholder, just an empty cell.

2. **Even with a render case added**, the value would still show wrong. This component fetches its own property values from a *third*, previously-unfixed endpoint — `GET /api/entries/:id/property-values` — which queried `propertyValues` directly with no idea that Rollup/Formula/Created-by are computed, not stored. This is the same root cause already fixed once for `app/api/databases/[id]/entries/route.ts` and `app/app/[workspace]/[pageId]/page.tsx` (see `2026-07-15-bug-meeting-notes-created-by-missing.md`) — that earlier fix covered the table view's own data fetch and the page's initial server render, but missed this separate per-entry endpoint that only `EntryPropertiesPanel` calls when an entry is opened as its own page.

## Reproduction (pre-fix)

1. Add a "Created by" (or Rollup/Formula) property to any database.
2. Open one of its entries as a full page (not the side panel — the actual `/app/:workspace/:entryShortId` route).
3. The property's label shows in the list, but its value column is entirely blank — no chip, no "Empty" text, nothing.
