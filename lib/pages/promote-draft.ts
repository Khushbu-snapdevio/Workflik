import { and, eq } from "drizzle-orm";
import { pages } from "@/lib/db/schema";
import { triggerPageCreatedNotification } from "@/lib/notifications/triggers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any;

// Single source of truth for promoting a draft page to a normal, visible
// page — called from both the title-rename route and the block-autosave
// route so promotion logic never has to be kept in sync in two places.
//
// Race-safe: the conditional `WHERE isDraft = true` means only whichever
// caller's transaction commits first actually flips the row and fires the
// notification — a title edit and a content autosave landing at nearly the
// same moment on a fresh draft can only ever promote (and notify) once.
//
// No separate activity/audit table exists for pages in this codebase (see
// lib/orbit/audit.ts, which is platform-admin only) — the notifications
// table IS the activity record here. And no explicit broadcast call is
// needed either: this UPDATE bumps pages.updatedAt via the schema's
// `updatedAt().$onUpdate(() => new Date())`, which the existing SSE stream
// route (app/api/workspaces/[id]/pages/stream/route.ts) already polls on a
// ~4s interval — promotion becomes visible through the same mechanism every
// other page mutation already uses.
export async function promoteDraftPage(
  tx: AnyTx,
  pageId: string
): Promise<{ promoted: boolean; page?: typeof pages.$inferSelect }> {
  const [promoted] = await tx
    .update(pages)
    .set({ isDraft: false })
    .where(and(eq(pages.id, pageId), eq(pages.isDraft, true)))
    .returning();

  if (!promoted) return { promoted: false };

  if (promoted.createdBy) {
    await triggerPageCreatedNotification(tx, {
      workspaceId: promoted.workspaceId,
      pageId:      promoted.id,
      creatorId:   promoted.createdBy,
      pageTitle:   promoted.title,
      isPrivate:   promoted.isPrivate,
      kind:        promoted.kind,
      isDraft:     false,
    });
  }

  return { promoted: true, page: promoted };
}
