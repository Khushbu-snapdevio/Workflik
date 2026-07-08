"use client";

import { useEffect, useState } from "react";
import { MessageSquare as ChatTextIcon } from "lucide-react";

interface Props {
  pageId:        string;
  workspaceId:   string;
  currentUserId: string;
  isAdmin:       boolean;
}

// Topbar "Comments" button for database entry pages — jumps to the
// page-level comments section at the bottom of the page (Notion-style: only
// entries/records get a whole-page comment thread; plain pages don't render
// this button at all and use block comments only).
export function PageCommentButton({ pageId }: Props) {
  const [unresolvedCount, setUnresolvedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/pages/${pageId}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        // Property-scoped comments (propertyId set) belong to their own cell
        // popover, not this whole-page thread — exclude them from the count.
        const count = (data.comments as Array<{ blockId: string | null; propertyId: string | null; isResolved: boolean; deletedAt: string | null }>)
          .filter((t) => !t.blockId && !t.propertyId && !t.isResolved && !t.deletedAt).length;
        setUnresolvedCount(count);
      })
      .catch(() => {});
  }, [pageId]);

  return (
    <button
      type="button"
      onClick={() => {
        document
          .getElementById("page-comments-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className="relative flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <ChatTextIcon size={14} />
      Comments
      {unresolvedCount != null && unresolvedCount > 0 && (
        <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
          {unresolvedCount}
        </span>
      )}
    </button>
  );
}
