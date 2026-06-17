import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, pages } from "@/lib/db/schema";
import { insertPageWithClosure } from "@/lib/pages/closure";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function duplicateTree(
  tx: Tx,
  sourceId: string,
  newParentId: string | null,
  workspaceId: string,
  userId: string,
  orderIndex: number
): Promise<string> {
  const [source] = await tx.select().from(pages).where(eq(pages.id, sourceId)).limit(1);
  if (!source) throw new Error(`Source page ${sourceId} not found`);

  const [newPage] = await tx
    .insert(pages)
    .values({
      shortId:       createId().slice(0, 10),
      workspaceId,
      parentId:      newParentId,
      kind:          source.kind,
      title:         source.title === "Untitled" ? "Untitled" : `${source.title} (copy)`,
      icon:          source.icon,
      coverUrl:      source.coverUrl,
      coverPosition: source.coverPosition,
      isFullWidth:   source.isFullWidth,
      fontFamily:    source.fontFamily,
      isSmallText:   source.isSmallText,
      isPrivate:     source.isPrivate,
      orderIndex,
      createdBy:     userId,
      lastEditedBy:  userId,
    })
    .returning();

  await insertPageWithClosure(tx, newPage.id, newParentId);

  // Duplicate blocks — root blocks first, then nested (to satisfy FK references)
  const allBlocks = await tx
    .select()
    .from(blocks)
    .where(eq(blocks.pageId, sourceId));

  const rootBlocks = allBlocks.filter((b) => b.parentBlockId === null);
  const childBlocks = allBlocks.filter((b) => b.parentBlockId !== null);
  const blockIdMap = new Map<string, string>();

  for (const block of [...rootBlocks, ...childBlocks]) {
    const newParentBlockId = block.parentBlockId
      ? (blockIdMap.get(block.parentBlockId) ?? null)
      : null;
    const [nb] = await tx
      .insert(blocks)
      .values({
        pageId:        newPage.id,
        parentBlockId: newParentBlockId,
        type:          block.type,
        content:       block.content,
        schemaVersion: block.schemaVersion,
        orderIndex:    block.orderIndex,
        createdBy:     userId,
      })
      .returning();
    blockIdMap.set(block.id, nb.id);
  }

  // Recursively duplicate subpages
  const children = await tx
    .select({ id: pages.id, orderIndex: pages.orderIndex })
    .from(pages)
    .where(and(eq(pages.parentId, sourceId), eq(pages.isDeleted, false)));

  for (const child of children) {
    await duplicateTree(tx, child.id, newPage.id, workspaceId, userId, child.orderIndex);
  }

  return newPage.id;
}

// POST /api/pages/:id/duplicate
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    const [page] = await db
      .select({
        id: pages.id, workspaceId: pages.workspaceId, parentId: pages.parentId,
        orderIndex: pages.orderIndex, isDeleted: pages.isDeleted,
      })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!page) return apiError(404, "Page not found");
    if (page.isDeleted) return apiError(404, "Page is in Trash");

    await requireWorkspaceMember(page.workspaceId, session.user.id, "editor");

    const newPage = await db.transaction(async (tx) => {
      const newId = await duplicateTree(
        tx, page.id, page.parentId, page.workspaceId,
        session.user.id, page.orderIndex + 1
      );
      const [p] = await tx.select().from(pages).where(eq(pages.id, newId)).limit(1);
      return p;
    });

    return Response.json(newPage, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}
