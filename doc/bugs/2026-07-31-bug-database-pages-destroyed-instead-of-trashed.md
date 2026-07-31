# Bug — Deleting a database (or any template that creates one) destroys it instead of moving it to Trash

## What's broken

Creating a page from a template — e.g. "Brainstorm Session" — and then deleting
it removes it permanently. It never appears in Trash, and there is no way to
restore it. Its database entries go with it.

The confirmation dialog did say "Delete forever", but the action sat in the same
"···" menu position as "Move to Trash" for a normal page, and nothing else in
the product deletes without a Trash step. Most templates produce a database
page, so this applied to most template-created content.

This is unrecoverable data loss: there is no soft-deleted row left behind to
restore from.

## Reproduce

1. Create a page from any template that produces a database (Brainstorm
   Session, Pipeline Tracking, etc.).
2. Delete it via the "···" menu.
3. Open Trash.

**Expected:** the page is listed in Trash and can be restored for 30 days.
**Actual:** Trash is empty. The page and all its entries are gone from the
database entirely.

## Root cause

`lib/pages/delete-page.ts` — the shared helper behind both the single
`DELETE /api/pages/:id` and the bulk-delete endpoint — exempted databases from
soft deletion:

```ts
if (page.kind === "database" || page.isDeleted) {
  await db.delete(pages).where(eq(pages.id, pageId));   // permanent
  return { deleted: "permanent" };
}
```

The `page.isDeleted` half is correct: that's "delete forever" from the Trash
screen. The `page.kind === "database"` half meant the **first** delete of a
database was already permanent. `ON DELETE CASCADE` on `pages.databaseId` then
removed every entry, and the closure/blocks rows cascaded too.

Verified directly against the database after a report: `pages in trash: 0`, and
the deleted page's row no longer existed at all.

## Related symptom

This also explains an earlier report of "deleted 110 templates, restore only
brought back 20". The database-kind pages among them were destroyed outright at
delete time and were never restorable — only the plain pages had reached Trash.
