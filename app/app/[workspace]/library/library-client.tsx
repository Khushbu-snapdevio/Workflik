"use client";

import { BookOpen, Clock, FileText, Grid2X2, Loader2, Lock, Search, Star, X } from "lucide-react";
import { PageIcon as SharedPageIcon } from "@/components/pages/page-icon";
import Link from "next/link";
import { useState } from "react";

const PAGE_SIZE = 10;

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
  if (icon) return <SharedPageIcon icon={icon} size={14} />;
  if (kind === "database") return (
    <svg className="size-3.5 shrink-0 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  );
  return <FileText size={14} className="shrink-0 text-muted-foreground/40" />;
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

export function LibraryClient({
  pages,
  workspaceSlug,
  workspaceId,
}: {
  pages: PageRow[];
  workspaceSlug: string;
  workspaceId: string;
}) {
  const [tab, setTab]       = useState<Tab>("all");
  const [search, setSearch]   = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [favs, setFavs]     = useState<Set<string>>(
    () => new Set(pages.filter((p) => p.isFavorited).map((p) => p.id))
  );

  function changeTab(next: Tab) {
    setTab(next);
    setVisibleCount(PAGE_SIZE);
  }

  function changeSearch(val: string) {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }

  function loadMore() {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE_SIZE);
      setLoadingMore(false);
    }, 600);
  }

  function showLess() {
    setVisibleCount(PAGE_SIZE);
  }

  function toggleFavorite(pageId: string) {
    const isFav = favs.has(pageId);
    setFavs((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(pageId) : next.add(pageId);
      return next;
    });
    if (isFav) {
      fetch(`/api/user/favorites/${pageId}`, { method: "DELETE" }).catch(() => {
        setFavs((prev) => { const n = new Set(prev); n.add(pageId); return n; });
      });
    } else {
      fetch("/api/user/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, workspaceId }),
      }).catch(() => {
        setFavs((prev) => { const n = new Set(prev); n.delete(pageId); return n; });
      });
    }
    window.dispatchEvent(new CustomEvent("workflik:favorites-changed"));
  }

  const tabCount = (id: Tab) =>
    id === "all"       ? pages.length :
    id === "recents"   ? pages.filter((p) => p.isRecent).length :
    id === "favorites" ? pages.filter((p) => favs.has(p.id)).length :
                         pages.filter((p) => p.isPrivate).length;

  const filtered = pages
    .filter((p) => {
      if (tab === "recents")   return p.isRecent;
      if (tab === "favorites") return favs.has(p.id);
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
                onClick={() => changeTab(t.id)}
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
              onChange={(e) => changeSearch(e.target.value)}
              type="text"
            />
            {search && (
              <button
                type="button"
                onClick={() => changeSearch("")}
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
                {filtered.slice(0, visibleCount).map((page) => (
                  <div
                    key={page.id}
                    className="group/row relative grid items-center px-5 py-2.5 transition-colors duration-150 hover:bg-accent"
                    style={{ gridTemplateColumns: "1fr 200px 130px 130px" }}
                  >
                    {/* Full-row navigation link underneath */}
                    <Link
                      href={`/app/${workspaceSlug}/${page.shortId}`}
                      className="absolute inset-0"
                      aria-label={page.title || "Untitled"}
                    />

                    {/* Page name cell */}
                    <div className="relative z-10 flex min-w-0 items-center gap-2.5 pr-4">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background">
                        <PageIcon icon={page.icon} kind={page.kind} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {page.title || "Untitled"}
                      </span>
                      {page.isPrivate && (
                        <Lock size={11} className="shrink-0 text-muted-foreground/40" />
                      )}

                      {/* Favorite button with tooltip */}
                      <div className="group/fav relative shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(page.id)}
                          className={`flex size-6 items-center justify-center rounded transition-all duration-150 ${
                            favs.has(page.id)
                              ? "text-warning"
                              : "text-muted-foreground/30 opacity-0 group-hover/row:opacity-100 hover:text-warning"
                          }`}
                        >
                          <Star size={13} fill={favs.has(page.id) ? "currentColor" : "none"} />
                        </button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover/fav:opacity-100">
                          <p className="text-xs font-semibold text-popover-foreground">
                            {favs.has(page.id) ? "Remove from favorites" : "Add to favorites"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Created by */}
                    <span className="relative z-10 pr-4 text-xs text-muted-foreground/70">{page.creatorName}</span>

                    {/* Last edited */}
                    <span className="relative z-10 pr-4 text-xs text-muted-foreground/70">{timeAgo(page.updatedAt)}</span>

                    {/* Created */}
                    <span className="relative z-10 text-xs text-muted-foreground/70">{timeAgo(page.createdAt)}</span>
                  </div>
                ))}
              </div>

              {/* Footer: count + load more / show less */}
              <div className="flex items-center justify-between border-t border-border/40 px-5 py-3">
                <p className="text-xs text-muted-foreground/50">
                  Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} page{filtered.length !== 1 ? "s" : ""}
                  {search && ` matching "${search}"`}
                </p>

                <div className="flex items-center gap-2">
                  {/* Show less — only when showing more than one page of results */}
                  {visibleCount > PAGE_SIZE && (
                    <button
                      type="button"
                      onClick={showLess}
                      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                      Show less
                    </button>
                  )}

                  {/* Load more — only when there are hidden rows */}
                  {filtered.length > visibleCount && (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Loading…
                        </>
                      ) : (
                        <>
                          Load more
                          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-bold">
                            +{Math.min(PAGE_SIZE, filtered.length - visibleCount)}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
