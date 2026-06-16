import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { movePageWithClosure } from "@/lib/pages/closure";
import {
  ApiError,
  apiError,
  getSession,
  requireWorkspaceMember,
} from "@/lib/workspaces/auth";

type Ctx = { params: Promise<{ id: string }> };

const moveSchema = z.object({
  parentId: z.string().uuid().nullable(),
  orderIndex: z.number().int().min(0),
});

// PATCH /api/pages/:id/move
// Moves a page to a new parent and position. Updates both pages.parent_id and page_closure.
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id: pageId } = await params;
    const session = await getSession();

    const body = await req.json();
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { parentId, orderIndex } = parsed.data;

    const [page] = await db
      .select({ id: pages.id, workspaceId: pages.workspaceId })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!page) {
      return apiError(404, "Page not found");
    }

    await requireWorkspaceMember(page.workspaceId, session.user.id, "editor");

    const updated = await db.transaction(async (tx) => {
      const [updatedPage] = await tx
        .update(pages)
        .set({ parentId, orderIndex, updatedAt: new Date() })
        .where(eq(pages.id, pageId))
        .returning();

      await movePageWithClosure(tx, pageId, parentId);

      return updatedPage;
    });

    return Response.json(updated);
  } catch (err) {
    if (err instanceof ApiError) {
      return apiError(err.status, err.message);
    }
    return apiError(500, "Internal server error");
  }
}
