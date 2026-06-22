import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, pages, users } from "@/lib/db/schema";
import { apiError, getSession } from "@/lib/workspaces/auth";

const FILTER_MAP: Record<string, string[]> = {
  mentions:  ["mention"],
  comments:  ["comment", "reply", "resolved", "reopened"],
  updates:   ["access_granted", "workspace_invite", "guest_accepted", "trash_warning", "page_update", "task_assigned"],
};

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const filter      = searchParams.get("filter") ?? "all";
    const cursor      = searchParams.get("cursor"); // ISO date string for keyset pagination

    if (!workspaceId) return apiError(400, "workspaceId required");

    // Build type filter
    const typeFilter = FILTER_MAP[filter];

    const conditions = [
      eq(notifications.recipientId, session.user.id),
      eq(notifications.workspaceId, workspaceId),
    ];
    if (cursor) {
      conditions.push(gte(notifications.createdAt, new Date(cursor)));
    }

    const rows = await db
      .select({
        id:             notifications.id,
        type:           notifications.type,
        isRead:         notifications.isRead,
        readAt:         notifications.readAt,
        createdAt:      notifications.createdAt,
        contentSnippet: notifications.contentSnippet,
        pageId:         notifications.pageId,
        sourceId:       notifications.sourceId,
        senderId:       notifications.senderId,
        senderName:     users.name,
        senderEmail:    users.email,
        senderImage:    users.image,
        pageTitle:      pages.title,
        pageIcon:       pages.icon,
        pageShortId:    pages.shortId,
      })
      .from(notifications)
      .leftJoin(users, eq(users.id, notifications.senderId))
      .leftJoin(pages, eq(pages.id, notifications.pageId))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    // Apply type filter in-memory after fetch (simpler than conditional SQL arrays)
    const filtered = typeFilter
      ? rows.filter((r) => typeFilter.includes(r.type))
      : rows;

    const unreadCount = await db.$count(
      notifications,
      and(
        eq(notifications.recipientId, session.user.id),
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.isRead, false),
      )
    );

    return Response.json({ notifications: filtered, unreadCount });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/notifications]", e);
    return apiError(500, "Internal error");
  }
}
