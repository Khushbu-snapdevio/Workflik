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
  userRecentlyVisited,
  workspaces,
} from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { ChevronRight, FileText, Home } from "lucide-react";
import { PageClient } from "@/components/pages/page-client";
import { PageActionsMenu } from "@/components/pages/page-actions-menu";
import { PageCommentButton } from "@/components/pages/page-comment-button";
import { FavoriteButton } from "@/components/pages/favorite-button";
import { ShareButton } from "@/components/pages/share-button";
import { TrashBanner } from "@/components/pages/trash-banner";
import { TemplatePageClient } from "@/components/templates/template-page-client";

type Props = { params: Promise<{ workspace: string; pageId: string }> };

export async function generateMetadata({ params }: Props) {
  const { pageId } = await params;
  const [page] = await db
    .select({ title: pages.title })
    .from(pages)
    .where(eq(pages.shortId, pageId))
    .limit(1);
  return { title: page?.title ?? "Page" };
}

export default async function PageEditorPage({ params }: Props) {
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

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.shortId, shortId), eq(pages.workspaceId, ws.id)))
    .limit(1);
  if (!page) notFound();

  // Record visit (fire-and-forget)
  db.insert(userRecentlyVisited)
    .values({ userId: session.user.id, workspaceId: ws.id, pageId: page.id })
    .onConflictDoUpdate({
      target: [userRecentlyVisited.userId, userRecentlyVisited.pageId],
      set: { visitedAt: new Date() },
    })
    .catch(() => {});

  // Breadcrumbs — ancestors root → parent
  const ancestorRows = await db
    .select({ id: pages.id, shortId: pages.shortId, title: pages.title, icon: pages.icon, depth: pageClosure.depth })
    .from(pageClosure)
    .innerJoin(pages, eq(pages.id, pageClosure.ancestorId))
    .where(and(eq(pageClosure.descendantId, page.id), gt(pageClosure.depth, 0)))
    .orderBy(asc(pageClosure.depth));

  const breadcrumbs = ancestorRows
    .sort((a, b) => b.depth - a.depth)
    .map((r) => ({ id: r.id, shortId: r.shortId, title: r.title || "Untitled", icon: r.icon }));

  const isEditor = member.role === "admin" || member.role === "editor";
  const isAdmin  = member.role === "admin";

  // Check if page is in user's favorites
  const [favRow] = await db
    .select({ id: userFavorites.id })
    .from(userFavorites)
    .where(and(eq(userFavorites.userId, session.user.id), eq(userFavorites.pageId, page.id)))
    .limit(1);
  const isFavorited = !!favRow;

  // ── Database pages → TemplatePageClient (Notion-style, no stats bar) ─────────
  if (page.kind === "database") {
    const [props, views, entries] = await Promise.all([
      db
        .select()
        .from(databaseProperties)
        .where(eq(databaseProperties.databaseId, page.id))
        .orderBy(asc(databaseProperties.orderIndex)),
      db
        .select()
        .from(databaseViews)
        .where(eq(databaseViews.databaseId, page.id))
        .orderBy(asc(databaseViews.orderIndex)),
      db
        .select({ id: pages.id, shortId: pages.shortId, title: pages.title, orderIndex: pages.orderIndex })
        .from(pages)
        .where(and(eq(pages.databaseId, page.id), eq(pages.kind, "entry"), eq(pages.isDeleted, false)))
        .orderBy(asc(pages.orderIndex)),
    ]);

    const entryIds = entries.map((e) => e.id);
    const values =
      entryIds.length > 0
        ? await db.select().from(propertyValues).where(inArray(propertyValues.entryId, entryIds))
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

  // ── Regular / doc pages → PageClient ─────────────────────────────────────────
  const statusBanner = (
    <>
      {page.isDeleted && <TrashBanner pageId={page.id} workspaceSlug={slug} />}
      {page.isLocked && (
        <div className="mb-5 flex items-center gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          This page is <strong className="ml-1">locked</strong> — editing is disabled.
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background" data-page-id={page.id}>
      {/* ── Topbar ── */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-card px-3">

        {/* Breadcrumbs */}
        <nav className="flex min-w-0 items-center gap-0.5 text-xs">
          <a
            href={`/app/${slug}`}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
          >
            <Home size={13} className="shrink-0" />
            <span className="font-medium">{ws.name}</span>
          </a>

          {breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="flex min-w-0 items-center gap-0.5">
              <ChevronRight size={12} className="shrink-0 text-foreground/30" />
              <a
                href={`/app/${slug}/${crumb.shortId}`}
                className="flex max-w-[120px] items-center gap-1.5 truncate rounded-[var(--radius-sm)] px-2 py-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                {crumb.icon
                  ? <span className="shrink-0 text-sm leading-none">{crumb.icon}</span>
                  : <FileText size={12} className="shrink-0" />
                }
                {crumb.title || "Untitled"}
              </a>
            </span>
          ))}

          <span className="flex min-w-0 items-center gap-0.5">
            <ChevronRight size={12} className="shrink-0 text-foreground/30" />
            <span className="flex max-w-[240px] items-center gap-1.5 truncate px-2 py-1 text-xs font-semibold text-foreground/80">
              {page.icon
                ? <span className="shrink-0 text-sm leading-none">{page.icon}</span>
                : <FileText size={12} className="shrink-0 text-muted-foreground" />
              }
              {page.title || "Untitled"}
            </span>
          </span>
        </nav>

        {/* Actions */}
        <div className="ml-2 flex shrink-0 items-center gap-0.5">
          <ShareButton
            pageId={page.id}
            currentUserId={session.user.id}
            isPrivate={page.isPrivate}
            isEditor={isEditor}
          />
          <PageCommentButton
            pageId={page.id}
            workspaceId={ws.id}
            currentUserId={session.user.id}
            isAdmin={isAdmin}
          />
          <FavoriteButton
            pageId={page.id}
            workspaceId={ws.id}
            isFavorited={isFavorited}
          />
          {isEditor && (
            <PageActionsMenu
              pageId={page.id}
              isLocked={page.isLocked}
              isDeleted={page.isDeleted}
              workspaceSlug={slug}
              workspaceId={ws.id}
              pageShortId={page.shortId}
              pageTitle={page.title ?? ""}
              pageKind={page.kind}
            />
          )}
        </div>
      </div>

      <PageClient
        pageId={page.id}
        shortId={page.shortId}
        initialTitle={page.title}
        initialIcon={page.icon}
        initialCoverUrl={page.coverUrl}
        initialCoverPosition={page.coverPosition}
        isLocked={page.isLocked}
        isDeleted={page.isDeleted}
        isEditor={isEditor}
        workspaceSlug={slug}
        workspaceId={ws.id}
        fontFamily={page.fontFamily}
        isSmallText={page.isSmallText}
        isFullWidth={page.isFullWidth}
        statusBanner={statusBanner}
        databaseId={page.databaseId}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
