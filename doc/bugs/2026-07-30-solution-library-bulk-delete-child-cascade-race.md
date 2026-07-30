# Solution: Bulk-deleting pages in the Library shows "Failed to delete N pages" and can permanently delete nested pages instead of moving them to Trash

## What changed

- [app/app/[workspace]/library/library-client.tsx](app/app/[workspace]/library/library-client.tsx) — `handleDeleteSelected()`:
  - Before issuing any requests, each selected id is folded up to the topmost *also-selected* ancestor in its chain (using the `parentId` already present on each row). Only that topmost id is actually requested; a selected id whose ancestor is also selected no longer gets its own `DELETE` call, since the ancestor's request already cascades to it server-side.
  - Rows are removed from the table for every originally-selected id whose effective (topmost) request succeeded, not just for ids that were directly requested.
  - The failure message now reflects the number of requests actually made (post-dedup) instead of the raw selection count, and for a single failure it reads the API's actual `{ error }` body instead of showing a bare count.

## Why this fixes the root cause

Removing the redundant per-child request eliminates the race against the server-side cascade entirely: a child that's selected alongside its parent is never given its own independent `DELETE` call, so it can no longer be caught mid-cascade and hard-deleted instead of soft-deleted. This also removes the inflated/confusing failure count, since the number of requests sent now matches the number of distinct top-level deletions actually being performed, and any remaining failure surfaces the real reason from the API rather than a count with no clear reference point.

## Verification

- `npx tsc --noEmit -p .` — no type errors, including in the edited file.
- Manual trace of `topmostSelectedAncestor()` against the nested tree shape `buildDisplayRows()` produces (parent → child → grandchild), confirming only the single topmost selected ancestor in each chain is requested regardless of nesting depth.
- Not verified in a running browser session (no dev server / DB available in this environment) — recommend a manual pass: expand a page with children in the Library, select both the parent and a child (or use "select all"), delete, and confirm only one `DELETE` network request fires per top-level chain and the children end up in Trash (recoverable), not permanently gone.
