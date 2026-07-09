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
    redirect("/auth/login");
  }

  const [
    [freshUser],
    dismissedHintsRows,
    initialPages,
    initialFavorites,
    initialRecentlyVisited,
    [prefs],
  ] = await Promise.all([
    db
      .select({ role: users.role, tourCompleted: users.tourCompleted, image: users.image })
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
      })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, ws.id),
          eq(pages.isDeleted, false),
          ne(pages.kind, "entry"),
          or(eq(pages.isPrivate, false), eq(pages.createdBy, session.user.id))
        )
      )
      .orderBy(pages.orderIndex),
    db
      .select({
        id:         userFavorites.id,
        pageId:     userFavorites.pageId,
        orderIndex: userFavorites.orderIndex,
      })
      .from(userFavorites)
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
      <NotificationProvider workspaceId={ws.id} workspaceSlug={ws.slug}>
        <HintProvider dismissed={dismissedHints}>
          <WorkspaceShell
            sidebar={
              <Sidebar
                isAdmin={freshUser?.role === ADMIN_ROLE}
                userEmail={session.user.email}
                initialUserImage={freshUser?.image ?? null}
                workspaceId={ws.id}
                workspaceSlug={ws.slug}
                initialPages={initialPages}
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
