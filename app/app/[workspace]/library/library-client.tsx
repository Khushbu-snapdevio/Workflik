"use client";

import Link from "next/link";
import { useState } from "react";

type PageRow = {
  id:           string;
  shortId:      string;
  title:        string;
  icon:         string | null;
  kind:         string;
  isPrivate:    boolean;
  createdAt:    string;
  updatedAt:    string;
  creatorName:  string;
  visitedAt:    string | null;
  isRecent:     boolean;
  isFavorited:  boolean;
};

type Tab = "all" | "recents" | "favorites" | "private";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",       label: "All Pages" },
  { id: "recents",   label: "Recents"   },
  { id: "favorites", label: "Favorites" },
  { id: "private",   label: "Private"   },
];

function TabIcon({ id }: { id: Tab }) {
  if (id === "all") return (
    <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
  if (id === "recents") return (
    <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
  if (id === "favorites") return (
    <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
  return (
    <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

function PageIcon({ icon, kind }: { icon: string | null; kind: string }) {
  if (icon) return <span className="text-sm leading-none">{icon}</span>;
  if (kind === "database") return (
    <svg className="size-3.5 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  );
  return (
    <svg className="size-3.5 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  if (weeks < 5)  return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function LibraryClient({ pages, workspaceSlug }: { pages: PageRow[]; workspaceSlug: string }) {
  const [tab, setTab]       = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const tabCount = (id: Tab) =>
    id === "all"       ? pages.length :
    id === "recents"   ? pages.filter((p) => p.isRecent).length :
    id === "favorites" ? pages.filter((p) => p.isFavorited).length :
                         pages.filter((p) => p.isPrivate).length;

  const filtered = pages
    .filter((p) => {
      if (tab === "recents")   return p.isRecent;
      if (tab === "favorites") return p.isFavorited;
      if (tab === "private")   return p.isPrivate;
      return true;
    })
    .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Tabs + search row ── */}
      <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-8">
          <div className="flex items-center">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-[12.5px] font-medium whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <TabIcon id={t.id} />
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  tab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tabCount(t.id)}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 text-xs focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <svg className="size-3.5 shrink-0 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="w-40 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              placeholder="Search pages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" viewBox="0 0 12 12">
                  <path d="M2 2l8 8M10 2l-8 8"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1200px] px-8 py-5">

          {filtered.length === 0 ? (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50">
                  <svg className="size-6 text-muted-foreground/30" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <p className="text-[13.5px] font-semibold text-foreground">No pages found</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {search ? "Try a different search term" : "Create your first page to get started"}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">

              {/* Table header */}
              <div className="grid border-b border-border/60 bg-muted/20 px-5 py-2.5" style={{ gridTemplateColumns: "1fr 200px 130px 130px" }}>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/60">Page name</span>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/60">Created by</span>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/60">Last edited</span>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/60">Created</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/40">
                {filtered.map((page) => (
                  <Link
                    key={page.id}
                    href={`/app/${workspaceSlug}/${page.shortId}`}
                    className="group/row grid items-center px-5 py-2.5 transition-colors hover:bg-primary/[0.03]"
                    style={{ gridTemplateColumns: "1fr 200px 130px 130px" }}
                  >
                    {/* Page name */}
                    <div className="flex min-w-0 items-center gap-2.5 pr-4">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border/60 bg-background shadow-[var(--shadow-card)]">
                        <PageIcon icon={page.icon} kind={page.kind} />
                      </span>
                      <span className="min-w-0 truncate text-[13px] font-medium text-foreground transition-colors group-hover/row:text-primary">
                        {page.title || "Untitled"}
                      </span>
                      {page.isPrivate && (
                        <svg className="size-3 shrink-0 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                      )}
                      {page.isFavorited && (
                        <svg className="size-3 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      )}
                    </div>

                    {/* Created by */}
                    <span className="text-[12px] text-muted-foreground/70 pr-4">{page.creatorName}</span>

                    {/* Last edited */}
                    <span className="text-[12px] text-muted-foreground/70 pr-4">{timeAgo(page.updatedAt)}</span>

                    {/* Created */}
                    <span className="text-[12px] text-muted-foreground/70">{timeAgo(page.createdAt)}</span>
                  </Link>
                ))}
              </div>

              {/* Footer count */}
              <div className="border-t border-border/40 px-5 py-2">
                <p className="text-[11px] text-muted-foreground/50">
                  {filtered.length} page{filtered.length !== 1 ? "s" : ""}
                  {search && ` matching "${search}"`}
                </p>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
