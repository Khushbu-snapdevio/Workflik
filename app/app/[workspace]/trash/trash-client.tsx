"use client";

import { Check, FileText, Loader2, RotateCcw, Search, Trash2, X } from "lucide-react";
import { PageIcon as SharedPageIcon } from "@/components/pages/page-icon";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    <svg className="size-4 shrink-0 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  );
  return <FileText size={16} className="shrink-0 text-muted-foreground/40" />;
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
  const [localPages, setLocalPages]       = useState(pages);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());

  const filtered = localPages.filter((p) =>
    !search || (p.title || "Untitled").toLowerCase().includes(search.toLowerCase())
  );

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

  async function handleDeleteSelected() {
    setDeletingSelected(true);
    setConfirmDeleteSelected(false);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => fetch(`/api/pages/${id}`, { method: "DELETE" })));
      setLocalPages((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setDeletingSelected(false);
    }
  }

  const busy = deletingSelected || !!restoring || !!deleting;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Topbar ── */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted">
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
                  className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <X size={12} />
                  Clear
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDeleteSelected(true)}
                  className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-destructive/40 bg-destructive/8 px-3 text-xs font-medium text-destructive transition-colors hover:border-destructive/70 hover:bg-destructive/15 disabled:opacity-50"
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
                className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/5 px-3 text-xs font-medium text-destructive transition-colors hover:border-destructive/60 hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 size={12} />
                Delete all
              </button>
            )}

            {/* Search */}
            <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 transition-colors duration-150 focus-within:border-border">
              <Search size={13} className="shrink-0 text-muted-foreground/60" />
              <input
                className="w-44 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                placeholder="Search trash…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-muted-foreground/50 transition-colors hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto py-6">
        <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 lg:px-8">

          {/* Empty state */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-border bg-card py-20 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-muted">
                <Trash2 size={20} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {search ? "No pages match" : "Trash is empty"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search ? `No results for "${search}"` : "Deleted pages will appear here for 30 days"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
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
                    <span className={`flex size-[15px] shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                      allSelected
                        ? "border-primary bg-primary"
                        : someSelected
                          ? "border-primary bg-primary/20"
                          : "border-border/60 bg-background hover:border-primary/50"
                    }`}>
                      {allSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                      {someSelected && !allSelected && (
                        <span className="block h-0.5 w-2 rounded-full bg-primary" />
                      )}
                    </span>
                  </label>
                </div>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Page name</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Deleted by</span>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground/60">Deleted</span>
                <span className="text-right text-xs font-semibold tracking-wide text-muted-foreground/60">Actions</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/40">
                {filtered.map((page) => {
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
                          <span className={`flex size-[15px] shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                            isChecked ? "border-primary bg-primary" : "border-border/50 bg-background hover:border-primary/50"
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
                          <p className={`text-xs ${urgent ? "font-medium text-destructive" : "text-muted-foreground/60"}`}>
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
                          className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
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
                          className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-card px-3 text-xs font-medium text-destructive transition-colors hover:border-destructive/40 hover:bg-destructive/5 disabled:opacity-50"
                        >
                          {deleting === page.id ? "Deleting…" : <><Trash2 size={12} />Delete permanently</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                <span className="flex items-center gap-2 mb-2 p-2.5 rounded-[var(--radius-sm)] border border-border bg-muted/30">
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
