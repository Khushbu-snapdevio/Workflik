"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X as XIcon, MessageSquare as ChatTextIcon, FileText as FileTextIcon, MessageCircle as ChatDotsIcon } from "lucide-react";
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
  }, [pageId, open]);

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
        className={`relative flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-colors ${
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <ChatTextIcon size={14} />
        Comments
        {unresolvedCount != null && unresolvedCount > 0 && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground leading-none">
            {unresolvedCount}
          </span>
        )}
      </button>

      {/* Panel portal */}
      {mounted && open && createPortal(
        <>
          {/* Invisible backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 599 }}
            onClick={() => setOpen(false)}
          />

          {/* Slide-in panel */}
          <div
            className="fixed top-3 right-3 bottom-3 z-[600] flex w-[380px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border/50 bg-background"
            style={{}}
          >
            {/* ── Header ── */}
            <div className="shrink-0 border-b border-border/40 bg-card">
              <div className="flex items-center justify-between px-4 pt-4 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 border border-primary/[0.12]">
                    <FileTextIcon size={15} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-foreground leading-tight">Page Comments</p>
                      <span className="inline-flex items-center rounded-full bg-primary/[0.08] px-1.5 py-px text-[9px] font-bold text-primary border border-primary/20 leading-none">
                        PAGE
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 leading-tight mt-0.5">
                      {unresolvedCount != null && unresolvedCount > 0
                        ? `${unresolvedCount} open · whole page`
                        : "Whole page · not block-specific"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
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
