"use client";

import { AlertCircle, BookOpen, Check, Clock, FileText, Grid2X2, Loader2, Lock, PenOff, Search, Star, Trash2, X } from "lucide-react";
import { PageIcon as SharedPageIcon } from "@/components/pages/page-icon";
import { PageActionsMenu } from "@/components/pages/page-actions-menu";
import { PagePrivacyProvider } from "@/components/pages/page-privacy-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TimeAgo } from "@/components/ui/time-ago";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const PAGE_SIZE = 10;

type PageRow = {
  id:          string;
  shortId:     string;
  title:       string;
  icon:        string | null;
  kind:        string;
  isPrivate:   boolean;
  isLocked:    boolean;
  parentShortId: string | null;
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

export function LibraryClient({
  pages: initialPages,
  workspaceSlug,
  workspaceId,
}: {
  pages: PageRow[];
  workspaceSlug: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pages, setPages]   = useState<PageRow[]>(initialPages);

  // Duplicating a page (via the row actions menu) triggers router.refresh()
  // rather than navigating away — this syncs local state once the server
  // component re-runs and hands down fresh props with the new row included.
  useEffect(() => { setPages(initialPages); }, [initialPages]);

  // Pick up page mutations made OUTSIDE this table too (e.g. deleting or
  // duplicating from the sidebar's own row menu) — those dispatch the same
  // "pages:refresh" event the sidebar listens for, but this table only ever
  // re-synced from its own row actions, so it went stale for anyone else's.
  useEffect(() => {
    function onPagesRefresh() { router.refresh(); }
    window.addEventListener("pages:refresh", onPagesRefresh);
    return () => window.removeEventListener("pages:refresh", onPagesRefresh);
  }, [router]);

  const [tab, setTab]       = useState<Tab>(() => {
    const initial = searchParams.get("tab");
    return initial === "recents" || initial === "favorites" || initial === "private" ? initial : "all";
  });
  const [search, setSearch]   = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [favs, setFavs]     = useState<Set<string>>(
    () => new Set(initialPages.filter((p) => p.isFavorited).map((p) => p.id))
  );
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [deletingSelected, setDeletingSelected]      = useState(false);
  const [deleteErr, setDeleteErr]              = useState("");

  function changeTab(next: Tab) {
    setTab(next);
    setVisibleCount(PAGE_SIZE);
    setSelectedIds(new Set());
  }

  function changeSearch(val: string) {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
    setSelectedIds(new Set());
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

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll(visibleIds: string[]) {
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds));
  }

  async function handleDeleteSelected() {
    setDeletingSelected(true); setDeleteErr("");
    const ids = [...selectedIds];
    try {
      const results  = await Promise.all(ids.map((id) => fetch(`/api/pages/${id}`, { method: "DELETE" })));
      const failed  = results.filter((r) => !r.ok).length;
      const removed  = new Set(ids.filter((_, i) => results[i]!.ok));
      setPages((prev) => prev.filter((p) => !removed.has(p.id)));
      setSelectedIds(new Set());
      if (removed.size > 0) window.dispatchEvent(new CustomEvent("pages:refresh"));
      if (failed > 0) setDeleteErr(`Failed to delete ${failed} page${failed !== 1 ? "s" : ""}`);
    } catch { setDeleteErr("Network error"); }
    finally { setDeletingSelected(false); setConfirmDeleteSelected(false); }
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

  const visibleRows  = filtered.slice(0, visibleCount);
  const visibleIds   = visibleRows.map((p) => p.id);
  const allSelected  = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && visibleIds.some((id) => selectedIds.has(id));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Tabs + search row ── */}
      <div className="shrink-0 bg-background">
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

          <div className="flex items-center gap-2">
            {/* Selection toolbar — shown only when rows are checked */}
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs font-medium text-muted-foreground">{selectedIds.size} selected</span>
                <button
                  type="button"
                  disabled={deletingSelected}
                  onClick={() => setSelectedIds(new Set())}
                  className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <X size={12} />
                  Clear
                </button>
                <button
                  type="button"
                  disabled={deletingSelected}
                  onClick={() => setConfirmDeleteSelected(true)}
                  className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-destructive/40 bg-destructive/8 px-3 text-xs font-medium text-destructive transition-colors hover:border-destructive/70 hover:bg-destructive/15 disabled:opacity-50"
                >
                  {deletingSelected ? (
                    <><Loader2 size={12} className="animate-spin" />Deleting…</>
                  ) : (
                    <><Trash2 size={12} />Delete selected ({selectedIds.size})</>
                  )}
                </button>
                <div className="h-5 w-px bg-border/60" />
              </>
            )}

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
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        <div key={tab} className="mx-auto w-full max-w-[1200px] animate-in fade-in slide-in-from-bottom-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 duration-200">

          {deleteErr && (
            <p className="mb-3 flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle size={14} className="shrink-0" />
              {deleteErr}
            </p>
          )}

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
              <div className="grid items-center border-b border-border bg-muted/30 px-5 py-2.5" style={{ gridTemplateColumns: "28px 1fr 200px 130px 130px 90px" }}>
                <label className="flex cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={() => toggleSelectAll(visibleIds)}
                    className="sr-only"
                  />
                  <span className={`flex size-[15px] shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                    allSelected
                      ? "border-primary bg-primary"
                      : someSelected
                        ? "border-primary bg-primary/20"
                        : "border-border/60 bg-background hover:border-primary/50"
                  }`}>
                    {allSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                    {someSelected && (
                      <span className="block h-0.5 w-2 rounded-full bg-primary" />
                    )}
                  </span>
                </label>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Page name</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Created by</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Last edited</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Created</span>
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/40">
                {visibleRows.map((page) => {
                  const isChecked = selectedIds.has(page.id);
                  return (
                  <div
                    key={page.id}
                    onClick={() => router.push(`/app/${workspaceSlug}/${page.shortId}`)}
                    className="group/row relative grid cursor-pointer items-center px-5 py-2.5 transition-colors duration-150 hover:bg-accent"
                    style={{ gridTemplateColumns: "28px 1fr 200px 130px 130px 90px" }}
                  >
                    {/* Row checkbox */}
                    <label className="relative z-10 flex cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(page.id)}
                        className="sr-only"
                      />
                      <span className={`flex size-[15px] shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                        isChecked ? "border-primary bg-primary" : "border-border/50 bg-background hover:border-primary/50"
                      }`}>
                        {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                      </span>
                    </label>

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
                      {page.isLocked && (
                        <div className="group/locked relative shrink-0">
                          <PenOff size={11} className="text-warning/70" />
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover/locked:opacity-100">
                            <p className="text-xs font-semibold text-popover-foreground">
                              Locked — editing disabled
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Favorite button with tooltip */}
                      <div className="group/fav relative shrink-0" onClick={(e) => e.stopPropagation()}>
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
                    <span className="relative z-10 pr-4 text-xs text-muted-foreground/70"><TimeAgo iso={page.updatedAt} /></span>

                    {/* Created */}
                    <span className="relative z-10 pr-2 text-xs text-muted-foreground/70"><TimeAgo iso={page.createdAt} /></span>

                    {/* Row actions */}
                    <span className="relative z-10 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <PagePrivacyProvider initialIsPrivate={page.isPrivate}>
                        <PageActionsMenu
                          pageId={page.id}
                          isLocked={page.isLocked}
                          isDeleted={false}
                          workspaceSlug={workspaceSlug}
                          workspaceId={workspaceId}
                          pageShortId={page.shortId}
                          pageTitle={page.title}
                          pageKind={page.kind}
                          parentShortId={page.parentShortId}
                          iconOnly
                          onDeleted={() => {
                            setPages((prev) => prev.filter((p) => p.id !== page.id));
                            setSelectedIds((prev) => {
                              if (!prev.has(page.id)) return prev;
                              const next = new Set(prev);
                              next.delete(page.id);
                              return next;
                            });
                            window.dispatchEvent(new CustomEvent("pages:refresh"));
                          }}
                          onDuplicated={() => {
                            router.refresh();
                            window.dispatchEvent(new CustomEvent("pages:refresh"));
                          }}
                        />
                      </PagePrivacyProvider>
                    </span>
                  </div>
                  );
                })}
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

      <ConfirmDialog
        open={confirmDeleteSelected}
        onOpenChange={(o) => !o && setConfirmDeleteSelected(false)}
        title={`Move ${selectedIds.size} page${selectedIds.size !== 1 ? "s" : ""} to Trash?`}
        description="They will be moved to Trash and permanently deleted after 30 days."
        confirmLabel="Move to Trash"
        confirmLoadingLabel="Moving…"
        loading={deletingSelected}
        onConfirm={handleDeleteSelected}
      />
    </div>
  );
}
