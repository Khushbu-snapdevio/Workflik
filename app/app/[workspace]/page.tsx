import { and, asc, count, desc, eq } from "drizzle-orm";
import { BookOpen, ChevronRight, Clock, LayoutGrid, Plus, Star, Users } from "lucide-react";
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
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function PageIcon({ icon, size = "sm" }: { icon: string | null; size?: "sm" | "lg" }) {
  if (icon) return <span className={size === "lg" ? "text-xl leading-none" : "text-sm leading-none"}>{icon}</span>;
  return (
    <svg
      className={size === "lg" ? "size-5 text-muted-foreground/50" : "size-3.5 text-muted-foreground/40"}
      fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
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
      .select({ id: userFavorites.id, shortId: pages.shortId, title: pages.title, icon: pages.icon })
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
        <nav className="flex min-w-0 items-center gap-0.5 text-xs">
          <span className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-muted-foreground">
            <LayoutGrid size={13} className="shrink-0" />
            <span className="font-medium">{ws.name}</span>
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="px-1 text-muted-foreground">{today}</span>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <SearchTrigger />
          <div className="h-5 w-px bg-border/60" />
          <WorkspaceShareButton workspaceSlug={slug} workspaceName={ws.name ?? ws.id} />
          <NewPageButton
            workspaceId={ws.id}
            workspaceSlug={slug}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-[var(--primary-hover)] disabled:opacity-70"
          >
            <Plus size={13} strokeWidth={2.5} />
            New page
          </NewPageButton>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Hero greeting banner ── */}
        <div className="border-b border-border/50 bg-gradient-to-b from-primary/[0.04] to-transparent">
          <div className="mx-auto w-full max-w-[1200px] px-8 py-7">
            <div className="flex items-center gap-5">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-primary text-[22px] font-bold text-primary-foreground select-none shadow-sm">
                {(ws.name ?? "W").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-snug">
                  <WorkspaceGreeting firstName={firstName} />
                </h1>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span className="font-semibold text-foreground">{pageCount}</span> page{pageCount !== 1 ? "s" : ""}
                  </span>
                  <span className="size-1.5 rounded-full bg-border shrink-0" />
                  <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <Users size={13} className="shrink-0" />
                    <span className="font-semibold text-foreground">{memberCount}</span> member{memberCount !== 1 ? "s" : ""}
                  </span>
                  {favPages.length > 0 && (
                    <>
                      <span className="size-1.5 rounded-full bg-border shrink-0" />
                      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
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
        <div className="mx-auto w-full max-w-[1200px] px-8 py-6">
          <div className="grid grid-cols-[1fr_252px] gap-6 items-start">

            {/* ── Left column ── */}
            <div className="flex flex-col gap-6">

              {/* Jump back in — grid cards */}
              {recentPages.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground/50 shrink-0" />
                      <h2 className="text-[13px] font-semibold text-foreground">Jump back in</h2>
                      <span className="rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{recentPages.length}</span>
                    </div>
                    <Link href={`/app/${slug}/library`} className="flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
                      View all <ChevronRight size={12} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {recentPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/app/${slug}/${page.shortId}`}
                        className="group flex flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card p-4 transition-all duration-150 hover:border-primary/20 hover:bg-accent hover:shadow-sm"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted transition-colors duration-150 group-hover:bg-background">
                          <PageIcon icon={page.icon} size="lg" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-foreground leading-snug">
                            {page.title || "Untitled"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground/50">{timeAgo(page.visitedAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* No recent pages — empty state */}
              {recentPages.length === 0 && (
                <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-muted/20 px-5 py-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted">
                    <Clock size={18} className="text-muted-foreground/40" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">No pages visited yet</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Pages you open will appear here for quick access.</p>
                  </div>
                  <Link href={`/app/${slug}/library`} className="ml-auto shrink-0 flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
                    Browse library <ChevronRight size={12} />
                  </Link>
                </div>
              )}

              {/* Favorites */}
              {favPages.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={14} className="text-warning shrink-0" fill="currentColor" />
                    <h2 className="text-[13px] font-semibold text-foreground">Favorites</h2>
                    <span className="rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{favPages.length}</span>
                  </div>
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card divide-y divide-border/40">
                    {favPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/app/${slug}/${page.shortId}`}
                        className="group/row flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background text-sm leading-none">
                          <PageIcon icon={page.icon} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                          {page.title || "Untitled"}
                        </span>
                        <ChevronRight size={12} className="shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/row:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Get started — checklist when no pages */}
              {pageCount === 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-[13px] font-semibold text-foreground">Get started with {PRODUCT_NAME}</h2>
                  </div>
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                    <div className="border-b border-border/60 bg-muted/20 px-5 py-3">
                      <p className="text-[12px] text-muted-foreground">Follow these steps to set up your workspace</p>
                    </div>
                    <div className="divide-y divide-border/40">
                      {([
                        { step: "1", title: "Create your first page", desc: "Start with a blank page or pick a template.", done: false },
                        { step: "2", title: "Browse templates", desc: "16+ built-in templates for tasks, projects and notes.", href: `/app/${slug}/templates`, cta: "Browse templates", done: false },
                        { step: "3", title: "Invite your team", desc: "Collaborate in real-time by adding teammates.", href: `/app/${slug}/settings/members`, cta: "Invite members", done: memberCount > 1 },
                      ]).map((item) => (
                        <div key={item.step} className={`flex items-center gap-4 px-5 py-4 ${item.done ? "opacity-50" : ""}`}>
                          <div className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[11px] font-bold ${item.done ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-muted-foreground"}`}>
                            {item.done ? (
                              <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                            ) : item.step}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] font-semibold ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.title}</p>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">{item.desc}</p>
                          </div>
                          {"href" in item && item.href && !item.done && (
                            <Link href={item.href} className="shrink-0 flex items-center gap-0.5 text-[12px] font-medium text-primary hover:underline">
                              {item.cta} <ChevronRight size={11} />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* All Pages */}
              {pageCount > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={14} className="text-muted-foreground/50 shrink-0" />
                    <h2 className="text-[13px] font-semibold text-foreground">All Pages</h2>
                    <span className="rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{pageCount}</span>
                  </div>
                  <Link
                    href={`/app/${slug}/library`}
                    className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card px-5 py-4 transition-all duration-150 hover:border-primary/20 hover:bg-accent hover:shadow-sm"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted transition-colors duration-150 group-hover:bg-background">
                      <BookOpen size={18} className="text-muted-foreground/50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground">Open Library</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">Browse, search and manage all {pageCount} pages</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                  </Link>
                </section>
              )}

            </div>

            {/* ── Right column ── */}
            <div className="flex flex-col gap-3">

              {/* Workspace stats — 3-up grid */}
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">Overview</p>
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-primary/10 px-2 py-3">
                    <svg className="size-3.5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span className="text-[18px] font-bold text-foreground leading-none">{pageCount}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">Pages</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-secondary px-2 py-3">
                    <Users size={14} className="text-secondary-foreground" />
                    <span className="text-[18px] font-bold text-foreground leading-none">{memberCount}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">Members</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-warning/10 px-2 py-3">
                    <Star size={13} className="text-warning" fill="currentColor" />
                    <span className="text-[18px] font-bold text-foreground leading-none">{favPages.length}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">Starred</span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">Quick actions</p>
                </div>
                <div className="divide-y divide-border/40">
                  <NewPageButton
                    workspaceId={ws.id}
                    workspaceSlug={slug}
                    className="group/qa flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-accent disabled:opacity-60"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary">
                      <Plus size={13} />
                    </span>
                    <span className="text-[12.5px] font-medium text-foreground group-hover/qa:text-foreground">New page</span>
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
                      className="group/qa flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-150 hover:bg-accent">
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${action.iconBg}`}>
                        {action.icon}
                      </span>
                      <span className="text-[12.5px] font-medium text-muted-foreground group-hover/qa:text-foreground">{action.label}</span>
                      <ChevronRight size={12} className="ml-auto shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover/qa:opacity-100" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Create first page CTA — compact, when no pages */}
              {pageCount === 0 && (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                    <Plus size={16} className="text-primary" />
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">Create your first page</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                    Start building your workspace with {PRODUCT_NAME}.
                  </p>
                  <NewPageButton
                    workspaceId={ws.id}
                    workspaceSlug={slug}
                    className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3 text-[12px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-[var(--primary-hover)] disabled:opacity-70"
                  >
                    <Plus size={12} strokeWidth={2.5} /> Create page
                  </NewPageButton>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
