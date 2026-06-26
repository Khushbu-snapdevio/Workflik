"use client";

import { BookOpen, Clock, FileText, Grid2X2, Lock, Search, Star, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type PageRow = {
  id:          string;
  shortId:     string;
  title:       string;
  icon:        string | null;
  kind:        string;
  isPrivate:   boolean;
  createdAt:   string;
  updatedAt:   string;
  creatorName: string;
  visitedAt:   string | null;
  isRecent:    boolean;
  isFavorited: boolean;
};

type Tab = "all" | "recents" | "favorites" | "private";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",       label: "All Pages"  },
  { id: "recents",   label: "Recents"    },
  { id: "favorites", label: "Favorites"  },
  { id: "private",   label: "Private"    },
];

function TabIcon({ id }: { id: Tab }) {
  if (id === "all")       return <Grid2X2 size={14} className="shrink-0" />;
  if (id === "recents")   return <Clock size={14} className="shrink-0" />;
  if (id === "favorites") return <Star size={14} className="shrink-0" />;
  return <Lock size={14} className="shrink-0" />;
}

function PageIcon({ icon, kind }: { icon: string | null; kind: string }) {
  if (icon) return <span className="text-sm leading-none">{icon}</span>;
  if (kind === "database") return (
    <svg className="size-3.5 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  );
  return <FileText size={14} className="text-muted-foreground/40" />;
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
  const [tab, setTab]     = useState<Tab>("all");
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
      <div className="shrink-0 border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <TabIcon id={t.id} />
                {t.label}
                <span className={`rounded-[var(--radius-xs)] px-1.5 py-0.5 text-xs font-semibold ${
                  tab === t.id ? "bg-accent text-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {tabCount(t.id)}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 text-xs transition-colors duration-150 focus-within:border-border">
            <Search size={13} className="shrink-0 text-muted-foreground/50" />
            <input
              className="w-40 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              placeholder="Search pages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground/40 transition-colors duration-150 hover:text-muted-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        <div key={tab} className="mx-auto w-full max-w-[1200px] animate-in fade-in slide-in-from-bottom-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 duration-200">

          {filtered.length === 0 ? (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-muted">
                  <BookOpen size={20} className="text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-foreground">No pages found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search ? "Try a different search term" : "Create your first page to get started"}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">

              {/* Table header */}
              <div className="grid border-b border-border bg-muted/30 px-5 py-2.5" style={{ gridTemplateColumns: "1fr 200px 130px 130px" }}>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Page name</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Created by</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Last edited</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Created</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/40">
                {filtered.map((page) => (
                  <Link
                    key={page.id}
                    href={`/app/${workspaceSlug}/${page.shortId}`}
                    className="group/row grid items-center px-5 py-2.5 transition-colors duration-150 hover:bg-accent"
                    style={{ gridTemplateColumns: "1fr 200px 130px 130px" }}
                  >
                    {/* Page name */}
                    <div className="flex min-w-0 items-center gap-2.5 pr-4">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background">
                        <PageIcon icon={page.icon} kind={page.kind} />
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium text-foreground">
                        {page.title || "Untitled"}
                      </span>
                      {page.isPrivate && (
                        <Lock size={11} className="shrink-0 text-muted-foreground/40" />
                      )}
                      {page.isFavorited && (
                        <Star size={11} className="shrink-0 text-warning" fill="currentColor" />
                      )}
                    </div>

                    {/* Created by */}
                    <span className="text-xs text-muted-foreground/70 pr-4">{page.creatorName}</span>

                    {/* Last edited */}
                    <span className="text-xs text-muted-foreground/70 pr-4">{timeAgo(page.updatedAt)}</span>

                    {/* Created */}
                    <span className="text-xs text-muted-foreground/70">{timeAgo(page.createdAt)}</span>
                  </Link>
                ))}
              </div>

              {/* Footer count */}
              <div className="border-t border-border/40 px-5 py-2">
                <p className="text-xs text-muted-foreground/50">
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
