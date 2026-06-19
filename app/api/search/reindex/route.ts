import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, searchIndex } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";

export const runtime = "nodejs";

// POST /api/search/reindex?workspaceId=xxx
// Backfills search_index for all non-deleted pages in the workspace.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") ?? "";

    if (!workspaceId) return apiError(400, "workspaceId is required");

    await requireWorkspaceMember(workspaceId, session.user.id);

    const allPages = await db
      .select({ id: pages.id, workspaceId: pages.workspaceId, title: pages.title, kind: pages.kind })
      .from(pages)
      .where(and(eq(pages.workspaceId, workspaceId), eq(pages.isDeleted, false)));

    let count = 0;
    for (const page of allPages) {
      const title = page.title ?? "Untitled";
      await db
        .insert(searchIndex)
        .values({
          workspaceId:  page.workspaceId,
          sourceType:   "page",
          sourceId:     page.id,
          pageId:       page.id,
          title,
          searchVector: sql`to_tsvector('english', ${title})`,
        })
        .onConflictDoUpdate({
          target: [searchIndex.sourceType, searchIndex.sourceId],
          set: {
            title,
            searchVector: sql`to_tsvector('english', ${title})`,
            updatedAt:    new Date(),
          },
        });
      count++;
    }

    return Response.json({ indexed: count });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error("[reindex]", err);
    return apiError(500, "Internal server error");
  }
}
