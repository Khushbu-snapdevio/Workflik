import { and, asc, count, desc, eq, ne, or } from "drizzle-orm";
import { BookOpen, ChevronRight, Clock, FileText, LayoutGrid, LayoutTemplate, Plus, Settings, Star, UserPlus, Users } from "lucide-react";
import { PageIcon as SharedPageIcon } from "@/components/pages/page-icon";
import Link from "next/link";

import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  pages,
  userFavorites,
  userRecentlyVisited,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { WorkspaceGreeting } from "@/components/workspace/workspace-greeting";
import { WorkspaceShareButton } from "@/components/workspace/workspace-share-button";
import { HomeFavoritesSection } from "@/components/workspace/home-favorites-section";
import { NewPageButton } from "@/components/workspace/new-page-button";
import { SearchTrigger } from "@/components/search/search-trigger";
import { PRODUCT_NAME } from "@/config/platform";

type Props = { params: Promise<{ workspace: string }> };

export async function generateMetadata({ params }: Props) {
  const { workspace: slug } = await params;
  const [ws] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  return { title: ws?.name ?? "Workspace" };
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7)   return `${days}d ago`;
  if (weeks < 5)  return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PageIcon({ icon, size = "sm" }: { icon: string | null; size?: "sm" | "lg" }) {
  const px = size === "lg" ? 20 : 14;
  if (icon) return <SharedPageIcon icon={icon} size={px} />;
  return <FileText size={px} className="shrink-0 text-muted-foreground-subtle" />;
}

// Deterministic accent per page (same id → same color every time), so tile
// rows read as a set of distinct items instead of one flat gray column —
// same idea as the initials-avatar palette in Rule 26, applied to page tiles.
const CHIP_COLORS = [
  "bg-primary/10",
  "bg-secondary",
  "bg-warning/10",
  "bg-success/10",
  "bg-accent",
];
function chipColorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length];
}

export default async function WorkspacePage({ params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!ws) notFound();

  // Not part of the [pageId] route (which page-only guests are allowed
  // through via getEffectivePermission) — this dashboard queries workspace-
  // wide data unconditionally, so it needs its own membership guard rather
  // than relying solely on WorkspaceLayout's redirect.
  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  const [recentRaw, [{ memberCount }], [{ pageCount }], favRaw, workspacePagesRaw, [{ topPageCount }]] = await Promise.all([
    db
      .select({ id: userRecentlyVisited.id, shortId: pages.shortId, title: pages.title, icon: pages.icon, visitedAt: userRecentlyVisited.visitedAt })
      .from(userRecentlyVisited)
      .innerJoin(pages, eq(pages.id, userRecentlyVisited.pageId))
      .where(and(eq(userRecentlyVisited.userId, session.user.id), eq(userRecentlyVisited.workspaceId, ws.id), eq(pages.isDeleted, false)))
      .orderBy(desc(userRecentlyVisited.visitedAt))
      .limit(10),
    db.select({ memberCount: count() }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.status, "active"))),
    db.select({ pageCount: count() }).from(pages).where(and(
      eq(pages.workspaceId, ws.id),
      eq(pages.isDeleted, false),
      // Other users' private/draft pages don't count toward the workspace total shown to everyone
      or(eq(pages.isPrivate, false), eq(pages.createdBy, session.user.id)),
      or(eq(pages.isDraft, false), eq(pages.createdBy, session.user.id)),
    )),
    db
      .select({ id: userFavorites.id, pageId: pages.id, shortId: pages.shortId, title: pages.title, icon: pages.icon })
      .from(userFavorites)
      .innerJoin(pages, eq(pages.id, userFavorites.pageId))
      .where(and(eq(userFavorites.userId, session.user.id), eq(userFavorites.workspaceId, ws.id), eq(pages.isDeleted, false)))
      .orderBy(asc(userFavorites.orderIndex))
      .limit(6),
    // Only real top-level content (pages + databases) — database entries
    // (kind "entry") are rows inside a database, not standalone pages, so
    // they'd show up here without their parent database for context.
    db
      .select({ id: pages.id, shortId: pages.shortId, title: pages.title, icon: pages.icon, updatedAt: pages.updatedAt })
      .from(pages)
      .where(and(
        eq(pages.workspaceId, ws.id),
        eq(pages.isDeleted, false),
        ne(pages.kind, "entry"),
        or(eq(pages.isPrivate, false), eq(pages.createdBy, session.user.id)),
        or(eq(pages.isDraft, false), eq(pages.createdBy, session.user.id)),
      ))
      .orderBy(desc(pages.updatedAt))
      .limit(8),
    db.select({ topPageCount: count() }).from(pages).where(and(
      eq(pages.workspaceId, ws.id),
      eq(pages.isDeleted, false),
      ne(pages.kind, "entry"),
      or(eq(pages.isPrivate, false), eq(pages.createdBy, session.user.id)),
      or(eq(pages.isDraft, false), eq(pages.createdBy, session.user.id)),
    )),
  ]);

  const recentPages    = recentRaw.map((p) => ({ ...p, visitedAt: p.visitedAt.toISOString() }));
  const favPages       = favRaw;
  const workspacePages = workspacePagesRaw.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }));
  const firstName   = session.user.name?.split(" ")[0] ?? session.user.email.split("@")[0];
  const today       = new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
  const onboardingStepsDone = (pageCount >= 1 ? 1 : 0) + (memberCount > 1 ? 1 : 0);

  return (
    <div className="@container flex h-full flex-col overflow-hidden bg-card">

      {/* ── Topbar ── */}
      <div className="flex h-11 shrink-0 items-center justify-between bg-card px-3">
        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-xs">
          <span className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-foreground">
            <LayoutGrid size={13} className="shrink-0 text-primary" />
            <span className="truncate font-semibold">{ws.name}</span>
          </span>
          <span className="hidden text-border sm:inline">·</span>
          <span className="hidden px-1 text-muted-foreground sm:inline">{today}</span>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block"><SearchTrigger /></div>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="hidden sm:block"><WorkspaceShareButton workspaceId={ws.id} workspaceSlug={slug} workspaceName={ws.name ?? ws.id} /></div>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <NewPageButton
            workspaceId={ws.id}
            workspaceSlug={slug}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:opacity-70"
          >
            <Plus size={13} strokeWidth={2.5} />
            New page
          </NewPageButton>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto bg-card">

        {/* ── Hero card: greeting + stat strip in one unit ── */}
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card">
            <div className="bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary text-xl font-bold text-primary-foreground select-none">
                  {(ws.name ?? "W").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold tracking-tight text-foreground leading-snug">
                    <WorkspaceGreeting firstName={firstName} />
                  </h1>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{ws.name} · {today}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
              <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                  <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none text-foreground">{pageCount}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">Page{pageCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-secondary">
                  <Users size={16} className="text-secondary-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none text-foreground">{memberCount}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">Member{memberCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-warning/10">
                  <Star size={15} className="text-warning" fill="currentColor" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none text-foreground">{favPages.length}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">Starred</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content — single full-width column ── */}
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">

            {/* Quick actions — bento tile row, replaces the old narrow sidebar list */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Quick actions</h2>
              <div className="grid grid-cols-2 gap-3 @[640px]:grid-cols-3 @[1024px]:grid-cols-5">
                <NewPageButton
                  workspaceId={ws.id}
                  workspaceSlug={slug}
                  className="group flex flex-col items-center gap-2.5 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-5 text-center transition-all duration-150 hover:border-primary/30 hover:bg-primary/5 disabled:opacity-60"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
                    <Plus size={18} />
                  </span>
                  <span className="text-xs font-semibold text-foreground">New page</span>
                </NewPageButton>
                {([
                  { label: "Library",        href: `/app/${slug}/library`,          iconBg: "bg-secondary",     icon: <BookOpen size={18} className="text-secondary-foreground" /> },
                  { label: "Templates",      href: `/app/${slug}/templates`,        iconBg: "bg-warning/10",    icon: <LayoutTemplate size={18} className="text-warning" /> },
                  { label: "Settings",       href: `/app/${slug}/settings`,         iconBg: "bg-muted",         icon: <Settings size={18} className="text-muted-foreground" /> },
                  { label: "Invite members", href: `/app/${slug}/settings/members`, iconBg: "bg-success/10",    icon: <UserPlus size={18} className="text-success" /> },
                ] as const).map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group flex flex-col items-center gap-2.5 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-5 text-center transition-all duration-150 hover:border-primary/30 hover:bg-primary/5"
                  >
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${action.iconBg}`}>
                      {action.icon}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{action.label}</span>
                  </Link>
                ))}
              </div>
            </section>

              {/* Jump back in — grid cards */}
              {recentPages.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground-subtle shrink-0" />
                      <h2 className="text-sm font-semibold text-foreground">Jump back in</h2>
                      <span className="rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">{recentPages.length}</span>
                    </div>
                    <Link href={`/app/${slug}/library`} className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
                      View all <ChevronRight size={12} />
                    </Link>
                  </div>
                  {/* Framed in a subtly tinted outer container, full width to
                      match the sections above/below. Fixed 5-column grid +
                      capping at 5 tiles (below) means every cell is always
                      filled — no wrapped, half-empty row inside the frame. */}
                  <div className="grid grid-cols-5 gap-3 rounded-[var(--radius-lg)] border border-border bg-muted/20 p-3">
                    {recentPages.slice(0, 5).map((page) => (
                      <Link
                        key={page.id}
                        href={`/app/${slug}/${page.shortId}`}
                        className="group flex min-w-0 flex-col gap-3 overflow-hidden rounded-[var(--radius-md)] border border-border bg-card p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                      >
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors duration-150 ${chipColorFor(page.id)}`}>
                          <PageIcon icon={page.icon} size="lg" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground leading-snug transition-colors duration-150 group-hover:text-primary">
                            {page.title || "Untitled"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground-subtle">{timeAgo(page.visitedAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* No recent pages — only show for returning users who haven't visited pages yet */}
              {recentPages.length === 0 && pageCount > 0 && (
                <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-muted/20 px-5 py-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted">
                    <Clock size={18} className="text-muted-foreground-subtle" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">No pages visited yet</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Pages you open will appear here for quick access.</p>
                  </div>
                  <Link href={`/app/${slug}/library`} className="ml-auto shrink-0 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
                    Browse library <ChevronRight size={12} />
                  </Link>
                </div>
              )}

              {/* Favorites */}
              {favPages.length > 0 && (
                <HomeFavoritesSection
                  pages={favPages}
                  workspaceSlug={slug}
                  workspaceId={ws.id}
                />
              )}

              {/* ── First-time onboarding ──
                   Every fresh workspace starts with one auto-created default
                   page (blank or from the onboarding template choice), so
                   gating this on pageCount === 0 hid it immediately for every
                   new user. Gate on <= 1 instead, and reflect step 1 as done
                   once that default page exists. */}
              {pageCount <= 1 && (
                <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card">

                  {/* Welcome header */}
                  <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10">
                        <svg className="size-5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold text-foreground">Welcome to {PRODUCT_NAME}!</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">Complete these steps to set up your workspace.</p>
                      </div>
                      <span className="shrink-0 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        {onboardingStepsDone} / 3 done
                      </span>
                    </div>
                    <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                        style={{ width: `${(onboardingStepsDone / 3) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="divide-y divide-border">

                    {/* Step 1 — Create first page */}
                    <div className={`flex items-center gap-4 px-6 py-4 transition-colors duration-150 ${pageCount >= 1 ? "opacity-50" : "hover:bg-accent/30"}`}>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                        {pageCount >= 1 ? (
                          <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                        ) : (
                          <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${pageCount >= 1 ? "text-muted-foreground line-through" : "text-foreground"}`}>Create your first page</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Start with a blank page, a database, or a template.</p>
                      </div>
                      {pageCount >= 1 ? (
                        <span className="shrink-0 rounded-[var(--radius-xs)] bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Done</span>
                      ) : (
                        <NewPageButton
                          workspaceId={ws.id}
                          workspaceSlug={slug}
                          className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:opacity-70"
                        >
                          <Plus size={12} strokeWidth={2.5} /> New page
                        </NewPageButton>
                      )}
                    </div>

                    {/* Step 2 — Templates */}
                    <div className="px-6 py-4 hover:bg-accent/30 transition-colors duration-150">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-warning/10">
                          <svg className="size-4 text-warning" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">Start from a template</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">16+ ready-to-use templates for any workflow.</p>
                        </div>
                        <Link
                          href={`/app/${slug}/templates`}
                          className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          View all <ChevronRight size={11} />
                        </Link>
                      </div>
                      {/* Mini template previews — labels are real template
                          names so the link can deep-link straight to that
                          template's preview, not just the generic gallery. */}
                      <div className="grid grid-cols-4 gap-2 pl-[52px]">
                        {([
                          { emoji: "📋", label: "Projects" },
                          { emoji: "📝", label: "Meeting Notes" },
                          { emoji: "✅", label: "Tasks Tracker" },
                          { emoji: "📅", label: "Content Calendar" },
                        ] as const).map((t) => (
                          <Link
                            key={t.label}
                            href={`/app/${slug}/templates?open=${encodeURIComponent(t.label)}`}
                            className="group flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-muted/30 px-2.5 py-2 transition-all duration-150 hover:border-primary/20 hover:bg-card"
                          >
                            <span className="text-base leading-none">{t.emoji}</span>
                            <span className="truncate text-xs font-medium text-foreground">{t.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Step 3 — Invite team */}
                    <div className={`flex items-center gap-4 px-6 py-4 transition-colors duration-150 ${memberCount > 1 ? "opacity-50" : "hover:bg-accent/30"}`}>
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${memberCount > 1 ? "bg-primary/10" : "bg-success/10"}`}>
                        {memberCount > 1 ? (
                          <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                        ) : (
                          <svg className="size-4 text-success" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${memberCount > 1 ? "text-muted-foreground line-through" : "text-foreground"}`}>Invite your team</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Collaborate in real-time with teammates.</p>
                      </div>
                      {memberCount > 1 ? (
                        <span className="shrink-0 rounded-[var(--radius-xs)] bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Done</span>
                      ) : (
                        <Link
                          href={`/app/${slug}/settings/members`}
                          className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          Invite members <ChevronRight size={11} />
                        </Link>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* All Pages — inline list of real pages, not just a link out */}
              {topPageCount > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-muted-foreground-subtle shrink-0" />
                      <h2 className="text-sm font-semibold text-foreground">All Pages</h2>
                      <span className="rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">{topPageCount}</span>
                    </div>
                    <Link href={`/app/${slug}/library`} className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
                      View all <ChevronRight size={12} />
                    </Link>
                  </div>
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                    <div className="divide-y divide-border">
                      {workspacePages.map((page) => (
                        <Link
                          key={page.id}
                          href={`/app/${slug}/${page.shortId}`}
                          className="group flex items-center gap-3 border-l-2 border-l-transparent px-5 py-3 transition-all duration-150 hover:border-l-primary hover:bg-primary/5"
                        >
                          <div className={`flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 ${chipColorFor(page.id)}`}>
                            <PageIcon icon={page.icon} />
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{page.title || "Untitled"}</p>
                          <p className="shrink-0 text-xs text-muted-foreground-subtle">{timeAgo(page.updatedAt)}</p>
                          <ChevronRight size={14} className="shrink-0 text-muted-foreground-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      ))}
                    </div>
                    {topPageCount > workspacePages.length && (
                      <Link
                        href={`/app/${slug}/library`}
                        className="flex items-center justify-center gap-1 border-t border-border bg-muted/10 py-2.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                      >
                        View all {topPageCount} pages <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </section>
              )}

            {/* What's included — shown only for first-time users, bento style to match Quick actions */}
            {pageCount === 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-foreground">What&apos;s included</h2>
                <div className="grid grid-cols-2 gap-3 @[640px]:grid-cols-4">
                  {([
                    { iconBg: "bg-primary/10", icon: <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: "Pages & docs", desc: "Rich text editor" },
                    { iconBg: "bg-secondary", icon: <svg className="size-4 text-secondary-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>, label: "Databases", desc: "Tables, boards, calendars" },
                    { iconBg: "bg-warning/10", icon: <svg className="size-4 text-warning" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, label: "Templates", desc: "16+ ready-to-use" },
                    { iconBg: "bg-success/10", icon: <svg className="size-4 text-success" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, label: "Team collaboration", desc: "Members & sharing" },
                  ] as const).map((f) => (
                    <div key={f.label} className="flex flex-col items-center gap-2.5 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-5 text-center">
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${f.iconBg}`}>{f.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{f.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
