"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const deleted = new Date(iso).getTime();
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
  if (icon) return <span className="text-base leading-none">{icon}</span>;
  if (kind === "database") {
    return (
      <svg className="size-4 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="9" x2="9" y2="21"/>
      </svg>
    );
  }
  return (
    <svg className="size-4 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

export function TrashClient({ pages, workspaceSlug }: { pages: TrashedPage[]; workspaceSlug: string }) {
  const router = useRouter();
  const [search, setSearch]               = useState("");
  const [restoring, setRestoring]         = useState<string | null>(null);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TrashedPage | null>(null);
  const [localPages, setLocalPages]       = useState(pages);

  const filtered = localPages.filter((p) =>
    !search || (p.title || "Untitled").toLowerCase().includes(search.toLowerCase())
  );

  async function handleRestore(page: TrashedPage) {
    setRestoring(page.id);
    try {
      const res = await fetch(`/api/pages/${page.id}/restore`, { method: "POST" });
      if (res.ok) {
        setLocalPages((prev) => prev.filter((p) => p.id !== page.id));
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
      if (res.ok) setLocalPages((prev) => prev.filter((p) => p.id !== page.id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Topbar ── */}
      <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-red-50">
              <TrashIcon className="size-4 text-red-500" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold tracking-tight text-foreground">Trash</h1>
              <p className="text-[11px] text-muted-foreground">
                {localPages.length > 0
                  ? `${localPages.length} page${localPages.length !== 1 ? "s" : ""} — permanently deleted after 30 days`
                  : "Deleted pages are permanently removed after 30 days"}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background/70 px-3 py-1.5 text-xs transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20">
            <svg className="size-3.5 shrink-0 text-muted-foreground/60" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="w-44 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              placeholder="Search trash…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-muted-foreground/50 transition-colors hover:text-foreground">
                <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto py-6">
        <div className="mx-auto w-full max-w-[1100px] px-8">

          {/* Empty state */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border bg-muted/20 py-24 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50">
                <TrashIcon className="size-6 text-muted-foreground/30" />
              </div>
              <p className="text-[13.5px] font-semibold text-muted-foreground">
                {search ? "No pages match" : "Trash is empty"}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground/60">
                {search ? `No results for "${search}"` : "Deleted pages will appear here for 30 days"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_160px_120px_200px] items-center border-b border-border/60 bg-muted/40 px-5 py-2.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Page name</span>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Deleted by</span>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Deleted</span>
                <span className="text-right text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Actions</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/50">
                {filtered.map((page) => {
                  const left   = page.deletedAt ? daysLeft(page.deletedAt) : 30;
                  const urgent = left <= 7;
                  return (
                    <div
                      key={page.id}
                      className="grid grid-cols-[1fr_160px_120px_200px] items-center px-5 py-3.5 transition-colors hover:bg-accent/40"
                    >
                      {/* Name */}
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="shrink-0 opacity-60">
                          <PageIcon icon={page.icon} kind={page.kind} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {page.title || "Untitled"}
                          </p>
                          <p className={`text-[11px] ${urgent ? "font-medium text-red-500" : "text-muted-foreground/60"}`}>
                            {urgent
                              ? left === 0 ? "Deletes today" : `Deletes in ${left}d`
                              : `Deletes in ${left} days`}
                          </p>
                        </div>
                      </div>

                      {/* Deleted by */}
                      <span className="truncate text-[12px] text-muted-foreground">
                        {page.deletedByName}
                      </span>

                      {/* Deleted at */}
                      <span className="text-[12px] text-muted-foreground">
                        {page.deletedAt ? timeAgo(page.deletedAt) : "—"}
                      </span>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={restoring === page.id || !!deleting}
                          onClick={() => handleRestore(page)}
                          className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-card px-3 text-[12px] font-medium text-foreground/70 shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary disabled:opacity-50 active:scale-[0.97]"
                        >
                          {restoring === page.id ? (
                            <>
                              <svg className="size-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                              Restoring…
                            </>
                          ) : (
                            <>
                              <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
                                <path d="M3 3v5h5"/>
                              </svg>
                              Restore
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={!!restoring || !!deleting}
                          onClick={() => setConfirmDelete(page)}
                          className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-red-200/80 bg-card px-3 text-[12px] font-medium text-red-500 shadow-[var(--shadow-card)] transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 active:scale-[0.97]"
                        >
                          {deleting === page.id ? (
                            "Deleting…"
                          ) : (
                            <>
                              <TrashIcon className="size-3" />
                              Delete forever
                            </>
                          )}
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

      {/* ── Permanent delete confirmation dialog ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative w-[380px] overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--shadow-float)]">
            {/* Red accent top */}
            <div className="h-[3px] bg-gradient-to-r from-red-500 to-red-400/50" />
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-red-50">
                  <TrashIcon className="size-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-foreground">Delete forever?</h2>
                  <p className="text-[12px] text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 px-3.5 py-2.5">
                <span className="shrink-0 opacity-50">
                  <PageIcon icon={confirmDelete.icon} kind={confirmDelete.kind} />
                </span>
                <span className="text-[13px] font-medium text-foreground">
                  {confirmDelete.title || "Untitled"}
                </span>
              </div>

              <p className="mb-5 text-[12.5px] leading-relaxed text-muted-foreground">
                This page will be permanently deleted and cannot be recovered. All content, comments, and history will be lost.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-[var(--radius-sm)] border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-700 active:scale-[0.97]"
                >
                  <TrashIcon className="size-3.5" />
                  Delete forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
