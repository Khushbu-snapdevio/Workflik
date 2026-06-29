import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  databaseProperties,
  databaseViews,
  pageClosure,
  pages,
  propertyValues,
  userFavorites,
  workspaces,
} from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { TemplatePageClient } from "@/components/templates/template-page-client";

type Props = { params: Promise<{ workspace: string; pageId: string }> };

export async function generateMetadata({ params }: Props) {
  const { pageId } = await params;
  const [page] = await db
    .select({ title: pages.title })
    .from(pages)
    .where(eq(pages.shortId, pageId))
    .limit(1);
  return { title: page?.title ?? "Template" };
}

export default async function TemplateDatabasePage({ params }: Props) {
  const { workspace: slug, pageId: shortId } = await params;
  const session = await requireSession();

  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!ws) notFound();

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  const isEditor = member.role === "admin" || member.role === "editor";
  const isAdmin  = member.role === "admin";

  const [page] = await db
    .select({
      id: pages.id, shortId: pages.shortId, title: pages.title,
      icon: pages.icon, coverUrl: pages.coverUrl, kind: pages.kind,
      defaultViewId: pages.defaultViewId,
      isPrivate: pages.isPrivate, isLocked: pages.isLocked, isDeleted: pages.isDeleted,
    })
    .from(pages)
    .where(and(eq(pages.shortId, shortId), eq(pages.workspaceId, ws.id)))
    .limit(1);
  if (!page) notFound();

  const [favRow] = await db
    .select({ id: userFavorites.id })
    .from(userFavorites)
    .where(and(eq(userFavorites.userId, session.user.id), eq(userFavorites.pageId, page.id)))
    .limit(1);
  const isFavorited = !!favRow;

  // Breadcrumbs — ancestors ordered root → parent
  const ancestorRows = await db
    .select({ id: pages.id, shortId: pages.shortId, title: pages.title, depth: pageClosure.depth })
    .from(pageClosure)
    .innerJoin(pages, eq(pages.id, pageClosure.ancestorId))
    .where(and(eq(pageClosure.descendantId, page.id), gt(pageClosure.depth, 0)))
    .orderBy(asc(pageClosure.depth));

  const breadcrumbs = ancestorRows
    .sort((a, b) => b.depth - a.depth)
    .map((r) => ({ shortId: r.shortId, title: r.title || "Untitled" }));

  const props = await db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, page.id))
    .orderBy(asc(databaseProperties.orderIndex));

  const views = await db
    .select()
    .from(databaseViews)
    .where(eq(databaseViews.databaseId, page.id))
    .orderBy(asc(databaseViews.orderIndex));

  const entries = await db
    .select({ id: pages.id, shortId: pages.shortId, title: pages.title, icon: pages.icon, orderIndex: pages.orderIndex })
    .from(pages)
    .where(
      and(
        eq(pages.databaseId, page.id),
        eq(pages.kind, "entry"),
        eq(pages.isDeleted, false),
      ),
    )
    .orderBy(asc(pages.orderIndex));

  const entryIds = entries.map((e) => e.id);
  const values =
    entryIds.length > 0
      ? await db
          .select()
          .from(propertyValues)
          .where(inArray(propertyValues.entryId, entryIds))
      : [];

  return (
    <TemplatePageClient
      page={{
        id:       page.id,
        shortId:  page.shortId,
        title:    page.title,
        icon:     page.icon,
        coverUrl: page.coverUrl,
        kind:     page.kind,
      }}
      properties={props}
      views={views}
      entries={entries}
      values={values}
      workspaceSlug={slug}
      workspaceName={ws.name}
      workspaceId={ws.id}
      breadcrumbs={breadcrumbs}
      defaultViewId={page.defaultViewId ?? null}
      currentUserId={session.user.id}
      isPrivate={page.isPrivate ?? false}
      isFavorited={isFavorited}
      isEditor={isEditor}
      isAdmin={isAdmin}
      isLocked={page.isLocked ?? false}
      isDeleted={page.isDeleted ?? false}
    />
  );
}
