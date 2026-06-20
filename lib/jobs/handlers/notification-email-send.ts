import { and, eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { db } from "@/lib/db";
import { notifications, notificationPreferences, pages, users } from "@/lib/db/schema";
import { enqueueEmail } from "@/lib/email";
import { env } from "@/lib/env";
import type { NotificationEmailSendPayload } from "@/lib/jobs/job-names";

const TYPE_LABELS: Record<string, string> = {
  mention:          "mentioned you in a comment",
  comment:          "commented on your page",
  reply:            "replied to your comment",
  resolved:         "resolved a comment thread",
  reopened:         "reopened a comment thread",
  access_granted:   "granted you access to a page",
  workspace_invite: "added you to a workspace",
  guest_accepted:   "accepted your guest invitation",
  trash_warning:    "A page you own will be permanently deleted in 3 days",
};

export async function handleNotificationEmailSend(jobs: Job<NotificationEmailSendPayload>[]) {
  for (const job of jobs) {
    const { notificationId, recipientId } = job.data;

    const [notif] = await db
      .select({
        id:             notifications.id,
        type:           notifications.type,
        contentSnippet: notifications.contentSnippet,
        pageId:         notifications.pageId,
        senderId:       notifications.senderId,
        workspaceId:    notifications.workspaceId,
        senderName:     users.name,
        pageTitle:      pages.title,
      })
      .from(notifications)
      .leftJoin(users, eq(users.id, notifications.senderId))
      .leftJoin(pages, eq(pages.id, notifications.pageId))
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notif) continue;

    // Check preference is still realtime
    const [pref] = await db
      .select({ emailFrequency: notificationPreferences.emailFrequency })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, recipientId))
      .limit(1);

    if (pref && pref.emailFrequency !== "realtime") continue;

    const [recipient] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);

    if (!recipient) continue;

    const senderLabel = notif.senderName ?? "Someone";
    const action      = TYPE_LABELS[notif.type] ?? "sent you a notification";
    const pageLabel   = notif.pageTitle ? ` on "${notif.pageTitle}"` : "";
    const snippet     = notif.contentSnippet ? `\n\n"${notif.contentSnippet}"` : "";
    const appUrl      = env.NEXT_PUBLIC_APP_URL ?? "https://app.workflik.com";

    const subject = `${senderLabel} ${action}${pageLabel}`;
    const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;color:#111;max-width:560px;margin:40px auto;padding:0 20px">
  <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">${subject}</h2>
  ${notif.contentSnippet ? `<p style="color:#555;font-style:italic;border-left:3px solid #e5e7eb;padding-left:12px">${notif.contentSnippet}</p>` : ""}
  <p style="margin-top:24px">
    <a href="${appUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View notification →</a>
  </p>
  <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb" />
  <p style="font-size:12px;color:#9ca3af">You're receiving this because you have real-time email notifications enabled.</p>
</body></html>`;

    await enqueueEmail({
      to:      recipient.email,
      subject,
      html,
      type:    "notification_email",
    });
  }
}
