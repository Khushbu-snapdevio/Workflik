import { and, count, desc, eq } from "drizzle-orm";
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
import { PRODUCT_NAME } from "@/config/platform";

type Props = { params: Promise<{ workspace: string }> };

export async function generateMetadata({ params }: Props) {
  const { workspace: slug } = await params;
  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return { title: ws?.name ?? "Workspace" };
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
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

  const [recentRaw, [{ memberCount }], [{ pageCount }], [{ favCount }]] =
    await Promise.all([
      db
        .select({
          id: userRecentlyVisited.id,
          shortId: pages.shortId,
          title: pages.title,
          icon: pages.icon,
          visitedAt: userRecentlyVisited.visitedAt,
        })
        .from(userRecentlyVisited)
        .innerJoin(pages, eq(pages.id, userRecentlyVisited.pageId))
        .where(
          and(
            eq(userRecentlyVisited.userId, session.user.id),
            eq(userRecentlyVisited.workspaceId, ws.id),
            eq(pages.isDeleted, false)
          )
        )
        .orderBy(desc(userRecentlyVisited.visitedAt))
        .limit(6),

      db
        .select({ memberCount: count() })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, ws.id),
            eq(workspaceMembers.status, "active")
          )
        ),

      db
        .select({ pageCount: count() })
        .from(pages)
        .where(and(eq(pages.workspaceId, ws.id), eq(pages.isDeleted, false))),

      db
        .select({ favCount: count() })
        .from(userFavorites)
        .where(
          and(
            eq(userFavorites.userId, session.user.id),
            eq(userFavorites.workspaceId, ws.id)
          )
        ),
    ]);

  const recentPages = recentRaw.map((p) => ({
    ...p,
    visitedAt: p.visitedAt.toISOString(),
  }));

  const firstName =
    session.user.name?.split(" ")[0] ?? session.user.email.split("@")[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-8 py-5">
        <div>
          <h1 className="text-[1.4rem] font-black tracking-tight text-foreground">
            <WorkspaceGreeting firstName={firstName} />
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in{" "}
            <span className="font-semibold text-foreground">{ws.name}</span> today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-48 items-center gap-2 rounded-lg border border-border bg-background px-3 text-muted-foreground">
            <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="flex-1 text-xs">Search anything…</span>
            <kbd className="rounded bg-muted px-1 py-px text-2xs font-medium">⌘K</kbd>
          </div>

          <Link
            href={`/app/${slug}/new`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold uppercase tracking-ui text-primary-foreground transition-colors hover:bg-[var(--primary-hover)]"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </Link>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-background px-8 py-5 space-y-4">

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-4 gap-3">

          {/* New Page — violet */}
          <Link
            href={`/app/${slug}/new`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all hover:border-[#C4B5FD] hover:shadow-md"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <svg className="size-5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">New Page</p>
              <p className="text-xs text-muted-foreground">Create &amp; start writing</p>
            </div>
          </Link>

          {/* Invite Members — blue */}
          <div className="relative flex cursor-not-allowed items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <svg className="size-5 text-blue-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Invite Members</p>
              <p className="text-xs text-muted-foreground">Add teammates</p>
            </div>
            <span className="absolute right-3 top-3 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Soon</span>
          </div>

          {/* Import — orange */}
          <div className="relative flex cursor-not-allowed items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <svg className="size-5 text-orange-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
                <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Import</p>
              <p className="text-xs text-muted-foreground">Notion, Markdown…</p>
            </div>
            <span className="absolute right-3 top-3 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Soon</span>
          </div>

          {/* Settings — emerald */}
          <Link
            href={`/${slug}/settings`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <svg className="size-5 text-emerald-600" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Settings</p>
              <p className="text-xs text-muted-foreground">Workspace preferences</p>
            </div>
          </Link>
        </div>

        {/* ── Two-column area ── */}
        <div className="grid grid-cols-5 gap-4">

          {/* Recently Opened — 3 cols */}
          <div className="col-span-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-secondary">
                  <svg className="size-3.5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-foreground">Recently Opened</span>
              </div>
              <Link href={`/app/${slug}/search`} className="text-xs font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>

            {recentPages.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <svg className="size-4 text-muted-foreground/40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No pages opened yet</p>
                  <p className="text-xs text-muted-foreground/60">Pages you visit will appear here for quick access.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentPages.map((page) => (
                  <Link
                    key={page.id}
                    href={`/app/${slug}/${page.shortId}`}
                    className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-secondary/50"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-sm leading-none">
                      {page.icon ?? (
                        <svg className="size-3.5 text-muted-foreground/60" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {page.title || "Untitled"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(page.visitedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Workspace Overview — 2 cols */}
          <div className="col-span-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-blue-100">
                <svg className="size-3.5 text-blue-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">Workspace Overview</span>
            </div>

            <div className="grid grid-cols-2">
              {/* Pages */}
              <div className="flex flex-col gap-2 border-b border-r border-border p-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                  <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="text-2xl font-black text-foreground">{pageCount}</p>
                <p className="text-xs text-muted-foreground">Pages</p>
              </div>

              {/* Members */}
              <div className="flex flex-col gap-2 border-b border-border p-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="size-4 text-blue-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <p className="text-2xl font-black text-foreground">{memberCount}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>

              {/* Favorites */}
              <div className="flex flex-col gap-2 border-r border-border p-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-rose-100">
                  <svg className="size-4 text-rose-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <p className="text-2xl font-black text-foreground">{favCount}</p>
                <p className="text-xs text-muted-foreground">Favorites</p>
              </div>

              {/* Recent Visits */}
              <div className="flex flex-col gap-2 p-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
                  <svg className="size-4 text-amber-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p className="text-2xl font-black text-foreground">{recentPages.length}</p>
                <p className="text-xs text-muted-foreground">Recent visits</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Get-started banner (hidden once pages exist) ── */}
        {pageCount === 0 && (
          <div className="flex items-center justify-between rounded-xl border border-[#C4B5FD] bg-secondary px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                <svg className="size-5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Get started with {PRODUCT_NAME}</p>
                <p className="text-xs text-muted-foreground">Create your first page to begin your productivity journey.</p>
              </div>
            </div>
            <Link
              href={`/app/${slug}/new`}
              className="inline-flex h-9 items-center rounded-lg bg-primary px-5 text-xs font-semibold uppercase tracking-ui text-primary-foreground transition-colors hover:bg-[var(--primary-hover)]"
            >
              Create Page
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
