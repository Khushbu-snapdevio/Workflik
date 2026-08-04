"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TrashBannerProps {
 pageId:    string;
 workspaceSlug: string;
 parentShortId?: string | null;
 /** Nearest other top-level item (previous, or next if this was first) —
  *  used as the fallback destination when this page has no parent. Ignored
  *  when `parentShortId` is set. */
 rootFallbackShortId?: string | null;
}

export function TrashBanner({ pageId, workspaceSlug, parentShortId, rootFallbackShortId }: TrashBannerProps) {
 const router = useRouter();
 const [confirming, setConfirming] = useState(false);
 const [restoring, setRestoring]  = useState(false);
 const [deleting, setDeleting]   = useState(false);

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
   // No parent → nearest other top-level item (sidebar order), or workspace
   // home if this was the only one.
   const fallbackShortId = parentShortId ?? rootFallbackShortId ?? null;
   router.push(fallbackShortId ? `/app/${workspaceSlug}/${fallbackShortId}` : `/app/${workspaceSlug}`);
  } finally {
   setDeleting(false);
   setConfirming(false);
  }
 }

 return (
  <>
   {/* Trash banner */}
   <div className="mb-5 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
    <div className="flex items-center gap-2.5">
     <Trash2 size={16} className="shrink-0" />
     <span>
      This page is in <strong>Trash</strong>. It will be permanently deleted in 30 days.
     </span>
    </div>
    <div className="flex shrink-0 items-center gap-2">
     <button
      type="button"
      onClick={handleRestore}
      disabled={restoring || deleting}
      className="rounded-sm border border-destructive/40 bg-card px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
     >
      {restoring ? "Restoring…" : "Restore"}
     </button>
     <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={restoring || deleting}
      className="rounded-sm bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
     >
      Delete permanently
     </button>
    </div>
   </div>

   <ConfirmDialog
    open={confirming}
    onOpenChange={setConfirming}
    title="Delete permanently?"
    description="This page and all its content will be removed forever. This cannot be undone."
    confirmLabel="Delete forever"
    confirmLoadingLabel="Deleting…"
    loading={deleting}
    onConfirm={handlePermanentDelete}
   />
  </>
 );
}
