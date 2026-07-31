# Solution — Deleting a database destroys it instead of moving it to Trash

## What changed

### 1. `lib/pages/delete-page.ts` — databases soft-delete like everything else

```diff
-if (page.kind === "database" || page.isDeleted) {
+// Only an already-trashed page is destroyed for real — that's the explicit
+// "delete forever" action from the Trash screen.
+if (page.isDeleted) {
   await db.delete(pages).where(eq(pages.id, pageId));
   return { deleted: "permanent" };
 }
```

Both delete paths (`DELETE /api/pages/:id` and the workspace bulk-delete
endpoint) already route through this helper, so the single change covers both.

The rule is now uniform: **not in Trash → soft delete; already in Trash → hard
delete.** Kind is no longer part of the decision.

### 2. `components/pages/page-actions-menu.tsx` — corrected the copy

The menu item said "Delete database" and the dialog said "Delete database
forever? … permanently deleted. This action cannot be undone." That described
the old behaviour and would now be wrong. Both read "Move to Trash", with the
database variant noting that entries come along.

## Why entries are safe

Soft delete cascades through `page_closure`, not `databaseId`. Entries are
created with `parentId: databaseId` via `createPageWithClosure`, and
`insertPageWithClosure` writes a self row plus inherits every ancestor row — so
a database's entries are genuine closure descendants and are picked up by the
existing cascade with no extra query.

This was verified rather than assumed (below), because if entries had *not* been
in the closure, removing the hard-delete would have left them behind as
undeleted orphans pointing at a trashed database.

## Verification

An end-to-end check against the real database:

1. Built a template-shaped tree — one `kind: "database"` page + 3
   `kind: "entry"` children, wired through the same closure helpers the app
   uses.
2. Confirmed the closure query returns **4** descendants (self + 3 entries) —
   i.e. the cascade reaches entries.
3. Applied the new soft-delete: **4/4** rows marked `is_deleted`, and **4/4**
   rows still present (not destroyed).
4. Restored: **4/4** back to `is_deleted = false`.
5. Cleaned up the test rows; confirmed 0 left behind.

## Note on already-lost data

Databases deleted before this fix were hard-deleted and are unrecoverable —
there is no soft-deleted row to restore. The fix prevents further loss but
cannot bring back content already destroyed.
