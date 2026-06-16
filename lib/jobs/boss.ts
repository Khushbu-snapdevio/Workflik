import { PgBoss } from "pg-boss";
import { env } from "@/lib/env";
import { normalizePgConnectionString } from "@/lib/pg-connection";
import { sleep } from "@/lib/utils";
import { ensureJobQueues } from "@/lib/jobs/queue-options";
import { JOB_NAMES } from "@/lib/jobs/job-names";

const boss = new PgBoss({
  connectionString: normalizePgConnectionString(env.DATABASE_URL),
});

export { boss };

async function startBossWithRetry(maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await boss.start();
      console.log("[worker] pg-boss started");
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = Math.min(2000 * 2 ** (attempt - 1), 30_000);
      console.error(
        `[worker] pg-boss start failed (${attempt}/${maxRetries}); retrying in ${delay / 1000}s`,
        error
      );
      await sleep(delay);
    }
  }
}

export async function startWorker() {
  boss.on("error", (error) => {
    console.error("[worker] pg-boss error", error);
  });

  await startBossWithRetry();
  await ensureJobQueues(boss);

  const { handleEmailSend }           = await import("@/lib/jobs/handlers/email-send");
  const { handleEmailOutboxReap }     = await import("@/lib/jobs/handlers/email-outbox-reap");
  const { handleScaffoldHealthcheck } = await import("@/lib/jobs/handlers/scaffold-healthcheck");
  const { handleWorkspaceInviteSend } = await import("@/lib/jobs/handlers/send-workspace-invite");

  await Promise.all([
    boss.work(JOB_NAMES.EMAIL_SEND, handleEmailSend),
    boss.work(JOB_NAMES.EMAIL_OUTBOX_REAP, handleEmailOutboxReap),
    boss.work(JOB_NAMES.SCAFFOLD_HEALTHCHECK, handleScaffoldHealthcheck),
    boss.work(JOB_NAMES.WORKSPACE_INVITE_SEND, handleWorkspaceInviteSend),
  ]);

  await boss.schedule(JOB_NAMES.EMAIL_OUTBOX_REAP, "*/15 * * * *", {});
  await boss.schedule(JOB_NAMES.SCAFFOLD_HEALTHCHECK, "*/10 * * * *", {});

  console.log("[worker] handlers registered");
}

export async function stopWorker() {
  await boss.stop({ graceful: true });
}
