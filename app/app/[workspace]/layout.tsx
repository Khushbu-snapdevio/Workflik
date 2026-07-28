import { and, asc, desc, eq, ne, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { SearchProvider } from "@/components/search/search-provider";
import { Toaster } from "@/components/ui/sonner";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { HintProvider } from "@/components/onboarding/hint-provider";
import { TooltipTour } from "@/components/onboarding/tooltip-tour";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { pages, userFavorites, userHintStates, userPreferences, userRecentlyVisited, users, workspaces } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { ADMIN_ROLE } from "@/config/platform";

type Props = {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
};

export default async function WorkspaceLayout({ children, params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) {
    notFound();
  }

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) {
    redirect("/platform/post-auth");
  }

  const [
    [freshUser],
    dismissedHintsRows,
    initialPages,
    initialPrivateEntries,
    initialFavorites,
    initialRecentlyVisited,
    [prefs],
  ] = await Promise.all([
    db
      .select({ role: users.role, tourCompleted: users.tourCompleted, image: users.image, name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    db
      .select({ hintKey: userHintStates.hintKey })
      .from(userHintStates)
      .where(eq(userHintStates.userId, session.user.id)),
    db
      .select({
        id:         pages.id,
        shortId:    pages.shortId,
        parentId:   pages.parentId,
        title:      pages.title,
        icon:       pages.icon,
        orderIndex: pages.orderIndex,
        kind:       pages.kind,
        isPrivate:  pages.isPrivate,
        isDraft:    pages.isDraft,
      })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, ws.id),
          eq(pages.isDeleted, false),
          ne(pages.kind, "entry"),
          or(eq(pages.isPrivate, false), eq(pages.createdBy, session.user.id)),
          or(eq(pages.isDraft, false), eq(pages.createdBy, session.user.id))
        )
      )
      .orderBy(pages.orderIndex),
    // Database entries are excluded from the query above (too numerous to
    // show in the general page tree), but a private entry the current user
    // created should still surface somewhere — the sidebar's Private section
    // specifically, not the tree/Favorites/Recently-Visited. Scoped to
    // isPrivate + own-created to keep this small (never "all entries").
    db
      .select({
        id:         pages.id,
        shortId:    pages.shortId,
        parentId:   pages.parentId,
        title:      pages.title,
        icon:       pages.icon,
        orderIndex: pages.orderIndex,
        kind:       pages.kind,
        isPrivate:  pages.isPrivate,
        isDraft:    pages.isDraft,
      })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, ws.id),
          eq(pages.isDeleted, false),
          eq(pages.kind, "entry"),
          eq(pages.isPrivate, true),
          eq(pages.createdBy, session.user.id)
        )
      )
      .orderBy(pages.orderIndex),
    db
      // Join the page so favorites carry title/icon/shortId even when the page
      // isn't in the sidebar tree (database entries, etc.); otherwise those
      // render as "Untitled" with a broken link. Matches the GET in
      // app/api/user/favorites/route.ts.
      .select({
        id:         userFavorites.id,
        pageId:     userFavorites.pageId,
        orderIndex: userFavorites.orderIndex,
        title:      pages.title,
        icon:       pages.icon,
        shortId:    pages.shortId,
      })
      .from(userFavorites)
      .leftJoin(pages, eq(userFavorites.pageId, pages.id))
      .where(
        and(
          eq(userFavorites.userId, session.user.id),
          eq(userFavorites.workspaceId, ws.id)
        )
      )
      .orderBy(asc(userFavorites.orderIndex)),
    db
      .select({
        id:        userRecentlyVisited.id,
        pageId:    userRecentlyVisited.pageId,
        visitedAt: userRecentlyVisited.visitedAt,
      })
      .from(userRecentlyVisited)
      .where(
        and(
          eq(userRecentlyVisited.userId, session.user.id),
          eq(userRecentlyVisited.workspaceId, ws.id)
        )
      )
      .orderBy(desc(userRecentlyVisited.visitedAt))
      .limit(10),
    db
      .select({
        sidebarWidth:     userPreferences.sidebarWidth,
        sidebarCollapsed: userPreferences.sidebarCollapsed,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1),
  ]);

  const dismissedHints = dismissedHintsRows.map((r) => r.hintKey);

  // Serialize Date objects for RSC → client component boundary
  const recentlyVisitedSerialized = initialRecentlyVisited.map((r) => ({
    ...r,
    visitedAt: r.visitedAt.toISOString(),
  }));

  // Track last active workspace for post-login redirect (fire-and-forget upsert)
  db.insert(userPreferences)
    .values({ userId: session.user.id, lastWorkspaceId: ws.id })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { lastWorkspaceId: ws.id, updatedAt: new Date() },
    })
    .catch(() => {});

  return (
    <SearchProvider workspaceSlug={ws.slug} workspaceId={ws.id}>
      <NotificationProvider workspaceId={ws.id} workspaceSlug={ws.slug} currentUserId={session.user.id}>
        <HintProvider dismissed={dismissedHints}>
          <WorkspaceShell
            sidebar={
              <Sidebar
                isAdmin={freshUser?.role === ADMIN_ROLE}
                userEmail={session.user.email}
                initialUserName={freshUser?.name ?? null}
                initialUserImage={freshUser?.image ?? null}
                workspaceId={ws.id}
                workspaceSlug={ws.slug}
                initialPages={initialPages}
                initialPrivateEntries={initialPrivateEntries}
                initialFavorites={initialFavorites}
                initialRecentlyVisited={recentlyVisitedSerialized}
                initialSidebarWidth={prefs?.sidebarWidth || 280}
                initialSidebarCollapsed={prefs?.sidebarCollapsed ?? false}
              />
            }
          >
            <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
          </WorkspaceShell>
          <TooltipTour tourCompleted={freshUser?.tourCompleted ?? true} />
        </HintProvider>
      </NotificationProvider>
      <Toaster position="bottom-right" closeButton={false} />
    </SearchProvider>
  );
}
