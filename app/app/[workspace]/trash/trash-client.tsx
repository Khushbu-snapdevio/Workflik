"use client";

import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FileText, Loader2, RotateCcw, Search, Trash2, X } from "lucide-react";
import { PageIcon as SharedPageIcon } from "@/components/pages/page-icon";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE, getPageNumbers } from "@/lib/ui/pagination";
import { toast } from "sonner";

type TrashedPage = {
  id:            string;
  shortId:       string;
  title:         string;
  icon:          string | null;
  kind:          string;
  deletedAt:     string | null;
  deletedByName: string;
};

function daysLeft(iso: string) {
  const deleted   = new Date(iso).getTime();
  const remaining = 30 - Math.floor((Date.now() - deleted) / 86400000);
  return Math.max(0, remaining);
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 30)  return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PageIcon({ icon, kind }: { icon: string | null; kind: string }) {
  if (icon) return <SharedPageIcon icon={icon} size={14} />;
  if (kind === "database") return (
    <svg className="size-4 shrink-0 text-muted-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  );
  return <FileText size={16} className="shrink-0 text-muted-foreground-subtle" />;
}

export function TrashClient({ pages, workspaceSlug }: { pages: TrashedPage[]; workspaceSlug: string }) {
  void workspaceSlug;
  const router = useRouter();

  const [search, setSearch]               = useState("");
  const [restoring, setRestoring]         = useState<string | null>(null);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TrashedPage | null>(null);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [restoringSelected, setRestoringSelected] = useState(false);
  const [localPages, setLocalPages]       = useState(pages);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());

  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  // Decoupled from `pageSize` so the field can be freely typed into (cleared,
  // mid-edit) without a controlled-input value snapping back on every
  // keystroke — only reconciled on blur/Enter/stepper click.
  const [pageSizeInput, setPageSizeInput] = useState(String(DEFAULT_PAGE_SIZE));
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState("");

  const filtered = localPages.filter((p) =>
    !search || (p.title || "Untitled").toLowerCase().includes(search.toLowerCase())
  );

  function changeSearch(val: string) {
    setSearch(val);
    setCurrentPage(1);
  }

  function changePageSize(next: number) {
    const clamped = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, next));
    setPageSize(clamped);
    setPageSizeInput(String(clamped));
    setCurrentPage(1);
  }

  function submitPageSizeInput() {
    const n = Number.parseInt(pageSizeInput, 10);
    changePageSize(Number.isFinite(n) ? n : pageSize);
  }

  function goToPage(p: number, totalPages: number) {
    setCurrentPage(Math.min(totalPages, Math.max(1, p)));
  }

  function submitGoToPage(totalPages: number) {
    const n = Number.parseInt(goToPageInput, 10);
    if (Number.isFinite(n)) goToPage(n, totalPages);
    setGoToPageInput("");
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page       = Math.min(currentPage, totalPages);
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allSelected   = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));
  const someSelected  = filtered.some((p) => selectedIds.has(p.id));
  const selectedCount = [...selectedIds].filter((id) => localPages.some((p) => p.id === id)).length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedIds(new Set(localPages.map((p) => p.id)));
  }

  async function handleRestore(page: TrashedPage) {
    setRestoring(page.id);
    try {
      const res = await fetch(`/api/pages/${page.id}/restore`, { method: "POST" });
      if (res.ok) {
        setLocalPages((prev) => prev.filter((p) => p.id !== page.id));
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(page.id); return n; });
        router.refresh();
      }
    } finally {
      setRestoring(null);
    }
  }

  async function handleDelete(page: TrashedPage) {
    setDeleting(page.id);
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
      if (res.ok) {
        setLocalPages((prev) => prev.filter((p) => p.id !== page.id));
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(page.id); return n; });
      }
    } finally {
      setDeleting(null);
    }
  }

  async function handleRestoreSelected() {
    setRestoringSelected(true);
    const ids = [...selectedIds];
    try {
      // One transactional request rather than N concurrent ones. Firing a POST
      // per page raced: a child processed before its parent saw the parent
      // still deleted and detached itself to the workspace root, so sub-pages
      // and database entries came back orphaned (and entries, filtered out of
      // the page tree, looked like they hadn't come back at all).
      const res = await fetch("/api/pages/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Couldn't restore the selected pages.");
        return;
      }
      const data = await res.json() as { restored?: number };
      setLocalPages((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelectedIds(new Set());
      toast.success(
        data.restored && data.restored > ids.length
          ? `Restored ${ids.length} item${ids.length === 1 ? "" : "s"} (with ${data.restored - ids.length} nested page${data.restored - ids.length === 1 ? "" : "s"}).`
          : `Restored ${data.restored ?? ids.length} item${(data.restored ?? ids.length) === 1 ? "" : "s"}.`
      );
      router.refresh();
    } catch {
      toast.error("Couldn't restore the selected pages.");
    } finally {
      setRestoringSelected(false);
    }
  }

  async function handleDeleteSelected() {
    setDeletingSelected(true);
    setConfirmDeleteSelected(false);
    const ids = [...selectedIds];
    try {
      // Bounded concurrency + per-request status checks. The previous
      // Promise.all fired every request at once and treated any response —
      // including 4xx/5xx — as success, so failures silently vanished from the
      // UI while the rows were still in the Trash.
      const failed: string[] = [];
      const CHUNK = 10;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const results = await Promise.all(
          slice.map((id) =>
            fetch(`/api/pages/${id}`, { method: "DELETE" })
              .then((r) => (r.ok ? null : id))
              .catch(() => id)
          )
        );
        failed.push(...results.filter((r): r is string => r !== null));
      }
      const okIds = ids.filter((id) => !failed.includes(id));
      setLocalPages((prev) => prev.filter((p) => !okIds.includes(p.id)));
      setSelectedIds(new Set());
      if (failed.length > 0) {
        toast.error(`Deleted ${okIds.length}, but ${failed.length} couldn't be deleted.`);
      } else {
        toast.success(`Permanently deleted ${okIds.length} item${okIds.length === 1 ? "" : "s"}.`);
      }
      router.refresh();
    } finally {
      setDeletingSelected(false);
    }
  }

  const busy = deletingSelected || restoringSelected || !!restoring || !!deleting;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Topbar ── */}
      <div className="shrink-0 bg-card">
        <div className="mx-auto flex w-full max-w-275 items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted">
              <Trash2 size={15} className="text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Trash</h1>
              <p className="text-xs text-muted-foreground">
                {localPages.length > 0
                  ? `${localPages.length} page${localPages.length !== 1 ? "s" : ""} — permanently deleted after 30 days`
                  : "Deleted pages are permanently removed after 30 days"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete selected — shown only when rows are checked */}
            {selectedCount > 0 && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedIds(new Set())}
                  className="flex h-8 items-center gap-1.5 rounded-sm px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <X size={12} />
                  Clear
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRestoreSelected}
                  className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-sm border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {restoringSelected ? (
                    <><Loader2 size={12} className="animate-spin" />Restoring…</>
                  ) : (
                    <><RotateCcw size={12} />Restore selected ({selectedCount})</>
                  )}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDeleteSelected(true)}
                  className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-sm border border-destructive/40 bg-destructive/8 px-3 text-xs font-medium text-destructive transition-colors hover:border-destructive/70 hover:bg-destructive/15 disabled:opacity-50"
                >
                  {deletingSelected ? (
                    <><Loader2 size={12} className="animate-spin" />Deleting…</>
                  ) : (
                    <><Trash2 size={12} />Delete selected ({selectedCount})</>
                  )}
                </button>
              </>
            )}

            {/* Delete all — selects all rows */}
            {localPages.length > 0 && selectedCount === 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={handleSelectAll}
                className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-sm border border-destructive/30 bg-destructive/5 px-3 text-xs font-medium text-destructive transition-colors hover:border-destructive/60 hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 size={12} />
                Delete all
              </button>
            )}

            {/* Search */}
            <div className="flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1.5 transition-colors duration-150 focus-within:border-border">
              <Search size={13} className="shrink-0 text-muted-foreground" />
              <input
                className="w-44 bg-transparent text-xs text-foreground placeholder:text-muted-foreground-subtle focus:outline-none"
                placeholder="Search trash…"
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                type="text"
              />
              {search && (
                <button type="button" onClick={() => changeSearch("")} className="text-muted-foreground-subtle transition-colors hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto py-6">
        <div className="mx-auto w-full max-w-275 px-4 sm:px-6 lg:px-8">

          {/* Empty state */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-20 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-md bg-muted">
                <Trash2 size={20} className="text-muted-foreground-subtle" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {search ? "No pages match" : "Trash is empty"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search ? `No results for "${search}"` : "Deleted pages will appear here for 30 days"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {/* Table header */}
              <div className="grid grid-cols-[36px_1fr_160px_120px_200px] items-center border-b border-border bg-muted/30 px-5 py-2.5">
                {/* Select-all checkbox */}
                <div className="flex items-center">
                  <label className="flex cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleSelectAll}
                      className="sr-only"
                    />
                    <span className={`flex size-3.75 shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                      allSelected
                        ? "border-primary bg-primary"
                        : someSelected
                          ? "border-primary bg-primary/20"
                          : "border-border bg-background hover:border-primary/50"
                    }`}>
                      {allSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                      {someSelected && !allSelected && (
                        <span className="block h-0.5 w-2 rounded-full bg-primary" />
                      )}
                    </span>
                  </label>
                </div>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">Page name</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">Deleted by</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">Deleted</span>
                <span className="text-right text-xs font-semibold tracking-wide text-muted-foreground">Actions</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {visibleRows.map((page) => {
                  const left     = page.deletedAt ? daysLeft(page.deletedAt) : 30;
                  const urgent   = left <= 7;
                  const isChecked = selectedIds.has(page.id);
                  return (
                    <div
                      key={page.id}
                      className="grid grid-cols-[36px_1fr_160px_120px_200px] items-center px-5 py-3.5 transition-colors duration-150 hover:bg-accent"
                    >
                      {/* Checkbox */}
                      <div className="flex items-center">
                        <label className="relative flex size-5 cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRow(page.id)}
                            className="sr-only"
                          />
                          <span className={`flex size-3.75 shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                            isChecked ? "border-primary bg-primary" : "border-border bg-background hover:border-primary/50"
                          }`}>
                            {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                          </span>
                        </label>
                      </div>

                      {/* Name */}
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="shrink-0 opacity-60">
                          <PageIcon icon={page.icon} kind={page.kind} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {page.title || "Untitled"}
                          </p>
                          <p className={`text-xs ${urgent ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                            {urgent
                              ? left === 0 ? "Deletes today" : `Deletes in ${left}d`
                              : `Deletes in ${left} days`}
                          </p>
                        </div>
                      </div>

                      {/* Deleted by */}
                      <span className="truncate text-xs text-muted-foreground">
                        {page.deletedByName}
                      </span>

                      {/* Deleted at */}
                      <span className="text-xs text-muted-foreground">
                        {page.deletedAt ? timeAgo(page.deletedAt) : "—"}
                      </span>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRestore(page)}
                          className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-sm border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                        >
                          {restoring === page.id ? (
                            <><Loader2 size={12} className="animate-spin" />Restoring…</>
                          ) : (
                            <><RotateCcw size={12} />Restore</>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmDelete(page)}
                          className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-sm border border-border bg-card px-3 text-xs font-medium text-destructive transition-colors hover:border-destructive/40 hover:bg-destructive/5 disabled:opacity-50"
                        >
                          {deleting === page.id ? "Deleting…" : <><Trash2 size={12} />Delete permanently</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer: rows per page · go to page · prev/numbered/next */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pageSizeInput}
                      // Digits only — this accepted arbitrary text before.
                      onChange={(e) => setPageSizeInput(e.target.value.replace(/[^0-9]/g, ""))}
                      onBlur={submitPageSizeInput}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      // w-16, not w-12: pl-2 + pr-5 eats 28px of the box, so a
                      // 3-digit value like "100" was clipped at the old width.
                      className="w-16 rounded-sm border border-border bg-card py-1 pl-2 pr-5 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                    />
                    <div className="absolute right-1 flex flex-col">
                      <button
                        type="button"
                        aria-label="Increase rows per page"
                        onClick={() => changePageSize(pageSize + 5)}
                        className="flex h-2.5 items-center text-muted-foreground-subtle hover:text-foreground"
                      >
                        <ChevronUp size={10} />
                      </button>
                      <button
                        type="button"
                        aria-label="Decrease rows per page"
                        onClick={() => changePageSize(pageSize - 5)}
                        className="flex h-2.5 items-center text-muted-foreground-subtle hover:text-foreground"
                      >
                        <ChevronDown size={10} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Go to page</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={goToPageInput}
                    placeholder={`1–${totalPages}`}
                    // Digits only. Mirrors the rows-per-page input rather than
                    // using type="number", which still accepts "e"/"+"/"-" and
                    // mutates on scroll-wheel.
                    onChange={(e) => setGoToPageInput(e.target.value.replace(/[^0-9]/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitGoToPage(totalPages); }}
                    className="w-20 rounded-sm border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground-subtle focus:border-primary/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => submitGoToPage(totalPages)}
                    disabled={!goToPageInput}
                    className="rounded-sm border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    GO
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1, totalPages)}
                    disabled={page <= 1}
                    className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft size={12} />
                    Previous
                  </button>

                  {getPageNumbers(page, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground-subtle">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p, totalPages)}
                        className={`flex size-6 items-center justify-center rounded-sm border text-xs font-medium transition-colors duration-150 ${
                          p === page
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
                    onClick={() => goToPage(page + 1, totalPages)}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
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

      {/* Delete selected confirmation */}
      <AlertDialog open={confirmDeleteSelected} onOpenChange={(o) => !o && setConfirmDeleteSelected(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} selected item{selectedCount !== 1 ? "s" : ""} permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              These pages will be permanently deleted and cannot be recovered. All content, comments, and history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>
              Delete {selectedCount} permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single-page delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && (
                <span className="flex items-center gap-2 mb-2 p-2.5 rounded-sm border border-border bg-muted/30">
                  <span className="shrink-0 opacity-50"><PageIcon icon={confirmDelete.icon} kind={confirmDelete.kind} /></span>
                  <span className="font-medium text-foreground">{confirmDelete.title || "Untitled"}</span>
                </span>
              )}
              This page will be permanently deleted and cannot be recovered. All content, comments, and history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
