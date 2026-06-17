import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { blocks, pageVersions, pages } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";

// GET /api/pages/:id/versions — list version history (last 30 within 7-day window)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    const [page] = await db
      .select({ id: pages.id, workspaceId: pages.workspaceId })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!page) return apiError(404, "Page not found");

    await requireWorkspaceMember(page.workspaceId, session.user.id);

    const versions = await db
      .select({
        id:          pageVersions.id,
        label:       pageVersions.label,
        createdBy:   pageVersions.createdBy,
        createdAt:   pageVersions.createdAt,
        schemaVersion: pageVersions.schemaVersion,
      })
      .from(pageVersions)
      .where(eq(pageVersions.pageId, id))
      .orderBy(desc(pageVersions.createdAt))
      .limit(30);

    return Response.json(versions);
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}

// POST /api/pages/:id/versions/:versionId/restore is handled separately.
// This endpoint also handles creating a snapshot (auto-save from editor, Phase 6).
const snapshotSchema = z.object({
  contentSnapshot: z.record(z.string(), z.unknown()),
  label:           z.string().max(200).nullable().optional(),
});

// POST /api/pages/:id/versions — create a version snapshot
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    const [page] = await db
      .select({ id: pages.id, workspaceId: pages.workspaceId, isDeleted: pages.isDeleted })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!page) return apiError(404, "Page not found");
    if (page.isDeleted) return apiError(404, "Page is in Trash");

    await requireWorkspaceMember(page.workspaceId, session.user.id, "editor");

    const body = await req.json();
    const parsed = snapshotSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    // If no snapshot provided, capture current blocks
    let snapshot = parsed.data.contentSnapshot;
    if (!snapshot || Object.keys(snapshot).length === 0) {
      const allBlocks = await db
        .select()
        .from(blocks)
        .where(eq(blocks.pageId, id));
      snapshot = { blocks: allBlocks };
    }

    const [version] = await db
      .insert(pageVersions)
      .values({
        pageId:          id,
        contentSnapshot: snapshot,
        schemaVersion:   1,
        label:           parsed.data.label ?? null,
        createdBy:       session.user.id,
      })
      .returning();

    return Response.json(version, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}
