import type { PgBoss } from "pg-boss";
import { JOB_NAMES } from "@/lib/jobs/job-names";

// This is the ONLY file that calls boss.work() or boss.schedule().
// To add a new job: add the handler to lib/jobs/handlers/, then register it here.
export async function registerHandlers(boss: PgBoss) {
  const [
    { handleEmailSend },
    { handleEmailOutboxReap },
    { handleEmailEventsPrune },
    { handleScaffoldHealthcheck },
  ] = await Promise.all([
    import("@/lib/jobs/handlers/email-send"),
    import("@/lib/jobs/handlers/email-outbox-reap"),
    import("@/lib/jobs/handlers/email-events-prune"),
    import("@/lib/jobs/handlers/scaffold-healthcheck"),
  ]);

  await Promise.all([
    boss.work(JOB_NAMES.EMAIL_SEND,           { includeMetadata: true }, handleEmailSend),
    boss.work(JOB_NAMES.EMAIL_OUTBOX_REAP,    { includeMetadata: true }, handleEmailOutboxReap),
    boss.work(JOB_NAMES.EMAIL_EVENTS_PRUNE,   { includeMetadata: true }, handleEmailEventsPrune),
    boss.work(JOB_NAMES.SCAFFOLD_HEALTHCHECK, { includeMetadata: true }, handleScaffoldHealthcheck),
  ]);

  await boss.schedule(JOB_NAMES.EMAIL_OUTBOX_REAP,    "*/15 * * * *", {});
  await boss.schedule(JOB_NAMES.EMAIL_EVENTS_PRUNE,   "17 3 * * *",   {});
  await boss.schedule(JOB_NAMES.SCAFFOLD_HEALTHCHECK, "*/10 * * * *", {});
}
