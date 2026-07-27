import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { databaseProperties, pages, propertyValues, workspaceMembers } from "@/lib/db/schema";
import { triggerTaskAssignedNotification } from "@/lib/notifications/triggers";
import { syncEntryReminder } from "@/lib/reminders/sync-entry-reminder";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; propId: string }> }) {
  const { id: entryId, propId } = await params;
  const session = await requireSession();

  const [entry] = await db.select().from(pages).where(and(eq(pages.id, entryId), eq(pages.kind, "entry"))).limit(1);
  if (!entry) return Response.json({ error: "not_found" }, { status: 404 });

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, entry.workspaceId), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member || member.role === "viewer") return Response.json({ error: "forbidden" }, { status: 403 });

  const [prop] = await db.select().from(databaseProperties).where(eq(databaseProperties.id, propId)).limit(1);
  if (!prop) return Response.json({ error: "not_found" }, { status: 404 });

  const body = await req.json() as { value: unknown };

  // Computed properties are never stored directly — Formula/Rollup/Created-by
  // are recalculated from other data on every read (lib/databases/compute-values.ts)
  // and never consult property_values at all, so a direct write here would
  // just sit as permanently-unreachable orphaned data. Reject outright rather
  // than silently accepting a write nothing will ever read back.
  if (prop.type === "formula" || prop.type === "rollup" || prop.type === "created_by") {
    return Response.json({ error: "computed_property_readonly" }, { status: 400 });
  }

  // Fetched once up front — reused below both for the vote-mode self-only
  // check and (for a regular, non-vote-mode person property) to diff old vs.
  // new assignees so a task-assignment notification only fires for someone
  // *newly* added, not for every person already sitting in the value.
  let existingPersonValue: { userIds?: string[] } | null = null;
  if (prop.type === "person") {
    const [existing] = await db
      .select()
      .from(propertyValues)
      .where(and(eq(propertyValues.entryId, entryId), eq(propertyValues.propertyId, propId)))
      .limit(1);
    existingPersonValue = (existing?.value as { userIds?: string[] } | null) ?? null;
  }

  // Vote-mode Person properties: a regular member may only add or remove
  // *their own* id — never anyone else's, and never more than one id per
  // request. Admins keep full read/write access here for moderation.
  const isAdmin = member.role === "admin";
  if (prop.type === "person" && (prop.config as { voteMode?: boolean } | null)?.voteMode && !isAdmin) {
    const oldIds = new Set(existingPersonValue?.userIds ?? []);
    const newIds = new Set(((body.value as { userIds?: string[] } | null)?.userIds) ?? []);

    const added   = [...newIds].filter((uid) => !oldIds.has(uid));
    const removed = [...oldIds].filter((uid) => !newIds.has(uid));
    const isSelfOnlyToggle =
      (added.length === 1 && added[0] === session.user.id && removed.length === 0) ||
      (removed.length === 1 && removed[0] === session.user.id && added.length === 0);

    if (!isSelfOnlyToggle) {
      return Response.json({ error: "vote_self_only" }, { status: 403 });
    }
  }

  const [val] = await db
    .insert(propertyValues)
    .values({ entryId, propertyId: propId, value: body.value })
    .onConflictDoUpdate({
      target: [propertyValues.entryId, propertyValues.propertyId],
      set:    { value: body.value, updatedAt: new Date() },
    })
    .returning();

  // Update pages.updated_at + lastEditedBy
  await db.update(pages).set({ updatedAt: new Date(), lastEditedBy: session.user.id }).where(eq(pages.id, entryId));

  // Keep the reminder schedule in sync with this date property's current value
  if (prop.type === "date") {
    await db.transaction(async (tx) => {
      await syncEntryReminder(tx, {
        entryId:     entryId,
        propertyId:  propId,
        workspaceId: entry.workspaceId,
        recipientId: session.user.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value:       body.value as any,
      });
    });
  }

  // Notify newly-assigned users — person properties are stored as
  // `{ userIds: string[] }` (see components/database/cells/cell-editor.tsx's
  // PersonEditor), not a bare array/string, and only *newly added* ids
  // should notify, or every unrelated save of an already-assigned person
  // property would re-notify them.
  if (prop.type === "person") {
    const oldIds = new Set(existingPersonValue?.userIds ?? []);
    const newIds = ((body.value as { userIds?: string[] } | null)?.userIds) ?? [];
    const addedAssigneeIds = newIds.filter((uid) => !oldIds.has(uid));

    for (const assigneeId of addedAssigneeIds) {
      if (assigneeId !== session.user.id) {
        await db.transaction(async (tx) => {
          await triggerTaskAssignedNotification(tx, {
            workspaceId: entry.workspaceId,
            pageId:      entryId,
            assignerId:  session.user.id,
            assigneeId,
            entryTitle:  entry.title ?? "Untitled",
          });
        });
      }
    }
  }

  return Response.json(val);
}
