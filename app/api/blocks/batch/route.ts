import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { blocks, pages, pageVersions } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";
import type { Block } from "@/lib/db/schema";

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

    const [page] = await db.select({ id: pages.id, workspaceId: pages.workspaceId, isDeleted: pages.isDeleted, title: pages.title })
      .from(pages).where(eq(pages.id, pageId)).limit(1);
    if (!page) return apiError(404, "Page not found");
    if (page.isDeleted) return apiError(400, "Page is in Trash");
    await requireWorkspaceMember(page.workspaceId, session.user.id);

    const savedBlocks: Pick<Block, "id" | "pageId" | "parentBlockId" | "type" | "content" | "orderIndex" | "schemaVersion">[] = [];

    await db.transaction(async (tx) => {
      // Delete removed blocks
      if (deletedIds.length > 0) {
        await tx.delete(blocks).where(
          and(eq(blocks.pageId, pageId), inArray(blocks.id, deletedIds))
        );
      }

      // Upsert each block
      for (const b of incoming) {
        if (b.id) {
          // Update existing
          await tx.update(blocks)
            .set({
              parentBlockId: b.parentBlockId,
              type:          b.type as "paragraph",
              content:       b.content as Record<string, unknown>,
              orderIndex:    b.orderIndex,
              schemaVersion: b.schemaVersion,
            })
            .where(and(eq(blocks.id, b.id), eq(blocks.pageId, pageId)));
          savedBlocks.push({ id: b.id, pageId, parentBlockId: b.parentBlockId, type: b.type as "paragraph", content: b.content as Record<string, unknown>, orderIndex: b.orderIndex, schemaVersion: b.schemaVersion });
        } else {
          // Insert new — capture the server-assigned UUID
          const [inserted] = await tx.insert(blocks).values({
            pageId:        b.pageId,
            parentBlockId: b.parentBlockId,
            type:          b.type as "paragraph",
            content:       b.content as Record<string, unknown>,
            orderIndex:    b.orderIndex,
            schemaVersion: b.schemaVersion,
            createdBy:     session.user.id,
          }).returning({ id: blocks.id });
          savedBlocks.push({ id: inserted.id, pageId, parentBlockId: b.parentBlockId, type: b.type as "paragraph", content: b.content as Record<string, unknown>, orderIndex: b.orderIndex, schemaVersion: b.schemaVersion });
        }
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

    return Response.json({ ok: true, blocks: savedBlocks });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}
