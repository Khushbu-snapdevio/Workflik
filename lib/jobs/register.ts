import type { PgBoss } from "pg-boss";
import { JOB_NAMES } from "@/lib/jobs/job-names";

// This is the ONLY file that calls boss.work() or boss.schedule().
// To add a new job: add the handler to lib/jobs/handlers/, then register it here.
export async function registerHandlers(boss: PgBoss) {
  const [
    { handleEmailSend },
    { handleEmailOutboxReap },
    { handleScaffoldHealthcheck },
    { handleAutoDeleteExpiredTrash },
    { handleWarnExpiringTrash },
    { handleAutoDeleteExpiredVersions },
    { handleExportPage },
  ] = await Promise.all([
    import("@/lib/jobs/handlers/email-send"),
    import("@/lib/jobs/handlers/email-outbox-reap"),
    import("@/lib/jobs/handlers/scaffold-healthcheck"),
    import("@/lib/jobs/handlers/auto-delete-expired-trash"),
    import("@/lib/jobs/handlers/warn-expiring-trash"),
    import("@/lib/jobs/handlers/auto-delete-expired-versions"),
    import("@/lib/jobs/handlers/export-page"),
  ]);

  await Promise.all([
    boss.work(JOB_NAMES.EMAIL_SEND,                           { includeMetadata: true }, handleEmailSend),
    boss.work(JOB_NAMES.EMAIL_OUTBOX_REAP,                    { includeMetadata: true }, handleEmailOutboxReap),
    boss.work(JOB_NAMES.SCAFFOLD_HEALTHCHECK,                 { includeMetadata: true }, handleScaffoldHealthcheck),
    boss.work(JOB_NAMES.PAGE_AUTO_DELETE_EXPIRED_TRASH,       { includeMetadata: true }, handleAutoDeleteExpiredTrash),
    boss.work(JOB_NAMES.PAGE_WARN_EXPIRING_TRASH,             { includeMetadata: true }, handleWarnExpiringTrash),
    boss.work(JOB_NAMES.PAGE_AUTO_DELETE_EXPIRED_VERSIONS,    { includeMetadata: true }, handleAutoDeleteExpiredVersions),
    boss.work(JOB_NAMES.PAGE_EXPORT,                          { includeMetadata: true }, handleExportPage),
  ]);

  // Scheduled cron jobs
  await boss.schedule(JOB_NAMES.EMAIL_OUTBOX_REAP,                 "*/15 * * * *",  {});
  await boss.schedule(JOB_NAMES.SCAFFOLD_HEALTHCHECK,              "*/10 * * * *",  {});
  await boss.schedule(JOB_NAMES.PAGE_AUTO_DELETE_EXPIRED_TRASH,    "0 2 * * *",     {}); // Daily 02:00 UTC
  await boss.schedule(JOB_NAMES.PAGE_WARN_EXPIRING_TRASH,          "0 2 * * *",     {}); // Daily 02:00 UTC
  await boss.schedule(JOB_NAMES.PAGE_AUTO_DELETE_EXPIRED_VERSIONS, "0 3 * * *",     {}); // Daily 03:00 UTC
}
