"use client";

import { CommentCard } from "@/components/editor/comment-card";

interface Props {
  pageId: string;
  workspaceId: string;
  currentUserId: string;
  isAdmin: boolean;
  /** See CommentCard's onActiveCountChange — lets the parent page react
   *  instantly (no refetch, no blink) when resolving/reopening changes
   *  whether any active page-level thread remains. */
  onActiveCountChange?: (count: number) => void;
}

// Page-level (blockId-less) comments — matching Notion, which shows these
// right below the title, above the page's own content, with a divider
// separating them from what follows rather than above them.
export function PageCommentsSection({
  pageId,
  workspaceId,
  currentUserId,
  isAdmin,
  onActiveCountChange,
}: Props) {
  return (
    <div
      className="mb-6 border-b border-border/50 pb-4"
      id="page-comments-section"
    >
      <CommentCard
        blockId={null}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onActiveCountChange={onActiveCountChange}
        onClose={() => {}}
        pageId={pageId}
        variant="inline"
        workspaceId={workspaceId}
      />
    </div>
  );
}
