import type { Job } from "pg-boss";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import type { WorkspaceDeletePayload } from "@/lib/jobs/job-names";

export async function handleWorkspaceDelete(jobs: Job<WorkspaceDeletePayload>[]) {
  for (const job of jobs) {
    await processDelete(job.data);
  }
}

async function processDelete({ workspaceId }: WorkspaceDeletePayload) {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws) return; // already gone

  // Hard delete — cascade in DB handles pages, members, uploads, notifications
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
}
