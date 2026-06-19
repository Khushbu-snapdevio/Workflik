import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { pages, propertyValues, workspaceMembers } from "@/lib/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: entryId } = await params;
  const session = await requireSession();

  const [entry] = await db.select().from(pages).where(eq(pages.id, entryId)).limit(1);
  if (!entry) return Response.json({ error: "not_found" }, { status: 404 });

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, entry.workspaceId), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member) return Response.json({ error: "forbidden" }, { status: 403 });

  const values = await db
    .select()
    .from(propertyValues)
    .where(eq(propertyValues.entryId, entryId));

  return Response.json(values);
}
