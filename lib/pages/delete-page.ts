import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageClosure, pages, userFavorites } from "@/lib/db/schema";
import { triggerPageDeletedNotification } from "@/lib/notifications/triggers";
import { requirePagePermission } from "@/lib/permissions/resolver";
import { ApiError } from "@/lib/workspaces/auth";

export type DeletePageResult = { deleted: "permanent" | "soft" };

// Shared by app/api/pages/[id]/route.ts's single DELETE and the bulk-delete
// endpoint, so both go through the exact same cascade logic:
//   • Page NOT in trash (any kind) → soft delete (move to Trash, cascade to descendants)
//   • Page already in Trash        → hard delete (permanent, cascades via ON DELETE CASCADE)
//
// Databases used to be exempted here and hard-deleted on the FIRST delete,
// which meant a database — and every template that creates one — was destroyed
// outright: it never appeared in Trash and could never be restored. Its entries
// went with it via ON DELETE CASCADE on databaseId. They now soft-delete like
// anything else; entries are created with `parentId: databaseId` (see
// createPageWithClosure), so the closure query below already cascades to them.
//
// Throws ApiError(404) if the page doesn't exist, or whatever
// requirePagePermission throws if the caller lacks edit access.
export async function deletePageCascade(
  pageId: string,
  userId: string
): Promise<DeletePageResult> {
  const [page] = await db
    .select({
      id: pages.id,
      workspaceId: pages.workspaceId,
      isDeleted: pages.isDeleted,
      kind: pages.kind,
      createdBy: pages.createdBy,
      title: pages.title,
      isDraft: pages.isDraft,
    })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  if (!page) {
    throw new ApiError(404, "Page not found");
  }

  await requirePagePermission(userId, pageId, "can_edit");

  // Only an already-trashed page is destroyed for real — that's the explicit
  // "delete forever" action from the Trash screen.
  if (page.isDeleted) {
    await db.delete(pages).where(eq(pages.id, pageId));
    return { deleted: "permanent" };
  }

  const descendants = await db
    .select({ descendantId: pageClosure.descendantId })
    .from(pageClosure)
    .where(eq(pageClosure.ancestorId, pageId));

  const descendantIds = descendants.map((d) => d.descendantId);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(pages)
      .set({
        isDeleted: true,
        deletedAt: now,
        deletedBy: userId,
        updatedAt: now,
      })
      .where(inArray(pages.id, descendantIds));

    // Soft delete only flips isDeleted — the pages row itself isn't removed,
    // so the DB's ON DELETE CASCADE on userFavorites never fires here;
    // remove favorite rows for every affected user explicitly instead.
    // Deliberately permanent: if the page is later restored, it should NOT
    // reappear in anyone's Favorites — they can re-favorite it themselves.
    await tx
      .delete(userFavorites)
      .where(inArray(userFavorites.pageId, descendantIds));

    // Notify the page creator that their page was moved to Trash and will be
    // permanently deleted after 30 days. The deleter is never notified about
    // their own action, so trashing your own page notifies nobody. Skipped
    // for still-draft pages — a trash warning would leak the existence of a
    // page collaborators were never told about.
    if (page.createdBy && !page.isDraft) {
      await triggerPageDeletedNotification(tx, {
        workspaceId: page.workspaceId,
        pageId: page.id,
        deletedBy: userId,
        createdBy: page.createdBy,
        pageTitle: page.title ?? "Untitled",
      });
    }
  });

  return { deleted: "soft" };
}
