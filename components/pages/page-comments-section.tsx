"use client";

import { MessageCircle as ChatDotsIcon } from "lucide-react";
import { CommentCard } from "@/components/editor/comment-card";

interface Props {
  pageId: string;
  workspaceId: string;
  currentUserId: string;
  isAdmin: boolean;
}

// Page-level (blockId-less) comments rendered as a running discussion thread
// at the bottom of the page content — matching Notion, which shows these
// inline below the last block instead of in a side panel.
export function PageCommentsSection({
  pageId,
  workspaceId,
  currentUserId,
  isAdmin,
}: Props) {
  return (
    <div
      className="mt-12 border-t border-border/50 pt-6"
      id="page-comments-section"
    >
      <div className="mb-1 flex items-center gap-2 px-4 text-sm font-semibold text-foreground/80">
        <ChatDotsIcon size={15} className="text-muted-foreground" />
        Comments
      </div>
      <CommentCard
        blockId={null}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={() => {}}
        pageId={pageId}
        variant="inline"
        workspaceId={workspaceId}
      />
    </div>
  );
}
