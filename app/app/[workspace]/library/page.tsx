import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  pages,
  userFavorites,
  userRecentlyVisited,
  users,
  workspaces,
} from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { LibraryClient } from "./library-client";

type Props = { params: Promise<{ workspace: string }> };

export const metadata = { title: "Library" };

export default async function LibraryPage({ params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!ws) notFound();

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  // All non-deleted, non-entry pages in workspace
  const allPages = await db
    .select({
      id:           pages.id,
      shortId:      pages.shortId,
      title:        pages.title,
      icon:         pages.icon,
      kind:         pages.kind,
      isPrivate:    pages.isPrivate,
      createdBy:    pages.createdBy,
      lastEditedBy: pages.lastEditedBy,
      createdAt:    pages.createdAt,
      updatedAt:    pages.updatedAt,
    })
    .from(pages)
    .where(
      and(
        eq(pages.workspaceId, ws.id),
        eq(pages.isDeleted, false),
      ),
    )
    .orderBy(desc(pages.updatedAt));

  // Fetch user names for created-by
  const creatorIds = [...new Set(allPages.flatMap((p) => [p.createdBy, p.lastEditedBy].filter(Boolean) as string[]))];
  const userRows = creatorIds.length > 0
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, creatorIds))
    : [];
  const usersMap = Object.fromEntries(userRows.map((u) => [u.id, u.name ?? u.email]));

  // Recently visited
  const recentRows = await db
    .select({ pageId: userRecentlyVisited.pageId, visitedAt: userRecentlyVisited.visitedAt })
    .from(userRecentlyVisited)
    .where(and(eq(userRecentlyVisited.userId, session.user.id), eq(userRecentlyVisited.workspaceId, ws.id)))
    .orderBy(desc(userRecentlyVisited.visitedAt))
    .limit(50);
  const recentPageIds = new Set(recentRows.map((r) => r.pageId));
  const visitedAtMap = Object.fromEntries(recentRows.map((r) => [r.pageId, r.visitedAt.toISOString()]));

  // Favorites
  const favRows = await db
    .select({ pageId: userFavorites.pageId })
    .from(userFavorites)
    .where(and(eq(userFavorites.userId, session.user.id), eq(userFavorites.workspaceId, ws.id)));
  const favPageIds = new Set(favRows.map((f) => f.pageId));

  const enriched = allPages.map((p) => ({
    ...p,
    createdAt:   p.createdAt.toISOString(),
    updatedAt:   p.updatedAt.toISOString(),
    creatorName:  p.createdBy ? (usersMap[p.createdBy] ?? "Unknown") : "—",
    visitedAt:   visitedAtMap[p.id] ?? null,
    isRecent:    recentPageIds.has(p.id),
    isFavorited: favPageIds.has(p.id),
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm">
        <nav className="flex items-center gap-0.5 text-xs">
          <Link
            href={`/app/${slug}`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="font-medium">{ws.name}</span>
          </Link>
          <svg className="size-3 shrink-0 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="px-2 py-1.5 font-medium text-foreground/80">Library</span>
        </nav>
        <Link
          href={`/app/${slug}/new`}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New page
        </Link>
      </div>

      <LibraryClient pages={enriched} workspaceSlug={slug} />
    </div>
  );
}
