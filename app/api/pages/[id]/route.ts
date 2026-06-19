import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pageClosure, pages } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/pages/:id — fetch page by UUID or shortId
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSession();

    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!page) return apiError(404, "Page not found");

    await requireWorkspaceMember(page.workspaceId, session.user.id);

    return Response.json(page);
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}

const patchSchema = z.object({
  title:        z.string().min(1).max(500).optional(),
  icon:         z.string().nullable().optional(),
  coverUrl:     z.string().nullable().optional(),
  coverPosition: z.number().min(0).max(1).optional(),
  isFullWidth:  z.boolean().optional(),
  isSmallText:  z.boolean().optional(),
  fontFamily:   z.enum(["default", "serif", "mono"]).optional(),
  isPrivate:    z.boolean().optional(),
}).strict();

// PATCH /api/pages/:id — update page metadata
export async function PATCH(req: Request, { params }: Ctx) {
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const [updated] = await db
      .update(pages)
      .set({ ...parsed.data, lastEditedBy: session.user.id, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();

    return Response.json(updated);
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}

// DELETE /api/pages/:id
//   • Database page → always hard-delete (permanent); DB CASCADE removes entries/views/properties
//   • Regular page NOT in trash → soft delete (move to Trash, cascade to descendants)
//   • Regular page already in Trash → hard delete (permanent, cascades via ON DELETE CASCADE)
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSession();

    const [page] = await db
      .select({ id: pages.id, workspaceId: pages.workspaceId, isDeleted: pages.isDeleted, kind: pages.kind })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!page) return apiError(404, "Page not found");

    await requireWorkspaceMember(page.workspaceId, session.user.id, "editor");

    // Databases and already-trashed pages are permanently deleted immediately.
    // ON DELETE CASCADE on databaseId removes all entries; pageClosure/blocks cascade too.
    if (page.kind === "database" || page.isDeleted) {
      await db.delete(pages).where(eq(pages.id, id));
      return Response.json({ success: true, deleted: "permanent" });
    }

    // Soft delete — mark this page and all descendants as deleted
    const descendants = await db
      .select({ descendantId: pageClosure.descendantId })
      .from(pageClosure)
      .where(eq(pageClosure.ancestorId, id));

    const descendantIds = descendants.map((d) => d.descendantId);
    const now = new Date();

    await db
      .update(pages)
      .set({ isDeleted: true, deletedAt: now, deletedBy: session.user.id, updatedAt: now })
      .where(inArray(pages.id, descendantIds));

    return Response.json({ success: true, deleted: "soft" });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}
