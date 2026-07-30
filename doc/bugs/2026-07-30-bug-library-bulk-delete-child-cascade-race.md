# Bug: Bulk-deleting pages in the Library shows "Failed to delete N pages" and can permanently delete nested pages instead of moving them to Trash

**Reported:** 2026-07-30 (user-reported with screenshot showing "Failed to delete 40 pages" on a workspace with 33 total pages)

## Symptom

Selecting multiple rows in the Library's "All Pages" tab (e.g. via the header "select all" checkbox, which checks every expanded row including nested children) and clicking "Delete selected" produces a "Failed to delete N pages" error, where N is larger than the number of pages actually visible/expected.

## Root cause

`handleDeleteSelected()` in [app/app/[workspace]/library/library-client.tsx](app/app/[workspace]/library/library-client.tsx) fired one independent `DELETE /api/pages/:id` request per selected row via `Promise.all`, with no awareness that some selected rows were descendants of other selected rows.

The `DELETE /api/pages/:id` handler in [app/api/pages/[id]/route.ts](app/api/pages/[id]/route.ts) already cascades: soft-deleting a page also marks every descendant (via `pageClosure`) as deleted in the same transaction. So whenever both a parent and one of its children were checked (trivial via "select all", since `buildDisplayRows()` expands all rows by default), two things happened concurrently and uncoordinated:

- The parent's request cascaded and soft-deleted the child as part of its own transaction.
- The child's own independent request raced it. If the child's row read `isDeleted: true` by the time its own handler ran (because the parent's cascade had already committed), the handler took the "already deleted → hard delete" branch (`route.ts:150-153`) and **permanently deleted** a page that should have gone to the recoverable 30-day Trash.

Separately, the client only checked `!r.ok` and counted failures — it never read the response body, so any real per-page error reason (permission, not-found, DB error under the race) was discarded and replaced with a bare count. Combined with the extra, unnecessary per-child requests described above, the reported failure count did not correspond to any number the user could reconcile against what was on screen.
