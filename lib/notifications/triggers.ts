import { and, eq, isNull, not } from "drizzle-orm";
import { comments, notifications, pages } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { JOB_NAMES } from "@/lib/jobs/job-names";
import { extractMentionedUserIds, extractPlainText } from "@/lib/comments/mentions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any;

function snippet(content: Record<string, unknown>, max = 100): string {
  const text = extractPlainText(content);
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Notification types that the "What you'll receive" settings can individually
// opt out of. Types not in this map (comment, reply, resolved, reopened,
// access_granted, guest_accepted, trash_warning) always email when realtime.
const CATEGORY_PREF_FIELD: Partial<Record<typeof notifications.$inferInsert["type"], string>> = {
  mention:          "notifyMentions",
  page_update:      "notifyPageUpdates",
  workspace_invite: "notifyWorkspaceInvites",
  task_assigned:    "notifyTaskAssignments",
};

async function getEmailPreference(
  tx: AnyTx,
  userId: string,
  type: typeof notifications.$inferInsert["type"]
): Promise<{ frequency: string; categoryEnabled: boolean }> {
  const { notificationPreferences } = await import("@/lib/db/schema");
  const [pref] = await tx
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  const field = CATEGORY_PREF_FIELD[type];
  const categoryEnabled = field ? (pref?.[field as keyof typeof pref] ?? true) : true;
  return { frequency: pref?.emailFrequency ?? "daily", categoryEnabled };
}

async function insertAndEnqueue(
  tx: AnyTx,
  row: {
    workspaceId:    string;
    recipientId:    string;
    senderId:       string | null;
    type:           typeof notifications.$inferInsert["type"];
    pageId:         string | null;
    sourceId:       string | null;
    contentSnippet: string | null;
  }
) {
  const [inserted] = await tx
    .insert(notifications)
    .values(row)
    .returning({ id: notifications.id });

  const { frequency, categoryEnabled } = await getEmailPreference(tx, row.recipientId, row.type);
  if (frequency === "realtime" && categoryEnabled) {
    await enqueueJob(JOB_NAMES.NOTIFICATION_EMAIL_SEND, {
      notificationId: inserted.id,
      recipientId:    row.recipientId,
    });
  }
}

async function getThreadParticipants(tx: AnyTx, rootCommentId: string, excludeUserId: string): Promise<string[]> {
  const replies = await tx
    .select({ authorId: comments.authorId })
    .from(comments)
    .where(
      and(
        eq(comments.parentId, rootCommentId),
        not(isNull(comments.authorId)),
      )
    );

  const [root] = await tx
    .select({ authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, rootCommentId))
    .limit(1);

  const allIds = new Set<string>();
  if (root?.authorId) allIds.add(root.authorId);
  for (const r of replies) if (r.authorId) allIds.add(r.authorId);
  allIds.delete(excludeUserId);
  return [...allIds];
}

export async function triggerCommentNotifications(
  tx: AnyTx,
  params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    authorId:    string;
    parentId:    string | null;
    content:     Record<string, unknown>;
  }
): Promise<void> {
  const { commentId, pageId, workspaceId, authorId, parentId, content } = params;
  const snip = snippet(content);

  if (parentId === null) {
    const [page] = await tx
      .select({ createdBy: pages.createdBy })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (page?.createdBy && page.createdBy !== authorId) {
      await insertAndEnqueue(tx, {
        workspaceId,
        recipientId:    page.createdBy,
        senderId:       authorId,
        type:           "comment",
        pageId,
        sourceId:       commentId,
        contentSnippet: snip,
      });
    }
  } else {
    const participants = await getThreadParticipants(tx, parentId, authorId);
    for (const recipientId of participants) {
      await insertAndEnqueue(tx, {
        workspaceId,
        recipientId,
        senderId:       authorId,
        type:           "reply",
        pageId,
        sourceId:       commentId,
        contentSnippet: snip,
      });
    }
  }
}

export async function triggerMentionNotifications(
  tx: AnyTx,
  params: {
    commentId:    string;
    pageId:       string;
    workspaceId:  string;
    authorId:     string;
    content:      Record<string, unknown>;
    skipUserIds?: string[];
  }
): Promise<void> {
  const { commentId, pageId, workspaceId, authorId, content, skipUserIds = [] } = params;

  const mentioned = extractMentionedUserIds(content);
  const toNotify  = mentioned.filter((id) => id !== authorId && !skipUserIds.includes(id));
  if (!toNotify.length) return;

  const snip = snippet(content);
  for (const recipientId of toNotify) {
    await insertAndEnqueue(tx, {
      workspaceId,
      recipientId,
      senderId:       authorId,
      type:           "mention",
      pageId,
      sourceId:       commentId,
      contentSnippet: snip,
    });
  }
}

export async function triggerResolvedNotification(
  tx: AnyTx,
  params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    resolverId:  string;
  }
): Promise<void> {
  const { commentId, pageId, workspaceId, resolverId } = params;
  const participants = await getThreadParticipants(tx, commentId, resolverId);
  for (const recipientId of participants) {
    await insertAndEnqueue(tx, {
      workspaceId,
      recipientId,
      senderId:       resolverId,
      type:           "resolved",
      pageId,
      sourceId:       commentId,
      contentSnippet: null,
    });
  }
}

export async function triggerReopenedNotification(
  tx: AnyTx,
  params: {
    commentId:   string;
    pageId:      string;
    workspaceId: string;
    reopenerId:  string;
  }
): Promise<void> {
  const { commentId, pageId, workspaceId, reopenerId } = params;
  const participants = await getThreadParticipants(tx, commentId, reopenerId);
  for (const recipientId of participants) {
    await insertAndEnqueue(tx, {
      workspaceId,
      recipientId,
      senderId:       reopenerId,
      type:           "reopened",
      pageId,
      sourceId:       commentId,
      contentSnippet: null,
    });
  }
}

export async function triggerAccessGrantedNotification(
  tx: AnyTx,
  params: {
    pageId:       string;
    workspaceId:  string;
    granterId:    string;
    recipientId:  string;
    permissionId: string;
  }
): Promise<void> {
  const { pageId, workspaceId, granterId, recipientId, permissionId } = params;
  if (granterId === recipientId) return;
  await insertAndEnqueue(tx, {
    workspaceId,
    recipientId,
    senderId:       granterId,
    type:           "access_granted",
    pageId,
    sourceId:       permissionId,
    contentSnippet: null,
  });
}

export async function triggerWorkspaceInviteNotification(
  tx: AnyTx,
  params: {
    workspaceId: string;
    inviterId:   string;
    recipientId: string;
    memberId:    string;
  }
): Promise<void> {
  const { workspaceId, inviterId, recipientId, memberId } = params;
  if (inviterId === recipientId) return;
  await insertAndEnqueue(tx, {
    workspaceId,
    recipientId,
    senderId:       inviterId,
    type:           "workspace_invite",
    pageId:         null,
    sourceId:       memberId,
    contentSnippet: null,
  });
}

export async function triggerWorkspaceInviteAcceptedNotification(
  tx: AnyTx,
  params: {
    workspaceId: string;
    inviterId:   string;
    accepterId:  string;
    memberId:    string;
    accepterName: string;
  }
): Promise<void> {
  const { workspaceId, inviterId, accepterId, memberId, accepterName } = params;
  if (inviterId === accepterId) return;
  await insertAndEnqueue(tx, {
    workspaceId,
    recipientId:    inviterId,
    senderId:       accepterId,
    type:           "workspace_invite_accepted",
    pageId:         null,
    sourceId:       memberId,
    contentSnippet: accepterName.slice(0, 100),
  });
}

export async function triggerGuestAcceptedNotification(
  tx: AnyTx,
  params: {
    workspaceId:  string;
    inviterId:    string;
    acceptorId:   string;
    pageId:       string;
    invitationId: string;
    acceptorName: string;
  }
): Promise<void> {
  const { workspaceId, inviterId, acceptorId, pageId, invitationId, acceptorName } = params;
  if (inviterId === acceptorId) return;
  await insertAndEnqueue(tx, {
    workspaceId,
    recipientId:    inviterId,
    senderId:       acceptorId,
    type:           "guest_accepted",
    pageId,
    sourceId:       invitationId,
    contentSnippet: acceptorName.slice(0, 100),
  });
}

export async function triggerPageUpdateNotification(
  tx: AnyTx,
  params: {
    workspaceId: string;
    pageId:      string;
    editorId:    string;
    createdBy:   string;
    pageTitle:   string;
  }
): Promise<void> {
  const { workspaceId, pageId, editorId, createdBy, pageTitle } = params;
  if (editorId === createdBy) return;
  await insertAndEnqueue(tx, {
    workspaceId,
    recipientId:    createdBy,
    senderId:       editorId,
    type:           "page_update",
    pageId,
    sourceId:       pageId,
    contentSnippet: pageTitle.slice(0, 100),
  });
}

export async function triggerTaskAssignedNotification(
  tx: AnyTx,
  params: {
    workspaceId: string;
    pageId:      string;
    assignerId:  string;
    assigneeId:  string;
    entryTitle:  string;
  }
): Promise<void> {
  const { workspaceId, pageId, assignerId, assigneeId, entryTitle } = params;
  if (assignerId === assigneeId) return;
  await insertAndEnqueue(tx, {
    workspaceId,
    recipientId:    assigneeId,
    senderId:       assignerId,
    type:           "task_assigned",
    pageId,
    sourceId:       pageId,
    contentSnippet: entryTitle.slice(0, 100),
  });
}

export async function triggerTrashWarningNotification(
  tx: AnyTx,
  params: {
    workspaceId: string;
    pageId:      string;
    deletedBy:   string;
    createdBy:   string;
    pageTitle:   string;
  }
): Promise<void> {
  const { workspaceId, pageId, deletedBy, createdBy, pageTitle } = params;
  const snip = pageTitle.slice(0, 100);

  const recipients = new Set<string>([deletedBy, createdBy]);
  for (const recipientId of recipients) {
    await insertAndEnqueue(tx, {
      workspaceId,
      recipientId,
      senderId:       deletedBy,
      type:           "trash_warning",
      pageId,
      sourceId:       pageId,
      contentSnippet: snip,
    });
  }
}
