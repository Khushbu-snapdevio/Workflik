import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { blocks, comments, pages, pageVersions } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";
import type { Block } from "@/lib/db/schema";
import { triggerPageUpdateNotification } from "@/lib/notifications/triggers";
import { isMeaningfulTitle, isMeaningfulBlockContent } from "@/lib/pages/draft";
import { promoteDraftPage } from "@/lib/pages/promote-draft";

const blockUpsertSchema = z.object({
  id:            z.string().uuid().nullable(),   // null = new block
  pageId:        z.string().uuid(),
  parentBlockId: z.string().uuid().nullable(),
  type:          z.string(),
  content:       z.record(z.string(), z.unknown()),
  orderIndex:    z.number().int().min(0),
  schemaVersion: z.number().int().default(1),
});

const batchSchema = z.object({
  pageId:        z.string().uuid(),
  blocks:        z.array(blockUpsertSchema),
  deletedIds:    z.array(z.string().uuid()).default([]),
  snapshotEvery: z.boolean().default(false),  // true = also write a page_version snapshot
});

// POST /api/blocks/batch — auto-save: upsert changed blocks, delete removed blocks
// Returns saved blocks (with server-assigned IDs for new inserts) so client can update its ID map.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid batch payload");

    const { pageId, blocks: incoming, deletedIds, snapshotEvery } = parsed.data;

    const [page] = await db.select({ id: pages.id, workspaceId: pages.workspaceId, isDeleted: pages.isDeleted, title: pages.title, createdBy: pages.createdBy, lastEditedBy: pages.lastEditedBy, isDraft: pages.isDraft })
      .from(pages).where(eq(pages.id, pageId)).limit(1);
    if (!page) return apiError(404, "Page not found");
    if (page.isDeleted) return apiError(400, "Page is in Trash");
    await requireWorkspaceMember(page.workspaceId, session.user.id);

    const savedBlocks: Pick<Block, "id" | "pageId" | "parentBlockId" | "type" | "content" | "orderIndex" | "schemaVersion">[] = [];
    let promoted = false;

    await db.transaction(async (tx) => {
      // Delete removed blocks — mark their comments as orphaned FIRST,
      // before the cascade nulls out comment.blockId
      if (deletedIds.length > 0) {
        await tx
          .update(comments)
          .set({ isOrphaned: true })
          .where(inArray(comments.blockId as any, deletedIds));

        await tx.delete(blocks).where(
          and(eq(blocks.pageId, pageId), inArray(blocks.id, deletedIds))
        );
      }

      // Upsert each block by its (now always client-generated, permanent) id —
      // a real INSERT ... ON CONFLICT DO UPDATE rather than an update-only
      // path, since a fresh id the client just minted won't exist as a row
      // yet. The client assigns a stable UUID to every block the instant
      // it's created (before it's ever saved), so the same id is reused on
      // every subsequent save — this is what makes upserting by id safe.
      for (const b of incoming) {
        const id = b.id ?? crypto.randomUUID();
        const [saved] = await tx.insert(blocks).values({
          id,
          pageId:        b.pageId,
          parentBlockId: b.parentBlockId,
          type:          b.type as "paragraph",
          content:       b.content as Record<string, unknown>,
          orderIndex:    b.orderIndex,
          schemaVersion: b.schemaVersion,
          createdBy:     session.user.id,
        }).onConflictDoUpdate({
          target: blocks.id,
          set: {
            parentBlockId: b.parentBlockId,
            type:          b.type as "paragraph",
            content:       b.content as Record<string, unknown>,
            orderIndex:    b.orderIndex,
            schemaVersion: b.schemaVersion,
          },
        }).returning({ id: blocks.id });
        savedBlocks.push({ id: saved.id, pageId, parentBlockId: b.parentBlockId, type: b.type as "paragraph", content: b.content as Record<string, unknown>, orderIndex: b.orderIndex, schemaVersion: b.schemaVersion });
      }

      // Track last editor and notify page creator when someone else edits.
      // Only fires on the first save by a new editor (lastEditedBy throttle prevents spam).
      await tx.update(pages)
        .set({ lastEditedBy: session.user.id, updatedAt: new Date() })
        .where(eq(pages.id, pageId));

      // Draft promotion — the first real content this page ever gets flips
      // it out of draft state and fires the (single, shared) creation
      // notification. Title-only promotion is handled by the PATCH route;
      // this covers the content-only path (title left as "Untitled").
      if (page.isDraft) {
        const currentBlocks = await tx
          .select({ type: blocks.type, content: blocks.content })
          .from(blocks)
          .where(eq(blocks.pageId, pageId));

        if (isMeaningfulTitle(page.title) || isMeaningfulBlockContent(currentBlocks)) {
          const result = await promoteDraftPage(tx, pageId);
          promoted = result.promoted;
        }
      }

      // No "page update" notification about a page collaborators don't know
      // exists yet — it either just got promoted above, or is still a draft.
      if (!page.isDraft && page.createdBy && session.user.id !== page.createdBy && session.user.id !== page.lastEditedBy) {
        await triggerPageUpdateNotification(tx, {
          workspaceId: page.workspaceId,
          pageId,
          editorId:  session.user.id,
          createdBy: page.createdBy,
          pageTitle: page.title ?? "Untitled",
        });
      }

      // Write page_version snapshot (one per 10-min window per user — caller decides)
      if (snapshotEvery) {
        const snapshot = savedBlocks.map((b) => ({
          id:            b.id,
          parentBlockId: b.parentBlockId,
          type:          b.type,
          content:       b.content,
          orderIndex:    b.orderIndex,
          schemaVersion: b.schemaVersion,
        }));
        await tx.insert(pageVersions).values({
          pageId,
          contentSnapshot: { blocks: snapshot },
          schemaVersion:   1,
          createdBy:       session.user.id,
        });
      }
    });

    return Response.json({ ok: true, blocks: savedBlocks, promoted });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}
