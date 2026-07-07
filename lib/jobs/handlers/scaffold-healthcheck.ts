import type { Job } from "pg-boss";
import { and, eq, isNull } from "drizzle-orm";
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

// Exported so it can also be called synchronously right after the very
// first admin is created (lib/auth/index.ts), instead of a fresh self-hosted
// instance waiting on this job's ~10-minute cron tick for its first template.
export async function autoSeedTemplates() {
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
    console.log(`[scaffold] auto-seeded ${rows.length} built-in templates`);
  } catch (err) {
    console.error("[scaffold] template auto-seed failed:", err);
  }
}
