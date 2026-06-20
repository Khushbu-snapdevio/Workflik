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
  if (icon) return <span className="text-lg leading-none">{icon}</span>;
  if (kind === "database") {
    return (
      <svg className="size-5 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="9" x2="9" y2="21"/>
      </svg>
    );
  }
  return (
    <svg className="size-5 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

export function TrashClient({ pages, workspaceSlug }: { pages: TrashedPage[]; workspaceSlug: string }) {
  const router = useRouter();
  const [search, setSearch]           = useState("");
  const [restoring, setRestoring]     = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TrashedPage | null>(null);
  const [localPages, setLocalPages]   = useState(pages);

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
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-8 py-10">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-100">
              <svg className="size-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Trash</h1>
              <p className="text-xs text-muted-foreground">
                {localPages.length > 0
                  ? `${localPages.length} page${localPages.length !== 1 ? "s" : ""} — permanently deleted after 30 days`
                  : "Pages moved to Trash are permanently deleted after 30 days"}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30">
            <svg className="size-3.5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="w-44 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="Search trash…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-24 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <svg className="size-8 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.3} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {search ? "No pages match" : "Trash is empty"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search ? `No results for "${search}"` : "Deleted pages will appear here"}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border bg-muted/30 px-5 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground">Page name</span>
              <span className="w-32 text-xs font-semibold text-muted-foreground">Deleted by</span>
              <span className="w-28 text-xs font-semibold text-muted-foreground">Deleted</span>
              <span className="w-48 text-right text-xs font-semibold text-muted-foreground">Actions</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/60">
              {filtered.map((page) => {
                const left = page.deletedAt ? daysLeft(page.deletedAt) : 30;
                const urgent = left <= 7;
                return (
                  <div
                    key={page.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30"
                  >
                    {/* Name */}
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 opacity-70">
                        <PageIcon icon={page.icon} kind={page.kind} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground/80">
                          {page.title || "Untitled"}
                        </p>
                        <p className={`text-xs ${urgent ? "text-red-500" : "text-muted-foreground/60"}`}>
                          {urgent
                            ? left === 0 ? "Deletes today" : `Deletes in ${left}d`
                            : `Deletes in ${left} days`}
                        </p>
                      </div>
                    </div>

                    {/* Deleted by */}
                    <div className="w-32">
                      <span className="truncate text-xs text-muted-foreground">
                        {page.deletedByName}
                      </span>
                    </div>

                    {/* Deleted at */}
                    <div className="w-28">
                      <span className="text-xs text-muted-foreground">
                        {page.deletedAt ? timeAgo(page.deletedAt) : "—"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex w-48 shrink-0 items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={restoring === page.id || !!deleting}
                        onClick={() => handleRestore(page)}
                        className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
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
                        className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 bg-background px-3 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting === page.id ? (
                          "Deleting…"
                        ) : (
                          <>
                            <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4h6v2"/>
                            </svg>
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

      {/* Permanent delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative w-[400px] rounded-2xl border border-border bg-popover p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <svg className="size-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Delete forever?</h2>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 opacity-60">
                  <PageIcon icon={confirmDelete.icon} kind={confirmDelete.kind} />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {confirmDelete.title || "Untitled"}
                </span>
              </div>
            </div>
            <p className="mb-5 text-sm text-muted-foreground">
              This page will be permanently deleted and cannot be recovered. All content, comments, and history will be lost.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
