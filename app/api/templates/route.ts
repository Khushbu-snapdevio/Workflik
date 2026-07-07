import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { ApiError, apiError, getSession } from "@/lib/workspaces/auth";

// GET /api/templates — list all published built-in templates (authenticated)
export async function GET() {
  try {
    await getSession();

    // Lazy-seed built-in templates the first time any user opens the gallery
    await ensureBuiltInTemplates();

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

async function ensureBuiltInTemplates() {
  try {
    const existing = await db
      .select({ name: templates.name })
      .from(templates)
      .where(and(eq(templates.isBuiltIn, true), isNull(templates.workspaceId)));
    const existingNames = new Set(existing.map((t) => t.name));

    const { BUILT_IN_TEMPLATES } = await import("@/app/api/orbit/templates/seed/route");
    const missing = BUILT_IN_TEMPLATES.filter((t) => !existingNames.has(t.name));
    if (missing.length === 0) return;

    const rows = missing.map((t) => ({
      name:         t.name,
      description:  t.description,
      category:     t.category,
      isBuiltIn:    true,
      status:       "published" as const,
      workspaceId:  null,
      createdBy:    null,
      pageSnapshot: t.pageSnapshot,
    }));

    await db.insert(templates).values(rows);
  } catch {
    // Non-fatal: return whatever templates exist
  }
}
