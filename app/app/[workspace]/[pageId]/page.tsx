import { and, asc, eq, gt } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { pageClosure, pages, userRecentlyVisited, workspaces } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { PageClient } from "@/components/pages/page-client";
import { PageActionsMenu } from "@/components/pages/page-actions-menu";
import { TrashBanner } from "@/components/pages/trash-banner";
import { DatabasePage } from "@/components/database/database-page";

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

  // Resolve workspace
  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) notFound();

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  // Resolve page by shortId
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.shortId, shortId), eq(pages.workspaceId, ws.id)))
    .limit(1);

  if (!page) notFound();

  // Record visit (fire-and-forget — do not block render)
  db.insert(userRecentlyVisited)
    .values({ userId: session.user.id, workspaceId: ws.id, pageId: page.id })
    .onConflictDoUpdate({
      target: [userRecentlyVisited.userId, userRecentlyVisited.pageId],
      set: { visitedAt: new Date() },
    })
    .catch(() => {});

  // Build breadcrumbs — get all ancestors ordered by depth descending (root first)
  const ancestorRows = await db
    .select({ id: pages.id, shortId: pages.shortId, title: pages.title, depth: pageClosure.depth })
    .from(pageClosure)
    .innerJoin(pages, eq(pages.id, pageClosure.ancestorId))
    .where(and(eq(pageClosure.descendantId, page.id), gt(pageClosure.depth, 0)))
    .orderBy(asc(pageClosure.depth));

  const breadcrumbs = ancestorRows
    .sort((a, b) => b.depth - a.depth)
    .map((r) => ({ id: r.id, shortId: r.shortId, title: r.title || "Untitled" }));

  const isEditor = member.role === "admin" || member.role === "editor";

  // Status banners — TrashBanner is a client component (has restore + delete actions)
  const statusBanner = (
    <>
      {page.isDeleted && (
        <TrashBanner pageId={page.id} workspaceSlug={slug} />
      )}
      {page.isLocked && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          This page is <strong className="ml-1">locked</strong> — editing is disabled.
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background" data-page-id={page.id}>

      {/* ── Top bar: breadcrumbs + actions ── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm">
        <nav className="flex min-w-0 items-center gap-0.5 text-xs">
          <a
            href={`/app/${slug}`}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="font-medium">{ws.name}</span>
          </a>

          {breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-0.5">
              <svg className="size-3 shrink-0 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <a
                href={`/app/${slug}/${crumb.shortId}`}
                className="max-w-[120px] truncate rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {crumb.title || "Untitled"}
              </a>
            </span>
          ))}

          <span className="flex items-center gap-0.5">
            <svg className="size-3 shrink-0 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span className="max-w-[200px] truncate rounded-md px-2 py-1.5 font-medium text-foreground/80">
              {page.title || "Untitled"}
            </span>
          </span>
        </nav>

        {isEditor && (
          <div className="ml-3 shrink-0">
            <PageActionsMenu
              pageId={page.id}
              isLocked={page.isLocked}
              isDeleted={page.isDeleted}
              workspaceSlug={slug}
              pageShortId={page.shortId}
              pageKind={page.kind}
            />
          </div>
        )}
      </div>

      {/* ── Content area — database vs regular page ── */}
      {page.kind === "database" ? (
        <DatabasePage
          databaseId={page.id}
          workspaceId={ws.id}
          workspaceSlug={slug}
          isEditor={isEditor}
          initialTitle={page.title}
          initialIcon={page.icon}
          isLocked={page.isLocked}
          isDeleted={page.isDeleted}
          pageShortId={page.shortId}
        />
      ) : (
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
        />
      )}
    </div>
  );
}
