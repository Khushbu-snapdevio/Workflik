"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon, ChatTextIcon } from "@phosphor-icons/react";
import { CommentCard } from "@/components/editor/comment-card";

interface Props {
  pageId:        string;
  workspaceId:   string;
  currentUserId: string;
  isAdmin:       boolean;
}

export function PageCommentButton({ pageId, workspaceId, currentUserId, isAdmin }: Props) {
  const [open, setOpen]                       = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState<number | null>(null);
  const [mounted, setMounted]                 = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch(`/api/pages/${pageId}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const count = (data.comments as Array<{ blockId: string | null; isResolved: boolean; deletedAt: string | null }>)
          .filter((t) => !t.blockId && !t.isResolved && !t.deletedAt).length;
        setUnresolvedCount(count);
      })
      .catch(() => {});
  }, [pageId, open]); // re-fetch when panel closes so badge stays current

  // Close panel on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
          open
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <ChatTextIcon size={14} />
        Comments
        {unresolvedCount != null && unresolvedCount > 0 && (
          <span className="rounded-full bg-blue-500 px-1.5 py-px text-[10px] font-semibold text-white leading-none">
            {unresolvedCount}
          </span>
        )}
      </button>

      {/* Right-side panel portal */}
      {mounted && open && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 190 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            className="fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl flex flex-col"
            style={{ width: 380, zIndex: 191 }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <ChatTextIcon size={16} className="text-gray-500" />
                <span className="text-[14px] font-semibold text-gray-900 tracking-tight">Page comments</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <XIcon size={14} weight="bold" />
              </button>
            </div>

            {/* Comments content — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <CommentCard
                variant="inline"
                pageId={pageId}
                workspaceId={workspaceId}
                blockId={null}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
