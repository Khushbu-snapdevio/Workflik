import { and, eq, sql } from "drizzle-orm";
import type { Job } from "pg-boss";
import { emailOutbox } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { sendEmailViaSmtp } from "@/lib/smtp/client";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { type EmailSendPayload, JOB_NAMES } from "@/lib/jobs/job-names";

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_SECONDS = [60, 300, 900];

export async function handleEmailSend(jobs: Job<EmailSendPayload>[]) {
  for (const job of jobs) {
    await processEmailSendJob(job);
  }
}

async function processEmailSendJob(job: Job<EmailSendPayload>) {
  const { outboxId } = job.data;

  const [claimed] = await db
    .update(emailOutbox)
    .set({
      attemptCount: sql`${emailOutbox.attemptCount} + 1`,
      status:       "sending",
      updatedAt:    new Date(),
    })
    .where(and(eq(emailOutbox.id, outboxId), eq(emailOutbox.status, "queued")))
    .returning();

  if (!claimed) return;

  const attempt = claimed.attemptCount;
  const remainingAttempts = MAX_ATTEMPTS - attempt;

  try {
    await sendEmailViaSmtp({
      html:    claimed.htmlBody,
      subject: claimed.subject,
      to:      claimed.recipientEmail,
    });

    await db
      .update(emailOutbox)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(emailOutbox.id, outboxId));
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);

    if (remainingAttempts > 0) {
      await db
        .update(emailOutbox)
        .set({ lastError: reason, status: "queued", updatedAt: new Date() })
        .where(eq(emailOutbox.id, outboxId));

      await enqueueJob(
        JOB_NAMES.EMAIL_SEND,
        { outboxId },
        { startAfter: RETRY_BACKOFF_SECONDS[Math.min(attempt - 1, RETRY_BACKOFF_SECONDS.length - 1)] }
      );
      return;
    }

    await db
      .update(emailOutbox)
      .set({ lastError: reason, status: "failed", updatedAt: new Date() })
      .where(eq(emailOutbox.id, outboxId));
  }
}
