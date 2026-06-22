import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { databaseProperties, pages, propertyValues, workspaceMembers } from "@/lib/db/schema";
import { triggerTaskAssignedNotification } from "@/lib/notifications/triggers";

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

  // Notify the assigned user when a person property is set
  if (prop.type === "person" && body.value) {
    const assigneeIds = Array.isArray(body.value) ? body.value as string[] : [body.value as string];
    for (const assigneeId of assigneeIds) {
      if (typeof assigneeId === "string" && assigneeId !== session.user.id) {
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
