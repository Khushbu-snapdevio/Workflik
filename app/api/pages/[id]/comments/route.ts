import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { comments, pages, users } from "@/lib/db/schema";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";
import {
  triggerCommentNotifications,
  triggerMentionNotifications,
} from "@/lib/notifications/triggers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/pages/:id/comments — list all threads + replies
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id: pageId } = await params;
    const session = await getSession();

    const [page] = await db
      .select({ workspaceId: pages.workspaceId })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!page) return apiError(404, "Page not found");

    await requireWorkspaceMember(page.workspaceId, session.user.id);

    // Load all roots (including soft-deleted) + their authors
    const roots = await db
      .select({
        id:           comments.id,
        blockId:      comments.blockId,
        parentId:     comments.parentId,
        threadNumber: comments.threadNumber,
        anchorStart:  comments.anchorStart,
        anchorEnd:    comments.anchorEnd,
        isResolved:   comments.isResolved,
        isOrphaned:   comments.isOrphaned,
        content:      comments.content,
        createdAt:    comments.createdAt,
        editedAt:     comments.editedAt,
        deletedAt:    comments.deletedAt,
        authorId:     comments.authorId,
        authorName:   users.name,
        authorImage:  users.image,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(and(eq(comments.pageId, pageId), isNull(comments.parentId)))
      .orderBy(asc(comments.threadNumber));

    // Load all replies
    const replies = await db
      .select({
        id:          comments.id,
        blockId:     comments.blockId,
        parentId:    comments.parentId,
        isResolved:  comments.isResolved,
        isOrphaned:  comments.isOrphaned,
        content:     comments.content,
        createdAt:   comments.createdAt,
        editedAt:    comments.editedAt,
        deletedAt:   comments.deletedAt,
        authorId:    comments.authorId,
        authorName:  users.name,
        authorImage: users.image,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(and(eq(comments.pageId, pageId), isNull(isNull(comments.parentId))))
      // filter: parent_id IS NOT NULL
      .orderBy(asc(comments.createdAt));

    // Re-query replies properly
    const allComments = await db
      .select({
        id:           comments.id,
        blockId:      comments.blockId,
        parentId:     comments.parentId,
        threadNumber: comments.threadNumber,
        anchorStart:  comments.anchorStart,
        anchorEnd:    comments.anchorEnd,
        isResolved:   comments.isResolved,
        isOrphaned:   comments.isOrphaned,
        content:      comments.content,
        reactions:    comments.reactions,
        createdAt:    comments.createdAt,
        editedAt:     comments.editedAt,
        deletedAt:    comments.deletedAt,
        authorId:     comments.authorId,
        authorName:   users.name,
        authorImage:  users.image,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(eq(comments.pageId, pageId))
      .orderBy(asc(comments.threadNumber), asc(comments.createdAt));

    // Group into roots + replies
    const rootMap = new Map<string, typeof allComments[0] & { replies: typeof allComments }>();
    const replyList: typeof allComments = [];

    for (const c of allComments) {
      if (!c.parentId) {
        rootMap.set(c.id, { ...c, replies: [] });
      } else {
        replyList.push(c);
      }
    }

    for (const reply of replyList) {
      const parent = rootMap.get(reply.parentId!);
      if (parent) parent.replies.push(reply);
    }

    const shaped = Array.from(rootMap.values()).map((r) => ({
      id:           r.id,
      blockId:      r.blockId,
      parentId:     r.parentId,
      threadNumber: r.threadNumber,
      anchorStart:  r.anchorStart,
      anchorEnd:    r.anchorEnd,
      isResolved:   r.isResolved,
      isOrphaned:   r.isOrphaned,
      content:      r.deletedAt ? null : r.content,
      reactions:    (r.reactions as Record<string, string[]>) ?? {},
      createdAt:    r.createdAt,
      editedAt:     r.editedAt,
      deletedAt:    r.deletedAt,
      author:       r.authorId
        ? { id: r.authorId, name: r.authorName, image: r.authorImage }
        : null,
      replies:      r.replies.map((rep) => ({
        id:         rep.id,
        blockId:    rep.blockId,
        parentId:   rep.parentId,
        isResolved: rep.isResolved,
        isOrphaned: rep.isOrphaned,
        content:    rep.deletedAt ? null : rep.content,
        createdAt:  rep.createdAt,
        editedAt:   rep.editedAt,
        deletedAt:  rep.deletedAt,
        author:     rep.authorId
          ? { id: rep.authorId, name: rep.authorName, image: rep.authorImage }
          : null,
      })),
    }));

    const unresolvedCount = shaped.filter((r) => !r.isResolved && !r.deletedAt).length;

    return Response.json({ comments: shaped, totalCount: shaped.length, unresolvedCount });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error("[GET /api/pages/:id/comments]", err);
    return apiError(500, "Internal server error");
  }
}

const createCommentSchema = z.object({
  blockId:     z.string().uuid().nullable().default(null),
  parentId:    z.string().uuid().nullable().default(null),
  anchorStart: z.number().int().min(0).nullable().default(null),
  anchorEnd:   z.number().int().min(0).nullable().default(null),
  content:     z.record(z.string(), z.unknown()),
});

// POST /api/pages/:id/comments — create comment or reply
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id: pageId } = await params;
    const session = await getSession();

    const [page] = await db
      .select({ workspaceId: pages.workspaceId })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!page) return apiError(404, "Page not found");

    await requireWorkspaceMember(page.workspaceId, session.user.id);

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");

    const { blockId, parentId, anchorStart, anchorEnd, content } = parsed.data;

    // Validate reply depth — parent must be a root
    if (parentId) {
      const [parent] = await db
        .select({ id: comments.id, parentId: comments.parentId })
        .from(comments)
        .where(eq(comments.id, parentId))
        .limit(1);

      if (!parent) return apiError(404, "Parent comment not found");
      if (parent.parentId !== null) return apiError(400, "Cannot reply to a reply");
    }

    const newComment = await db.transaction(async (tx) => {
      // Assign thread_number only for roots
      let threadNumber: number | null = null;
      if (!parentId) {
        const rows = await tx
          .select({ threadNumber: comments.threadNumber })
          .from(comments)
          .where(and(eq(comments.pageId, pageId), isNull(comments.parentId)))
          .orderBy(desc(comments.threadNumber))
          .limit(1);

        const maxNum = rows[0]?.threadNumber ?? 0;
        threadNumber = maxNum + 1;
      }

      const [inserted] = await tx
        .insert(comments)
        .values({
          pageId,
          blockId:      blockId ?? null,
          parentId:     parentId ?? null,
          anchorStart:  anchorStart ?? null,
          anchorEnd:    anchorEnd ?? null,
          threadNumber,
          content,
          authorId:     session.user.id,
        })
        .returning();

      // Notification triggers (no-ops in Phase 11; Phase 13 fills them)
      await triggerCommentNotifications(tx, {
        commentId:   inserted.id,
        pageId,
        workspaceId: page.workspaceId,
        authorId:    session.user.id,
        parentId,
        content,
      });

      await triggerMentionNotifications(tx, {
        commentId:   inserted.id,
        pageId,
        workspaceId: page.workspaceId,
        authorId:    session.user.id,
        content,
      });

      return inserted;
    });

    return Response.json(newComment, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error("[POST /api/pages/:id/comments]", err);
    return apiError(500, "Internal server error");
  }
}
