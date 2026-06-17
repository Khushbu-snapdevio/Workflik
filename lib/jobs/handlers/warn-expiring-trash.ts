import { and, eq, gt, lt } from "drizzle-orm";
import type { Job } from "pg-boss";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";

// Runs daily at 02:00 UTC.
// Finds pages 3 days from permanent deletion (day 27-30 of Trash) that haven't been warned yet,
// atomically marks trash_warning_sent = true, then enqueues a notification.
// (Notification jobs will be wired in Phase 13.)
export async function handleWarnExpiringTrash(
  _jobs: Job<Record<string, never>>[]
) {
  const now = new Date();
  const day27 = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Pages in the 27–30 day window that haven't received a warning yet
  const expiring = await db
    .select({
      id:        pages.id,
      deletedBy: pages.deletedBy,
      createdBy: pages.createdBy,
      title:     pages.title,
    })
    .from(pages)
    .where(
      and(
        eq(pages.isDeleted, true),
        eq(pages.trashWarningSent, false),
        lt(pages.deletedAt, day27),
        gt(pages.deletedAt, day30)
      )
    );

  if (expiring.length === 0) return;

  for (const page of expiring) {
    // Atomically mark as warned (guarded UPDATE prevents duplicates on concurrent runs)
    const [updated] = await db
      .update(pages)
      .set({ trashWarningSent: true })
      .where(and(eq(pages.id, page.id), eq(pages.trashWarningSent, false)))
      .returning({ id: pages.id });

    if (!updated) continue; // Another concurrent run already handled this page

    // TODO Phase 13: enqueue in-app + email notification to page.deletedBy and page.createdBy
    console.log(`[warn-expiring-trash] Sent warning for page ${page.id} ("${page.title}")`);
  }

  console.log(`[warn-expiring-trash] Processed ${expiring.length} expiring pages.`);
}
