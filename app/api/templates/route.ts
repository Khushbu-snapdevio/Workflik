import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { ApiError, apiError, getSession } from "@/lib/workspaces/auth";

// GET /api/templates — list all published built-in templates (authenticated)
export async function GET() {
  try {
    await getSession();

    const list = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.isBuiltIn, true),
          eq(templates.status, "published"),
          isNull(templates.workspaceId)
        )
      )
      .orderBy(templates.category, templates.name);

    return Response.json(list);
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}
