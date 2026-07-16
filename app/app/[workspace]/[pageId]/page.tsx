import { and, asc, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  comments,
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
import { PageClient } from "@/components/pages/page-client";
import { PageBreadcrumbs } from "@/components/pages/page-breadcrumbs";
import { PageActionsMenu } from "@/components/pages/page-actions-menu";
import { PageCommentButton } from "@/components/pages/page-comment-button";
import { FavoriteButton } from "@/components/pages/favorite-button";
import { ShareButton } from "@/components/pages/share-button";
import { CopyLinkButton } from "@/components/pages/copy-link-button";
import { TimeAgo } from "@/components/ui/time-ago";
import { PagePrivacyProvider } from "@/components/pages/page-privacy-context";
import { PagePrivacyPill } from "@/components/pages/page-privacy-pill";
import { TrashBanner } from "@/components/pages/trash-banner";
import { TemplatePageClient } from "@/components/templates/template-page-client";
import { computeDerivedValues } from "@/lib/databases/compute-values";

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

  // Delete fallback for a root-level page (no parent): the nearest other
  // top-level item — previous in sidebar order, or next if this was first.
  let rootFallbackShortId: string | null = null;
  if (breadcrumbs.length === 0) {
    const [prevSibling] = await db
      .select({ shortId: pages.shortId })
      .from(pages)
      .where(and(
        eq(pages.workspaceId, ws.id),
        eq(pages.isDeleted, false),
        isNull(pages.parentId),
        lt(pages.orderIndex, page.orderIndex)
      ))
      .orderBy(desc(pages.orderIndex))
      .limit(1);

    if (prevSibling) {
      rootFallbackShortId = prevSibling.shortId;
    } else {
      const [nextSibling] = await db
        .select({ shortId: pages.shortId })
        .from(pages)
        .where(and(
          eq(pages.workspaceId, ws.id),
          eq(pages.isDeleted, false),
          isNull(pages.parentId),
          gt(pages.orderIndex, page.orderIndex)
        ))
        .orderBy(asc(pages.orderIndex))
        .limit(1);
      rootFallbackShortId = nextSibling?.shortId ?? null;
    }
  }

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
        .select({ id: pages.id, shortId: pages.shortId, title: pages.title, icon: pages.icon, orderIndex: pages.orderIndex, updatedAt: pages.updatedAt, createdBy: pages.createdBy })
        .from(pages)
        .where(and(eq(pages.databaseId, page.id), eq(pages.kind, "entry"), eq(pages.isDeleted, false)))
        .orderBy(asc(pages.orderIndex)),
    ]);

    const entryIds = entries.map((e) => e.id);
    const storedValues =
      entryIds.length > 0
        ? await db.select().from(propertyValues).where(inArray(propertyValues.entryId, entryIds))
        : [];

    // Rollup, Created-by, and Formula properties are computed, not stored —
    // same helper the live entries API route uses (lib/databases/compute-values.ts)
    // — so this initial server render already shows them instead of only
    // populating after the client's first view-switch fetch.
    const valMap = new Map<string, Map<string, unknown>>();
    for (const v of storedValues) {
      if (!valMap.has(v.entryId)) valMap.set(v.entryId, new Map());
      valMap.get(v.entryId)!.set(v.propertyId, v.value);
    }
    const computedValues = entryIds.length > 0 ? await computeDerivedValues(props, entries, valMap) : [];
    const values = [
      ...storedValues,
      ...computedValues.map((cv) => ({
        id: `computed:${cv.propertyId}:${cv.entryId}`,
        entryId: cv.entryId,
        propertyId: cv.propertyId,
        value: cv.value,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      })),
    ];

    // Open (unresolved, undeleted, root-level, page-level) comment count per
    // entry — same definition as /api/databases/[id]/entries, shown as a
    // chat-icon badge next to the entry's name across table/board/gallery/
    // calendar views. propertyId must be excluded — the badge's popover only
    // shows page-level threads, so counting property-scoped ones here would
    // overcount relative to what that popover actually displays.
    const commentCountRows = entryIds.length > 0
      ? await db
          .select({ pageId: comments.pageId, count: sql<number>`count(*)::int` })
          .from(comments)
          .where(and(
            inArray(comments.pageId, entryIds),
            isNull(comments.parentId),
            isNull(comments.propertyId),
            eq(comments.isResolved, false),
            isNull(comments.deletedAt),
          ))
          .groupBy(comments.pageId)
      : [];
    const commentCountMap = new Map(commentCountRows.map((r) => [r.pageId, r.count]));

    return (
      <TemplatePageClient
        page={{
          id:       page.id,
          shortId:  page.shortId,
          title:    page.title,
          icon:     page.icon,
          coverUrl: page.coverUrl,
          kind:     page.kind,
          updatedAt: page.updatedAt ? new Date(page.updatedAt).toISOString() : null,
        }}
        properties={props}
        views={views}
        entries={entries.map((e) => ({ ...e, updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null, commentCount: commentCountMap.get(e.id) ?? 0 }))}
        values={values}
        workspaceSlug={slug}
        workspaceName={ws.name}
        workspaceId={ws.id}
        breadcrumbs={breadcrumbs}
        rootFallbackShortId={rootFallbackShortId}
        defaultViewId={page.defaultViewId ?? null}
        currentUserId={session.user.id}
        currentUserName={session.user.name ?? null}
        currentUserEmail={session.user.email ?? null}
        currentUserImage={session.user.image ?? null}
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
      {page.isDeleted && (
        <TrashBanner
          pageId={page.id}
          workspaceSlug={slug}
          parentShortId={breadcrumbs[breadcrumbs.length - 1]?.shortId ?? null}
          rootFallbackShortId={rootFallbackShortId}
        />
      )}
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
      <PagePrivacyProvider initialIsPrivate={page.isPrivate}>
      <div className="flex h-11 shrink-0 items-center justify-between bg-background px-3">

        {/* Breadcrumbs */}
        <div className="flex min-w-0 items-center">
          <PageBreadcrumbs
            workspaceSlug={slug}
            workspaceName={ws.name}
            ancestors={breadcrumbs}
            currentPageId={page.id}
            initialTitle={page.title}
            initialIcon={page.icon}
          />
          <PagePrivacyPill />
        </div>

        {/* Actions */}
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {page.updatedAt && (
            <span className="mr-1.5 whitespace-nowrap text-xs text-muted-foreground/70">
              Edited <TimeAgo iso={new Date(page.updatedAt).toISOString()} />
            </span>
          )}
          <ShareButton
            pageId={page.id}
            pageShortId={page.shortId}
            workspaceSlug={slug}
            currentUserId={session.user.id}
            currentUserName={session.user.name ?? null}
            currentUserEmail={session.user.email ?? null}
            currentUserImage={session.user.image ?? null}
            isEditor={isEditor}
          />
          <CopyLinkButton pageId={page.id} />
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
              parentShortId={breadcrumbs[breadcrumbs.length - 1]?.shortId ?? null}
              rootFallbackShortId={rootFallbackShortId}
              iconOnly
            />
          )}
        </div>
      </div>
      </PagePrivacyProvider>

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
