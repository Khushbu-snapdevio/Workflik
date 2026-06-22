import { and, asc, count, desc, eq } from "drizzle-orm";
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
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function PageIcon({ icon }: { icon: string | null }) {
  if (icon) return <span className="text-sm leading-none">{icon}</span>;
  return (
    <svg className="size-3.5 text-muted-foreground/40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
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

      {/* ── Hero topbar ── */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-8 py-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <svg className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 12 12">
                  <rect x="1.5" y="1.5" width="3.5" height="3.5" rx="0.75"/>
                  <rect x="7" y="1.5" width="3.5" height="3.5" rx="0.75"/>
                  <rect x="1.5" y="7" width="3.5" height="3.5" rx="0.75"/>
                  <rect x="7" y="7" width="3.5" height="3.5" rx="0.75"/>
                </svg>
                {ws.name}
              </span>
              <span className="text-[11.5px] text-muted-foreground">{today}</span>
            </div>
            <h1 className="text-[22px] font-black tracking-tight text-foreground leading-tight">
              <WorkspaceGreeting firstName={firstName} />
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SearchTrigger />
            <WorkspaceShareButton workspaceSlug={slug} workspaceName={ws.name ?? ws.id} />
            <NewPageButton
              workspaceId={ws.id}
              workspaceSlug={slug}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:bg-[var(--primary-hover)] active:scale-[0.97] disabled:opacity-70"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New page
            </NewPageButton>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1200px] px-8 py-6">
          <div className="grid grid-cols-[1fr_256px] gap-5 items-start">

            {/* ── Left column ── */}
            <div className="flex flex-col gap-4">

              {/* Recently Opened */}
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
                      <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">Recently Opened</span>
                    {recentPages.length > 0 && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{recentPages.length}</span>
                    )}
                  </div>
                  <Link href={`/app/${slug}/library`} className="text-[12px] font-medium text-primary/60 transition-colors hover:text-primary">
                    View all →
                  </Link>
                </div>

                {recentPages.length === 0 ? (
                  <div className="flex items-center gap-4 px-5 py-7">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted/50">
                      <svg className="size-4 text-muted-foreground/30" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">No pages visited yet</p>
                      <p className="text-[11.5px] text-muted-foreground/60">Pages you open will appear here.</p>
                    </div>
                    <Link href={`/app/${slug}/library`} className="ml-auto shrink-0 text-[12px] font-medium text-primary hover:underline underline-offset-2">
                      Browse library →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {recentPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/app/${slug}/${page.shortId}`}
                        className="group/row flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-primary/[0.03]"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border/60 bg-background text-sm leading-none shadow-[var(--shadow-card)]">
                          <PageIcon icon={page.icon} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground transition-colors group-hover/row:text-primary">
                          {page.title || "Untitled"}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground/40">{timeAgo(page.visitedAt)}</span>
                        <svg className="size-3 shrink-0 text-primary/30 opacity-0 transition-opacity group-hover/row:opacity-100" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Favorites */}
              {favPages.length > 0 && (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-amber-50 ring-1 ring-amber-100">
                      <svg className="size-3 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">Favorites</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{favPages.length}</span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {favPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/app/${slug}/${page.shortId}`}
                        className="group/row flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-primary/[0.03]"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border/60 bg-background text-sm leading-none shadow-[var(--shadow-card)]">
                          <PageIcon icon={page.icon} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground transition-colors group-hover/row:text-primary">
                          {page.title || "Untitled"}
                        </span>
                        <svg className="size-3 shrink-0 text-primary/30 opacity-0 transition-opacity group-hover/row:opacity-100" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Get started — full-width onboarding when no pages */}
              {pageCount === 0 && (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-primary/[0.07] shadow-[var(--shadow-card)]">
                  <div className="border-b border-primary/10 px-5 py-3">
                    <p className="text-[13px] font-semibold text-foreground">Get started with {PRODUCT_NAME}</p>
                    <p className="text-[11.5px] text-muted-foreground/70">Follow these steps to set up your workspace</p>
                  </div>
                  <div className="divide-y divide-primary/[0.07]">
                    {([
                      {
                        step: "1",
                        title: "Create your first page",
                        desc: "Start with a blank page or use a template to get going fast.",
                        done: false,
                      },
                      {
                        step: "2",
                        title: "Browse templates",
                        desc: "Pick from 16+ built-in templates for tasks, projects, notes and more.",
                        href: `/app/${slug}/templates`,
                        cta: "Browse templates",
                        done: false,
                      },
                      {
                        step: "3",
                        title: "Invite your team",
                        desc: "Collaborate in real-time by adding teammates to this workspace.",
                        href: `/app/${slug}/settings/members`,
                        cta: "Invite members",
                        done: memberCount > 1,
                      },
                    ]).map((item) => (
                      <div key={item.step} className={`flex items-center gap-4 px-5 py-4 ${item.done ? "opacity-50" : ""}`}>
                        <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${item.done ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
                          {item.done ? (
                            <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                          ) : item.step}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-semibold ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.title}</p>
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground/60">{item.desc}</p>
                        </div>
                        {item.done && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Done</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Pages */}
              {pageCount > 0 && (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-sky-50 ring-1 ring-sky-100">
                        <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                        </svg>
                      </span>
                      <span className="text-[13px] font-semibold text-foreground">All Pages</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{pageCount}</span>
                    </div>
                    <Link href={`/app/${slug}/library`} className="text-[12px] font-medium text-primary/60 transition-colors hover:text-primary">
                      Open library →
                    </Link>
                  </div>
                  <div className="px-5 py-4">
                    <Link
                      href={`/app/${slug}/library`}
                      className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/[0.025] hover:text-primary"
                    >
                      <svg className="size-4 text-primary/60" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                      </svg>
                      Browse in Library
                    </Link>
                  </div>
                </div>
              )}

            </div>

            {/* ── Right column ── */}
            <div className="flex flex-col gap-3">

              {/* Workspace overview */}
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
                <div className="border-b border-border/60 px-4 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Overview</p>
                </div>
                <div className="divide-y divide-border/40">
                  {([
                    {
                      label: "Pages", value: pageCount,
                      icon: <svg className="size-3.5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                      bg: "bg-primary/10 ring-primary/20",
                    },
                    {
                      label: "Members", value: memberCount,
                      icon: <svg className="size-3.5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
                      bg: "bg-primary/10 ring-primary/20",
                    },
                    {
                      label: "Favorites", value: favPages.length,
                      icon: <svg className="size-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                      bg: "bg-amber-50 ring-amber-100",
                    },
                  ] as const).map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ring-1 ${s.bg}`}>
                          {s.icon}
                        </span>
                        <span className="text-[12.5px] font-medium text-muted-foreground">{s.label}</span>
                      </div>
                      <span className="text-[16px] font-black text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
                <div className="border-b border-border/60 px-4 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Quick actions</p>
                </div>
                <div className="divide-y divide-border/40">
                  {/* New page — uses API call to avoid Turbopack performance.measure error */}
                  <NewPageButton
                    workspaceId={ws.id}
                    workspaceSlug={slug}
                    className="group/qa flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-primary/[0.03] disabled:opacity-60"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted/50 text-muted-foreground ring-1 ring-border/60 transition-colors group-hover/qa:bg-primary/10 group-hover/qa:text-primary group-hover/qa:ring-primary/20">
                      <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                    </span>
                    <span className="text-[12.5px] font-medium text-muted-foreground transition-colors group-hover/qa:text-primary">New page</span>
                    <svg className="ml-auto size-3 shrink-0 text-primary/30 opacity-0 transition-opacity group-hover/qa:opacity-100" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </NewPageButton>
                  {([
                    { label: "Library",    href: `/app/${slug}/library`,   icon: <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> },
                    { label: "Templates",  href: `/app/${slug}/templates`, icon: <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
                    { label: "Settings",   href: `/app/${slug}/settings`,  icon: <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
                    { label: "Invite members", href: `/app/${slug}/settings/members`, icon: <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg> },
                  ] as const).map((action) => (
                    <Link key={action.label} href={action.href}
                      className="group/qa flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-primary/[0.03]">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted/50 text-muted-foreground ring-1 ring-border/60 transition-colors group-hover/qa:bg-primary/10 group-hover/qa:text-primary group-hover/qa:ring-primary/20">
                        {action.icon}
                      </span>
                      <span className="text-[12.5px] font-medium text-muted-foreground transition-colors group-hover/qa:text-primary">{action.label}</span>
                      <svg className="ml-auto size-3 shrink-0 text-primary/30 opacity-0 transition-opacity group-hover/qa:opacity-100" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Get started — only when no pages */}
              {pageCount === 0 && (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                  <div className="mb-3 flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
                    <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">Get started</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Create your first page to begin with {PRODUCT_NAME}.
                  </p>
                  <NewPageButton
                    workspaceId={ws.id}
                    workspaceSlug={slug}
                    className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3 text-[12px] font-semibold text-primary-foreground transition-all hover:bg-[var(--primary-hover)] active:scale-[0.97] disabled:opacity-70"
                  >
                    Create page
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
