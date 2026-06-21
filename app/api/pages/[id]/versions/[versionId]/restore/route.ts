import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, pageVersions, pages } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";

// POST /api/pages/:id/versions/:versionId/restore
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const { id, versionId } = await params;
    const session = await getSession();

    const [page] = await db
      .select({ id: pages.id, workspaceId: pages.workspaceId, isDeleted: pages.isDeleted })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!page) return apiError(404, "Page not found");
    if (page.isDeleted) return apiError(404, "Page is in Trash");

    await requireWorkspaceMember(page.workspaceId, session.user.id, "editor");

    const [version] = await db
      .select()
      .from(pageVersions)
      .where(and(eq(pageVersions.id, versionId), eq(pageVersions.pageId, id)))
      .limit(1);

    if (!version) return apiError(404, "Version not found");

    const snapshot = version.contentSnapshot as { blocks?: Record<string, unknown>[] };

    // Save current state before overwriting so the user can undo the restore
    const currentBlocks = await db.select().from(blocks).where(eq(blocks.pageId, id));
    await db.insert(pageVersions).values({
      pageId:          id,
      contentSnapshot: { blocks: currentBlocks },
      schemaVersion:   1,
      label:           "Before restore",
      createdBy:       session.user.id,
    });

    // Delete all current blocks for this page
    await db.delete(blocks).where(eq(blocks.pageId, id));

    // Re-insert blocks from snapshot in topological order (parents before children)
    const snapshotBlocks = snapshot.blocks ?? [];
    if (snapshotBlocks.length > 0) {
      const sorted = topoSort(snapshotBlocks);
      const now = new Date();
      await db.insert(blocks).values(
        sorted.map((b) => ({
          id:            b.id as string,
          pageId:        id,
          parentBlockId: (b.parentBlockId as string | null) ?? null,
          type:          b.type as "paragraph" | "h1" | "h2" | "h3" | "bullet" | "numbered" | "toggle" | "quote" | "callout" | "divider" | "todo" | "image" | "video" | "audio" | "file" | "toc" | "table" | "columns" | "code" | "equation" | "linked_page" | "database" | "template_button",
          content:       (b.content as Record<string, unknown>) ?? {},
          schemaVersion: (b.schemaVersion as number) ?? 1,
          orderIndex:    (b.orderIndex as number) ?? 0,
          createdBy:     (b.createdBy as string | null) ?? null,
          createdAt:     b.createdAt ? new Date(b.createdAt as string) : now,
          updatedAt:     now,
        })),
      );
    }

    return Response.json({ restored: true });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}

function topoSort(rawBlocks: Record<string, unknown>[]): Record<string, unknown>[] {
  const byParent = new Map<string | null, Record<string, unknown>[]>();
  for (const b of rawBlocks) {
    const key = (b.parentBlockId as string | null) ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(b);
  }
  const result: Record<string, unknown>[] = [];
  const queue = [...(byParent.get(null) ?? [])].sort(
    (a, b) => ((a.orderIndex as number) ?? 0) - ((b.orderIndex as number) ?? 0),
  );
  while (queue.length > 0) {
    const block = queue.shift()!;
    result.push(block);
    const children = [...(byParent.get(block.id as string) ?? [])].sort(
      (a, b) => ((a.orderIndex as number) ?? 0) - ((b.orderIndex as number) ?? 0),
    );
    queue.unshift(...children);
  }
  return result;
}
