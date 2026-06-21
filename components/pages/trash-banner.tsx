"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TrashBannerProps {
  pageId:        string;
  workspaceSlug: string;
}

export function TrashBanner({ pageId, workspaceSlug }: TrashBannerProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [restoring, setRestoring]   = useState(false);
  const [deleting, setDeleting]     = useState(false);

  async function handleRestore() {
    setRestoring(true);
    try {
      await fetch(`/api/pages/${pageId}/restore`, { method: "POST" });
      window.dispatchEvent(new CustomEvent("pages:refresh"));
      router.refresh();
    } finally {
      setRestoring(false);
    }
  }

  async function handlePermanentDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
      router.push(`/app/${workspaceSlug}`);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <>
      {/* Trash banner */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <div className="flex items-center gap-2.5">
          <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          <span>
            This page is in <strong>Trash</strong>. It will be permanently deleted in 30 days.
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring || deleting}
            className="rounded-[var(--radius-sm)] border border-red-300 bg-card px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {restoring ? "Restoring…" : "Restore"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={restoring || deleting}
            className="rounded-[var(--radius-sm)] bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Delete permanently
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirming(false); }}
        >
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-background p-6 shadow-[var(--shadow-raised)]">
            <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-red-100">
              <svg className="size-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h2 className="mb-1 text-base font-semibold text-foreground">
              Delete permanently?
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              This page and all its content will be removed forever. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="flex-1 rounded-[var(--radius-sm)] border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={deleting}
                className="flex-1 rounded-[var(--radius-sm)] bg-red-600 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
