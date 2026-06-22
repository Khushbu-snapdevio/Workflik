import type { Job } from "pg-boss";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";

export async function handleScaffoldHealthcheck(
  jobs: Job<Record<string, never>>[]
) {
  for (const job of jobs) {
    console.log(`[worker] scaffold healthcheck ok (${job.id})`);
  }

  await autoSeedTemplates();
}

async function autoSeedTemplates() {
  try {
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(templates)
      .where(and(eq(templates.isBuiltIn, true), isNull(templates.workspaceId)));

    if (Number(cnt) >= 16) return;

    const { BUILT_IN_TEMPLATES } = await import("@/app/api/orbit/templates/seed/route");

    const rows = BUILT_IN_TEMPLATES.map((t) => ({
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
    console.log(`[scaffold] auto-seeded ${rows.length} built-in templates`);
  } catch (err) {
    console.error("[scaffold] template auto-seed failed:", err);
  }
}
