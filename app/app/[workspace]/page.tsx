import { and, asc, count, desc, eq } from "drizzle-orm";
import { BookOpen, ChevronRight, Clock, FileText, LayoutGrid, Plus, Star, Users } from "lucide-react";
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
  return <FileText size={px} className="shrink-0 text-muted-foreground/40" />;
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

  const [recentRaw, [{ memberCount }], [{ pageCount }], favRaw] = await Promise.all([
    db
      .select({ id: userRecentlyVisited.id, shortId: pages.shortId, title: pages.title, icon: pages.icon, visitedAt: userRecentlyVisited.visitedAt })
      .from(userRecentlyVisited)
      .innerJoin(pages, eq(pages.id, userRecentlyVisited.pageId))
      .where(and(eq(userRecentlyVisited.userId, session.user.id), eq(userRecentlyVisited.workspaceId, ws.id), eq(pages.isDeleted, false)))
      .orderBy(desc(userRecentlyVisited.visitedAt))
      .limit(8),
    db.select({ memberCount: count() }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.status, "active"))),
    db.select({ pageCount: count() }).from(pages).where(and(eq(pages.workspaceId, ws.id), eq(pages.isDeleted, false))),
    db
      .select({ id: userFavorites.id, pageId: pages.id, shortId: pages.shortId, title: pages.title, icon: pages.icon })
      .from(userFavorites)
      .innerJoin(pages, eq(pages.id, userFavorites.pageId))
      .where(and(eq(userFavorites.userId, session.user.id), eq(userFavorites.workspaceId, ws.id), eq(pages.isDeleted, false)))
      .orderBy(asc(userFavorites.orderIndex))
      .limit(6),
  ]);

  const recentPages = recentRaw.map((p) => ({ ...p, visitedAt: p.visitedAt.toISOString() }));
  const favPages    = favRaw;
  const firstName   = session.user.name?.split(" ")[0] ?? session.user.email.split("@")[0];
  const today       = new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">

      {/* ── Topbar ── */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-card px-3">
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
          <div className="hidden h-5 w-px bg-border/60 sm:block" />
          <div className="hidden sm:block"><WorkspaceShareButton workspaceSlug={slug} workspaceName={ws.name ?? ws.id} /></div>
          <div className="hidden h-5 w-px bg-border/60 sm:block" />
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
      <div className="flex-1 overflow-y-auto">

        {/* ── Hero greeting banner ── */}
        <div className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="flex items-center gap-5">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-primary text-2xl font-bold text-primary-foreground select-none ring-4 ring-primary/15 ring-offset-2 ring-offset-background">
                {(ws.name ?? "W").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground leading-snug">
                  <WorkspaceGreeting firstName={firstName} />
                </h1>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span className="font-semibold text-foreground">{pageCount}</span> page{pageCount !== 1 ? "s" : ""}
                  </span>
                  <span className="size-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users size={13} className="shrink-0" />
                    <span className="font-semibold text-foreground">{memberCount}</span> member{memberCount !== 1 ? "s" : ""}
                  </span>
                  {favPages.length > 0 && (
                    <>
                      <span className="size-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Star size={13} className="text-warning shrink-0" fill="currentColor" />
                        <span className="font-semibold text-foreground">{favPages.length}</span> favorited
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content grid ── */}
        <div className="mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-[1fr_260px]">

            {/* ── Left column ── */}
            <div className="flex flex-col gap-6">

              {/* Jump back in — grid cards */}
              {recentPages.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground/50 shrink-0" />
                      <h2 className="text-sm font-semibold text-foreground">Jump back in</h2>
                      <span className="rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">{recentPages.length}</span>
                    </div>
                    <Link href={`/app/${slug}/library`} className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
                      View all <ChevronRight size={12} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                    {recentPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/app/${slug}/${page.shortId}`}
                        className="group flex flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-border border-l-2 border-l-transparent bg-card p-4 transition-all duration-150 hover:border-l-primary hover:bg-primary/5"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted transition-colors duration-150 group-hover:bg-background">
                          <PageIcon icon={page.icon} size="lg" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground leading-snug">
                            {page.title || "Untitled"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground/50">{timeAgo(page.visitedAt)}</p>
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
                    <Clock size={18} className="text-muted-foreground/40" />
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

              {/* ── First-time onboarding (pageCount === 0) ── */}
              {pageCount === 0 && (
                <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card">

                  {/* Welcome header */}
                  <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-6 py-5">
                    <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-primary/5" />
                    <div className="relative flex items-center gap-4">
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
                        {memberCount > 1 ? "2" : "0"} / 3 done
                      </span>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="divide-y divide-border/40">

                    {/* Step 1 — Create first page */}
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors duration-150">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                        <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">Create your first page</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Start with a blank page, a database, or a template.</p>
                      </div>
                      <NewPageButton
                        workspaceId={ws.id}
                        workspaceSlug={slug}
                        className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:opacity-70"
                      >
                        <Plus size={12} strokeWidth={2.5} /> New page
                      </NewPageButton>
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
                      {/* Mini template previews */}
                      <div className="grid grid-cols-4 gap-2 pl-[52px]">
                        {([
                          { emoji: "📋", label: "Project tracker" },
                          { emoji: "📝", label: "Meeting notes" },
                          { emoji: "✅", label: "Task list" },
                          { emoji: "📅", label: "Weekly planner" },
                        ] as const).map((t) => (
                          <Link
                            key={t.label}
                            href={`/app/${slug}/templates`}
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

              {/* All Pages */}
              {pageCount > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={14} className="text-muted-foreground/50 shrink-0" />
                    <h2 className="text-sm font-semibold text-foreground">All Pages</h2>
                    <span className="rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">{pageCount}</span>
                  </div>
                  <Link
                    href={`/app/${slug}/library`}
                    className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-border border-l-2 border-l-transparent bg-card px-5 py-4 transition-all duration-150 hover:border-l-primary hover:bg-primary/5"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted transition-colors duration-150 group-hover:bg-background">
                      <BookOpen size={18} className="text-muted-foreground/50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">Open Library</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Browse, search and manage all {pageCount} pages</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                  </Link>
                </section>
              )}

            </div>

            {/* ── Right column ── */}
            <div className="flex flex-col gap-4">

              {/* Workspace stats — 3-up grid (only when workspace has pages) */}
              {pageCount > 0 && (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                  <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Overview</p>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border/40">
                    <div className="flex flex-col items-center justify-center gap-1.5 px-2 py-4">
                      <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span className="text-2xl font-bold text-foreground leading-none">{pageCount}</span>
                      <span className="text-xs font-medium text-muted-foreground">Pages</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 px-2 py-4">
                      <Users size={16} className="text-secondary-foreground" />
                      <span className="text-2xl font-bold text-foreground leading-none">{memberCount}</span>
                      <span className="text-xs font-medium text-muted-foreground">Members</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 px-2 py-4">
                      <Star size={14} className="text-warning" fill="currentColor" />
                      <span className="text-2xl font-bold text-foreground leading-none">{favPages.length}</span>
                      <span className="text-xs font-medium text-muted-foreground">Starred</span>
                    </div>
                  </div>
                </div>
              )}

              {/* What's included — shown only for first-time users */}
              {pageCount === 0 && (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                  <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">What&apos;s included</p>
                  </div>
                  <div className="divide-y divide-border/40">
                    {([
                      { iconBg: "bg-primary/10", icon: <svg className="size-3.5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: "Pages & docs", desc: "Rich text editor" },
                      { iconBg: "bg-secondary", icon: <svg className="size-3.5 text-secondary-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>, label: "Databases", desc: "Tables, boards, calendars" },
                      { iconBg: "bg-warning/10", icon: <svg className="size-3.5 text-warning" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, label: "Templates", desc: "16+ ready-to-use" },
                      { iconBg: "bg-success/10", icon: <svg className="size-3.5 text-success" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, label: "Team collaboration", desc: "Members & sharing" },
                    ] as const).map((f) => (
                      <div key={f.label} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${f.iconBg}`}>{f.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{f.label}</p>
                          <p className="text-xs text-muted-foreground/60">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Quick actions</p>
                </div>
                <div className="divide-y divide-border/40">
                  <NewPageButton
                    workspaceId={ws.id}
                    workspaceSlug={slug}
                    className="group/qa flex w-full items-center gap-2.5 border-l-2 border-l-transparent px-4 py-3 text-left transition-all duration-150 hover:border-l-primary hover:bg-primary/5 disabled:opacity-60"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary">
                      <Plus size={13} />
                    </span>
                    <span className="text-xs font-medium text-foreground group-hover/qa:text-foreground">New page</span>
                    <ChevronRight size={12} className="ml-auto shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/qa:opacity-100" />
                  </NewPageButton>
                  {([
                    {
                      label: "Library",
                      href: `/app/${slug}/library`,
                      iconBg: "bg-secondary",
                      icon: <svg className="size-3.5 text-secondary-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
                    },
                    {
                      label: "Templates",
                      href: `/app/${slug}/templates`,
                      iconBg: "bg-warning/10",
                      icon: <svg className="size-3.5 text-warning" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
                    },
                    {
                      label: "Settings",
                      href: `/app/${slug}/settings`,
                      iconBg: "bg-muted",
                      icon: <svg className="size-3.5 text-muted-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
                    },
                    {
                      label: "Invite members",
                      href: `/app/${slug}/settings/members`,
                      iconBg: "bg-success/10",
                      icon: <svg className="size-3.5 text-success" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>,
                    },
                  ] as const).map((action) => (
                    <Link key={action.label} href={action.href}
                      className="group/qa flex items-center gap-2.5 border-l-2 border-l-transparent px-4 py-3 transition-all duration-150 hover:border-l-primary hover:bg-primary/5">
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${action.iconBg}`}>
                        {action.icon}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground group-hover/qa:text-foreground">{action.label}</span>
                      <ChevronRight size={12} className="ml-auto shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/qa:opacity-100" />
                    </Link>
                  ))}
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
