import { and, eq } from "drizzle-orm";
import { entryReminders } from "@/lib/db/schema";
import { computeRemindAt, type DateReminderInput } from "@/lib/reminders/compute-remind-at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any;

// Syncs entry_reminders with a date property's value on every save; deletes the row when nothing should be
// scheduled (no reminder/date, or already past), otherwise upserts for entry-reminder-send.ts's cron to pick up.
export async function syncEntryReminder(
  tx: AnyTx,
  params: {
    entryId:     string;
    propertyId:  string;
    workspaceId: string;
    recipientId: string;
    value:       DateReminderInput | null | undefined;
  }
): Promise<void> {
  const { entryId, propertyId, workspaceId, recipientId, value } = params;
  const remindAt = value ? computeRemindAt(value) : null;

  if (!remindAt || remindAt.getTime() <= Date.now()) {
    await tx
      .delete(entryReminders)
      .where(and(eq(entryReminders.entryId, entryId), eq(entryReminders.propertyId, propertyId)));
    return;
  }

  await tx
    .insert(entryReminders)
    .values({ entryId, propertyId, workspaceId, recipientId, remindAt, notified: false })
    .onConflictDoUpdate({
      target: [entryReminders.entryId, entryReminders.propertyId],
      set:    { remindAt, notified: false, recipientId, updatedAt: new Date() },
    });
}
