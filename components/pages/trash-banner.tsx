"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TrashBannerProps {
  pageId:        string;
  workspaceSlug: string;
}

export function TrashBanner({ pageId, workspaceSlug }: TrashBannerProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoring,   setRestoring]   = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  async function handleRestore() {
    setRestoring(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/restore`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setRestoring(false);
    }
  }

  async function handlePermanentDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
      if (res.ok) router.push(`/app/${workspaceSlug}`);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      {/* ── Banner ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <div className="flex items-center gap-2.5">
          <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          This page is in <strong className="mx-1">Trash</strong>. It will be permanently deleted in 30 days.
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring || deleting}
            className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {restoring ? "Restoring…" : "Restore"}
          </button>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={restoring || deleting}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Delete permanently
          </button>
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2.5 text-destructive">
              <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              <h3 className="text-base font-semibold text-foreground">Delete permanently?</h3>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              This page and all its subpages will be permanently deleted. This action <strong>cannot be undone</strong>.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={deleting}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
