import { randomUUID } from "node:crypto";
import { emailOutbox } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { JOB_NAMES } from "@/lib/jobs/job-names";

export interface SendEmailOptions {
  html: string;
  subject: string;
  text?: string;
  to: string;
}

export async function enqueueEmail(options: SendEmailOptions) {
  const [row] = await db
    .insert(emailOutbox)
    .values({
      idempotencyKey: randomUUID(),
      payload: options,
      status: "queued",
    })
    .returning({ id: emailOutbox.id });

  await enqueueJob(JOB_NAMES.EMAIL_SEND, { outboxId: row.id });
}
