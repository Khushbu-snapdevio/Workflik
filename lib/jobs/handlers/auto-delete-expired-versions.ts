import { lt } from "drizzle-orm";
import type { Job } from "pg-boss";
import { db } from "@/lib/db";
import { pageVersions } from "@/lib/db/schema";

// Runs daily. Prunes page versions older than the 7-day retention window.
export async function handleAutoDeleteExpiredVersions(
  _jobs: Job<Record<string, never>>[]
) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(pageVersions)
    .where(lt(pageVersions.createdAt, cutoff))
    .returning({ id: pageVersions.id });

  console.log(`[auto-delete-expired-versions] Pruned ${result.length} old page versions.`);
}
