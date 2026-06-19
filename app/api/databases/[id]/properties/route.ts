import { and, count, eq } from "drizzle-orm";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { databaseProperties, pages, workspaceMembers } from "@/lib/db/schema";

async function guard(databaseId: string, userId: string, requireEditor = false) {
  const [page] = await db.select().from(pages).where(and(eq(pages.id, databaseId), eq(pages.kind, "database"))).limit(1);
  if (!page) return null;
  const [member] = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, page.workspaceId), eq(workspaceMembers.userId, userId))).limit(1);
  if (!member) return null;
  if (requireEditor && member.role === "viewer") return null;
  return { page, member };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!await guard(id, session.user.id)) return Response.json({ error: "not_found" }, { status: 404 });

  const props = await db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, id))
    .orderBy(databaseProperties.orderIndex);

  return Response.json(props);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!await guard(id, session.user.id, true)) return Response.json({ error: "forbidden" }, { status: 403 });

  // Enforce 50-property limit (system + back-relation don't count)
  const [{ total }] = await db
    .select({ total: count(databaseProperties.id) })
    .from(databaseProperties)
    .where(and(
      eq(databaseProperties.databaseId, id),
      eq(databaseProperties.isSystem, false),
      eq(databaseProperties.isBackRelation, false),
    ));

  if (Number(total) >= 50) {
    return Response.json({ error: "property_limit_exceeded", limit: 50 }, { status: 400 });
  }

  const body = await req.json() as {
    name: string;
    type: string;
    config?: Record<string, unknown>;
    defaultValue?: unknown;
  };

  const [{ maxIdx }] = await db
    .select({ maxIdx: count(databaseProperties.id) })
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, id));

  const [prop] = await db.insert(databaseProperties).values({
    databaseId:   id,
    name:         body.name ?? "Property",
    type:         body.type as "text",
    config:       body.config ?? {},
    defaultValue: body.defaultValue ?? null,
    orderIndex:   Number(maxIdx),
  }).returning();

  return Response.json(prop, { status: 201 });
}
