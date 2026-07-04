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
  /** "scroll" jumps to the page-bottom comments section (matches Notion's
   *  document pages); "drawer" (default) keeps the slide-in side panel,
   *  still used on database pages where there's no natural "bottom". */
  mode?: "scroll" | "drawer";
}

export function PageCommentButton({ pageId, workspaceId, currentUserId, isAdmin, mode = "drawer" }: Props) {
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
        onClick={() => {
          if (mode === "scroll") {
            document
              .getElementById("page-comments-section")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
          setOpen((v) => !v);
        }}
        className={`relative flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-colors ${
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <ChatTextIcon size={14} />
        Comments
        {unresolvedCount != null && unresolvedCount > 0 && (
          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
            {unresolvedCount}
          </span>
        )}
      </button>

      {/* Panel portal */}
      {mode === "drawer" && mounted && open && createPortal(
        <>
          {/* Invisible backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 599 }}
            onClick={() => setOpen(false)}
          />

          {/* Slide-in panel */}
          <div
            className="fixed top-0 right-0 z-[600] flex h-full w-full max-w-[min(380px,100vw)] flex-col overflow-hidden border-l border-border bg-card"
          >
            {/* ── Header ── */}
            <div className="shrink-0 border-b border-border/40 bg-card">
              <div className="flex items-center justify-between px-4 pt-4 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 border border-primary/10">
                    <FileTextIcon size={15} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground leading-tight">Page Comments</p>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-px text-xs font-bold text-primary border border-primary/20 leading-none">
                        PAGE
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
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
