"use client";

import { AlertCircle, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, EyeOff, FileText, Grid2X2, Loader2, Lock, Search, Star, Trash2, X } from "lucide-react";
import { PageIcon as SharedPageIcon } from "@/components/pages/page-icon";
import { PageActionsMenu } from "@/components/pages/page-actions-menu";
import { PagePrivacyProvider } from "@/components/pages/page-privacy-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TimeAgo } from "@/components/ui/time-ago";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE, getPageNumbers } from "@/lib/ui/pagination";
import type { LibraryPageResult, LibraryPageRow as PageRow } from "@/lib/pages/library";

type DisplayRow = PageRow & { depth: number; hasChildren: boolean };

// Nests sub-pages under their parent (in the same relative order `rows`
// already has — most-recently-updated first) instead of listing every page
// flat, which made a top-level page and a deeply-nested one indistinguishable.
// A page whose parent isn't present in `rows` (not on this page, or genuinely
// a root) is treated as a root itself, so the tree never silently drops rows.
function buildDisplayRows(rows: PageRow[], collapsed: Set<string>): DisplayRow[] {
  const idSet = new Set(rows.map((p) => p.id));
  const childrenByParent = new Map<string, PageRow[]>();
  const roots: PageRow[] = [];
  for (const p of rows) {
    if (p.parentId && idSet.has(p.parentId)) {
      if (!childrenByParent.has(p.parentId)) childrenByParent.set(p.parentId, []);
      childrenByParent.get(p.parentId)!.push(p);
    } else {
      roots.push(p);
    }
  }

  const out: DisplayRow[] = [];
  function walk(list: PageRow[], depth: number) {
    for (const p of list) {
      const kids = childrenByParent.get(p.id) ?? [];
      out.push({ ...p, depth, hasChildren: kids.length > 0 });
      if (kids.length > 0 && !collapsed.has(p.id)) walk(kids, depth + 1);
    }
  }
  walk(roots, 0);
  return out;
}

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
  initial,
  workspaceSlug,
  workspaceId,
}: {
  initial: LibraryPageResult;
  workspaceSlug: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>(() => {
    const initialTab = searchParams.get("tab");
    return initialTab === "recents" || initialTab === "favorites" || initialTab === "private" ? initialTab : "all";
  });
  const [search, setSearch]   = useState("");
  // Applied 250ms after typing stops — this now drives a real network
  // request per change, unlike the old instant client-side filter.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  // Decoupled from `pageSize` so the field can be freely typed into (cleared,
  // mid-edit) without a controlled-input value snapping back on every
  // keystroke — only reconciled on blur/Enter/stepper click.
  const [pageSizeInput, setPageSizeInput] = useState(String(DEFAULT_PAGE_SIZE));
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState("");

  // `initial` is only ever the FIRST page's data (fetched server-side for
  // whichever tab the URL requested) — every tab switch, search, page-size
  // change, or page navigation after this re-fetches its own page from
  // GET /api/workspaces/:id/pages/library instead of ever holding the whole
  // workspace in memory.
  const [rows, setRows]       = useState<PageRow[]>(initial.pages);
  const [totalCount, setTotalCount] = useState(initial.totalCount);
  const [nestingActive, setNestingActive] = useState(initial.nestingActive);
  const [tabCounts, setTabCounts] = useState(initial.tabCounts);
  const [loading, setLoading]   = useState(false);

  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIds]   = useState<Set<string>>(new Set());
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [deletingSelected, setDeletingSelected]      = useState(false);
  const [deleteErr, setDeleteErr]              = useState("");

  const requestIdRef    = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef    = useRef(false);

  async function fetchLibrary(t: Tab, q: string, p: number, size: number) {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: t, search: q, page: String(p), pageSize: String(size) });
      const res = await fetch(`/api/workspaces/${workspaceId}/pages/library?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json() as LibraryPageResult;
      if (myRequestId !== requestIdRef.current) return; // superseded by a newer request
      setRows(data.pages);
      setTotalCount(data.totalCount);
      setNestingActive(data.nestingActive);
      setTabCounts(data.tabCounts);
    } catch {
      // Keep whatever was previously on screen rather than clearing to empty.
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false);
    }
  }

  function refetch() {
    fetchLibrary(tab, debouncedSearch, currentPage, pageSize);
  }

  // Skip the very first run — page.tsx's server-rendered `initial` already
  // covers page 1 of whichever tab the URL requested, so firing again here
  // on mount would just repeat the same request.
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    fetchLibrary(tab, debouncedSearch, currentPage, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedSearch, currentPage, pageSize]);

  // Pick up page mutations made OUTSIDE this table too (e.g. deleting or
  // duplicating from the sidebar's own row menu) — those dispatch the same
  // "pages:refresh" event the sidebar listens for.
  useEffect(() => {
    function onPagesRefresh() { refetch(); }
    window.addEventListener("pages:refresh", onPagesRefresh);
    return () => window.removeEventListener("pages:refresh", onPagesRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedSearch, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // If a mutation (e.g. deleting the last row on the last page) shrinks the
  // dataset below the page currently being viewed, snap back to the new last
  // page — this also re-fires the fetch effect above to reload it.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  function changeTab(next: Tab) {
    setTab(next);
    setCurrentPage(1);
    setSelectedIds(new Set());
    // Avoid flashing the previous tab's rows under the new tab's label while
    // its own data loads.
    setRows([]);
  }

  function changeSearch(val: string) {
    setSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
      setSelectedIds(new Set());
      setRows([]);
    }, 250);
  }

  function changePageSize(next: number) {
    const clamped = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, next));
    setPageSize(clamped);
    setPageSizeInput(String(clamped));
    setCurrentPage(1);
    setRows([]);
  }

  function submitPageSizeInput() {
    const n = Number.parseInt(pageSizeInput, 10);
    changePageSize(Number.isFinite(n) ? n : pageSize);
  }

  function goToPage(p: number) {
    setCurrentPage(Math.min(totalPages, Math.max(1, p)));
  }

  function submitGoToPage() {
    const n = Number.parseInt(goToPageInput, 10);
    if (Number.isFinite(n)) goToPage(n);
    setGoToPageInput("");
  }

  function toggleFavorite(pageId: string) {
    const row = rows.find((r) => r.id === pageId);
    if (!row) return;
    const wasFav = row.isFavorited;
    // Un-favoriting while viewing the Favorites tab drops the row
    // immediately, matching the old client-side filter's behavior.
    if (tab === "favorites" && wasFav) {
      setRows((prev) => prev.filter((r) => r.id !== pageId));
    } else {
      setRows((prev) => prev.map((r) => (r.id === pageId ? { ...r, isFavorited: !wasFav } : r)));
    }
    setTabCounts((prev) => ({ ...prev, favorites: prev.favorites + (wasFav ? -1 : 1) }));

    // Notify the sidebar only AFTER the write commits. Dispatching eagerly
    // made the sidebar's refetch race the POST/DELETE and read the
    // pre-change state, so its Favorites list lagged one action behind.
    const notify = () => window.dispatchEvent(new CustomEvent("workflik:favorites-changed"));
    const req = wasFav
      ? fetch(`/api/user/favorites/${pageId}`, { method: "DELETE" })
      : fetch("/api/user/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId, workspaceId }),
        });
    // On failure, just resync from the server rather than trying to hand-
    // reconstruct exactly which optimistic change (patch vs. row removal) to
    // undo.
    req.then(notify).catch(refetch);
  }

  function togglePrivate(row: PageRow) {
    const next = !row.isPrivate;
    // Un-privating while viewing the Private tab drops the row immediately,
    // matching the old client-side filter's behavior.
    if (tab === "private" && !next) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } else {
      setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, isPrivate: next } : p)));
    }
    setTabCounts((prev) => ({ ...prev, private: prev.private + (next ? 1 : -1) }));
    fetch(`/api/pages/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrivate: next }),
    }).catch(refetch);
  }

  function toggleLocked(row: PageRow) {
    const next = !row.isLocked;
    setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, isLocked: next } : p)));
    fetch(`/api/pages/${row.id}/lock`, { method: "POST" }).catch(() => {
      setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, isLocked: !next } : p)));
    });
  }

  function toggleCollapse(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
      setRows((prev) => prev.filter((p) => !removed.has(p.id)));
      setSelectedIds(new Set());
      if (removed.size > 0) {
        window.dispatchEvent(new CustomEvent("pages:refresh"));
        refetch(); // reconcile totals/tab counts and refill this page from what's left
      }
      if (failed > 0) setDeleteErr(`Failed to delete ${failed} page${failed !== 1 ? "s" : ""}`);
    } catch { setDeleteErr("Network error"); }
    finally { setDeletingSelected(false); setConfirmDeleteSelected(false); }
  }

  const displayRows: DisplayRow[] = nestingActive
    ? buildDisplayRows(rows, collapsedIds)
    : rows.map((p) => ({ ...p, depth: 0, hasChildren: false }));

  const visibleIds   = displayRows.map((p) => p.id);
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
                  {tabCounts[t.id]}
                </span>
              </button>
            ))}
            {loading && (
              <Loader2 size={13} className="ml-2 shrink-0 animate-spin text-muted-foreground/50" />
            )}
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
                placeholder="Search by page name or creator…"
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

          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-border bg-card py-16">
              <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
            </div>
          ) : rows.length === 0 ? (
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
              <div className={`divide-y divide-border/40 transition-opacity duration-150 ${loading ? "opacity-60" : ""}`}>
                {displayRows.map((page) => {
                  const isChecked = selectedIds.has(page.id);
                  return (
                  <div
                    key={page.id}
                    onClick={() => router.push(`/app/${workspaceSlug}/${page.shortId}?from=library`)}
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
                    <div
                      className="relative z-10 flex min-w-0 items-center gap-2.5 pr-4"
                      style={{ paddingLeft: page.depth * 22 }}
                    >
                      {page.hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleCollapse(page.id); }}
                          className="flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground/50 transition-colors duration-150 hover:bg-accent hover:text-foreground"
                        >
                          {collapsedIds.has(page.id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        </button>
                      ) : page.depth > 0 ? (
                        <span className="size-4 shrink-0" />
                      ) : null}
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background">
                        <PageIcon icon={page.icon} kind={page.kind} />
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-sm text-foreground ${page.depth > 0 ? "font-normal" : "font-medium"}`}>
                        {page.title || "Untitled"}
                      </span>
                      {/* Private toggle — same hover-reveal-when-off pattern as the favorite star */}
                      <div className="group/private relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => togglePrivate(page)}
                          className={`flex size-6 items-center justify-center rounded transition-all duration-150 ${
                            page.isPrivate
                              ? "text-muted-foreground/60 hover:text-foreground"
                              : "text-muted-foreground/30 opacity-0 group-hover/row:opacity-100 hover:text-foreground"
                          }`}
                        >
                          <EyeOff size={12} />
                        </button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover/private:opacity-100">
                          <p className="text-xs font-semibold text-popover-foreground">
                            {page.isPrivate ? "Private — only you and invited people can access" : "Make private"}
                          </p>
                        </div>
                      </div>

                      {/* Lock toggle — same hover-reveal-when-off pattern as the favorite star */}
                      <div className="group/locked relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleLocked(page)}
                          className={`flex size-6 items-center justify-center rounded transition-all duration-150 ${
                            page.isLocked
                              ? "text-warning/70 hover:text-warning"
                              : "text-muted-foreground/30 opacity-0 group-hover/row:opacity-100 hover:text-foreground"
                          }`}
                        >
                          <Lock size={12} />
                        </button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover/locked:opacity-100">
                          <p className="text-xs font-semibold text-popover-foreground">
                            {page.isLocked ? "Locked — editing disabled" : "Lock page"}
                          </p>
                        </div>
                      </div>

                      {/* Favorite button with tooltip */}
                      <div className="group/fav relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(page.id)}
                          className={`flex size-6 items-center justify-center rounded transition-all duration-150 ${
                            page.isFavorited
                              ? "text-warning"
                              : "text-muted-foreground/30 opacity-0 group-hover/row:opacity-100 hover:text-warning"
                          }`}
                        >
                          <Star size={13} fill={page.isFavorited ? "currentColor" : "none"} />
                        </button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover/fav:opacity-100">
                          <p className="text-xs font-semibold text-popover-foreground">
                            {page.isFavorited ? "Remove from favorites" : "Add to favorites"}
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
                            setRows((prev) => prev.filter((p) => p.id !== page.id));
                            setSelectedIds((prev) => {
                              if (!prev.has(page.id)) return prev;
                              const next = new Set(prev);
                              next.delete(page.id);
                              return next;
                            });
                            window.dispatchEvent(new CustomEvent("pages:refresh"));
                            refetch(); // reconcile totals/tab counts and refill this page
                          }}
                          onDuplicated={() => {
                            refetch();
                            window.dispatchEvent(new CustomEvent("pages:refresh"));
                          }}
                        />
                      </PagePrivacyProvider>
                    </span>
                  </div>
                  );
                })}
              </div>

              {/* Footer: rows per page · go to page · prev/numbered/next */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 px-5 py-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <span>Rows per page</span>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={pageSizeInput}
                      onChange={(e) => setPageSizeInput(e.target.value)}
                      onBlur={submitPageSizeInput}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="w-12 rounded-[var(--radius-sm)] border border-border bg-card py-1 pl-2 pr-5 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                    />
                    <div className="absolute right-1 flex flex-col">
                      <button
                        type="button"
                        aria-label="Increase rows per page"
                        onClick={() => changePageSize(pageSize + 5)}
                        className="flex h-2.5 items-center text-muted-foreground/50 hover:text-foreground"
                      >
                        <ChevronUp size={10} />
                      </button>
                      <button
                        type="button"
                        aria-label="Decrease rows per page"
                        onClick={() => changePageSize(pageSize - 5)}
                        className="flex h-2.5 items-center text-muted-foreground/50 hover:text-foreground"
                      >
                        <ChevronDown size={10} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <span>Go to page</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={goToPageInput}
                    placeholder={`1–${totalPages}`}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitGoToPage(); }}
                    className="w-16 rounded-[var(--radius-sm)] border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => submitGoToPage()}
                    disabled={!goToPageInput}
                    className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    GO
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft size={12} />
                    Previous
                  </button>

                  {getPageNumbers(currentPage, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground/50">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        className={`flex size-6 items-center justify-center rounded-[var(--radius-sm)] border text-xs font-medium transition-colors duration-150 ${
                          p === currentPage
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={12} />
                  </button>
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
