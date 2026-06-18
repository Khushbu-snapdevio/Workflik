import { and, asc, eq, gt } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { pageClosure, pages, userRecentlyVisited, workspaces } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { PageHeader } from "@/components/pages/page-header";
import { PageActionsMenu } from "@/components/pages/page-actions-menu";
import { TrashBanner } from "@/components/pages/trash-banner";
import { PageEditor } from "@/components/editor/editor";

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

  // Reverse so root is first: depth 5 ancestor, depth 4, ..., depth 1 = direct parent
  const breadcrumbs = ancestorRows
    .sort((a, b) => b.depth - a.depth)
    .map((r) => ({ id: r.id, shortId: r.shortId, title: r.title || "Untitled" }));

  const isEditor = member.role === "admin" || member.role === "editor";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background" data-page-id={page.id}>

      {/* ── Top bar: breadcrumbs + actions ── */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-5">
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <a href={`/app/${slug}`} className="flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-accent hover:text-foreground">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {ws.name}
          </a>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <span className="text-muted-foreground/30">/</span>
              <a href={`/app/${slug}/${crumb.shortId}`} className="rounded px-1.5 py-1 transition-colors hover:bg-accent hover:text-foreground truncate max-w-[140px]">
                {crumb.title || "Untitled"}
              </a>
            </span>
          ))}
          <span className="text-muted-foreground/30">/</span>
          <span className="truncate max-w-[180px] px-1.5 py-1 font-medium text-foreground/70">
            {page.title || "Untitled"}
          </span>
        </nav>

        {isEditor && (
          <PageActionsMenu
            pageId={page.id}
            isLocked={page.isLocked}
            isDeleted={page.isDeleted}
            workspaceSlug={slug}
            pageShortId={page.shortId}
          />
        )}
      </div>

      {/* ── Cover image ── */}
      {page.coverUrl && (
        <div
          className="h-48 w-full shrink-0 bg-muted"
          style={{ backgroundImage: `url(${page.coverUrl})`, backgroundSize: "cover", backgroundPosition: `center ${(page.coverPosition ?? 0.5) * 100}%` }}
        />
      )}

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className={`group/page mx-auto pb-32 pt-12 ${page.isFullWidth ? "px-10 max-w-full" : "px-16 max-w-[760px]"}`}>

          {/* Status banners */}
          {page.isDeleted && (
            <TrashBanner pageId={page.id} workspaceSlug={slug} />
          )}
          {page.isLocked && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              This page is <strong className="ml-1">locked</strong> — editing is disabled.
            </div>
          )}

          {/* Icon + Title */}
          <PageHeader
            pageId={page.id}
            shortId={page.shortId}
            initialTitle={page.title}
            initialIcon={page.icon}
            initialCoverUrl={page.coverUrl}
            isLocked={page.isLocked}
            isDeleted={page.isDeleted}
            isEditor={isEditor}
            workspaceSlug={slug}
            fontFamily={page.fontFamily}
            isSmallText={page.isSmallText}
            isFullWidth={page.isFullWidth}
          />

          {/* Block editor */}
          <div className="mt-6">
            <PageEditor
              pageId={page.id}
              isLocked={page.isLocked}
              isDeleted={page.isDeleted}
              isEditor={isEditor}
              fontFamily={page.fontFamily}
              isSmallText={page.isSmallText}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
