import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pages, userFavorites } from "@/lib/db/schema";
import { ApiError, apiError, getSession } from "@/lib/workspaces/auth";

// GET /api/user/favorites?workspaceId=xxx
export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return apiError(400, "workspaceId is required");
    }

    // Join the page so each favorite carries its title/icon/shortId. Favorited
    // pages that aren't in the sidebar's page tree — database entries
    // (kind = "entry"), etc. — otherwise have no metadata on the client and
    // render as "Untitled" with a broken link. LEFT JOIN so a favorite whose
    // page was hard-deleted still returns its row (with null metadata).
    const rows = await db
      .select({
        id:         userFavorites.id,
        pageId:     userFavorites.pageId,
        orderIndex: userFavorites.orderIndex,
        title:      pages.title,
        icon:       pages.icon,
        shortId:    pages.shortId,
      })
      .from(userFavorites)
      .leftJoin(pages, eq(userFavorites.pageId, pages.id))
      .where(
        and(
          eq(userFavorites.userId, session.user.id),
          eq(userFavorites.workspaceId, workspaceId)
        )
      )
      .orderBy(asc(userFavorites.orderIndex));

    return Response.json(rows);
  } catch (err) {
    if (err instanceof ApiError) {
      return apiError(err.status, err.message);
    }
    return apiError(500, "Internal server error");
  }
}

const postSchema = z.object({
  pageId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

// POST /api/user/favorites
export async function POST(req: Request) {
  try {
    const session = await getSession();

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { pageId, workspaceId } = parsed.data;

    // Get current max orderIndex for this user+workspace
    const existing = await db
      .select({ orderIndex: userFavorites.orderIndex })
      .from(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, session.user.id),
          eq(userFavorites.workspaceId, workspaceId)
        )
      )
      .orderBy(asc(userFavorites.orderIndex));

    const nextIndex =
      existing.length > 0
        ? (existing[existing.length - 1]?.orderIndex ?? 0) + 1
        : 0;

    const [row] = await db
      .insert(userFavorites)
      .values({
        userId: session.user.id,
        pageId,
        workspaceId,
        orderIndex: nextIndex,
      })
      .onConflictDoNothing()
      .returning();

    return Response.json(row ?? { pageId, workspaceId }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return apiError(err.status, err.message);
    }
    return apiError(500, "Internal server error");
  }
}
