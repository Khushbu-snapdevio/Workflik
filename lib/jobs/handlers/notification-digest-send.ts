import { and, desc, eq, gte, inArray } from "drizzle-orm";
import type { Job } from "pg-boss";
import { db } from "@/lib/db";
import { notifications, notificationPreferences, pages, users } from "@/lib/db/schema";
import { enqueueEmail } from "@/lib/email";
import { env } from "@/lib/env";

export async function handleNotificationDigestSend(jobs: Job<Record<string, never>>[]) {
  for (const _job of jobs) {
    await processDigests();
  }
}

async function processDigests() {
  const nowHour = new Date().getUTCHours();

  // Find users who want a daily or weekly digest at this UTC hour (approximation).
  // A full TZ-aware implementation would store user timezone and convert — this sends
  // to all daily/weekly users at 8:00 UTC as a simple first pass.
  if (nowHour !== 8) return;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Users with daily or weekly preference
  const dayOfWeek = new Date().getUTCDay();

  const prefs = await db
    .select({
      userId:          notificationPreferences.userId,
      emailFrequency:  notificationPreferences.emailFrequency,
      weeklyDigestDay: notificationPreferences.weeklyDigestDay,
    })
    .from(notificationPreferences)
    .where(
      inArray(notificationPreferences.emailFrequency, ["daily", "weekly"])
    );

  for (const pref of prefs) {
    if (pref.emailFrequency === "weekly" && pref.weeklyDigestDay !== dayOfWeek) continue;

    await sendDigestForUser(pref.userId, today);
  }
}

async function sendDigestForUser(userId: string, since: Date) {
  const unread = await db
    .select({
      id:             notifications.id,
      type:           notifications.type,
      contentSnippet: notifications.contentSnippet,
      pageId:         notifications.pageId,
      senderId:       notifications.senderId,
      createdAt:      notifications.createdAt,
      senderName:     users.name,
      pageTitle:      pages.title,
    })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.senderId))
    .leftJoin(pages, eq(pages.id, notifications.pageId))
    .where(
      and(
        eq(notifications.recipientId, userId),
        eq(notifications.isRead, false),
        gte(notifications.createdAt, since),
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  if (!unread.length) return; // No unread — skip digest

  const [recipient] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!recipient) return;

  // Group by page
  const byPage = new Map<string, typeof unread>();
  for (const n of unread) {
    const key = n.pageTitle ?? "(no page)";
    if (!byPage.has(key)) byPage.set(key, []);
    byPage.get(key)!.push(n);
  }

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const subject   = `Your WorkFlik activity for ${dateLabel}`;
  const appUrl    = env.NEXT_PUBLIC_APP_URL ?? "https://app.workflik.com";

  let sectionsHtml = "";
  for (const [pageTitle, items] of byPage) {
    const rows = items.map((n) => {
      const who     = n.senderName ?? "System";
      const snippet = n.contentSnippet ? `"${n.contentSnippet}"` : "";
      return `<li style="margin-bottom:6px;color:#374151"><strong>${who}</strong>: ${snippet}</li>`;
    }).join("");
    sectionsHtml += `
      <div style="margin-bottom:20px">
        <h3 style="font-size:14px;font-weight:700;color:#111;margin-bottom:6px">${pageTitle}</h3>
        <ul style="list-style:none;padding:0;margin:0">${rows}</ul>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;color:#111;max-width:560px;margin:40px auto;padding:0 20px">
  <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">Your WorkFlik activity</h2>
  <p style="color:#6b7280;margin-top:0;margin-bottom:24px">${dateLabel}</p>
  ${sectionsHtml}
  <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb" />
  <p style="margin-top:16px">
    <a href="${appUrl}" style="color:#2563eb;font-weight:600;text-decoration:none">View all notifications →</a>
    &nbsp;&nbsp;
    <a href="${appUrl}/settings/notifications" style="color:#9ca3af;font-size:12px;text-decoration:none">Manage email settings</a>
  </p>
</body></html>`;

  await enqueueEmail({ to: recipient.email, subject, html, type: "digest_email" });
}
