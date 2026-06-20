/**
 * DEV-ONLY endpoint — seeds fake notifications for the current user.
 * Hit POST /api/notifications/test?workspaceId=<id> to insert one of each type.
 * DELETE /api/notifications/test?workspaceId=<id> wipes them all.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, pages, users } from "@/lib/db/schema";
import { apiError, getSession } from "@/lib/workspaces/auth";

if (process.env.NODE_ENV === "production") {
  throw new Error("Test notification endpoint must not be deployed to production.");
}

const SAMPLE_TYPES = [
  { type: "mention"          as const, snippet: "Hey @you, can you review this section before Friday?" },
  { type: "comment"          as const, snippet: "Left a comment on the intro paragraph." },
  { type: "reply"            as const, snippet: "Agreed! Let's go with that approach." },
  { type: "resolved"         as const, snippet: null },
  { type: "access_granted"   as const, snippet: null },
  { type: "workspace_invite" as const, snippet: null },
  { type: "trash_warning"    as const, snippet: "Meeting Notes · Engineering" },
] as const;

export async function POST(req: Request) {
  try {
    const session     = await getSession();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return apiError(400, "workspaceId required");

    // Pick a random page from this workspace to attach notifications to
    const [page] = await db
      .select({ id: pages.id, title: pages.title })
      .from(pages)
      .where(eq(pages.workspaceId, workspaceId))
      .limit(1);

    // Pick any other user in DB as fake sender
    const [sender] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, session.user.id)) // fallback: self as sender (fine for UI testing)
      .limit(1);

    const rows = SAMPLE_TYPES.map(({ type, snippet }) => ({
      workspaceId,
      recipientId:    session.user.id,
      senderId:       sender?.id ?? null,
      type,
      pageId:         page?.id ?? null,
      sourceId:       null,
      contentSnippet: snippet,
      isRead:         false,
    }));

    await db.insert(notifications).values(rows);

    return Response.json({ ok: true, inserted: rows.length });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/notifications/test]", e);
    return apiError(500, "Internal error");
  }
}

export async function DELETE(req: Request) {
  try {
    const session     = await getSession();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return apiError(400, "workspaceId required");

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.recipientId, session.user.id),
          eq(notifications.workspaceId, workspaceId),
        )
      );

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return apiError(500, "Internal error");
  }
}
