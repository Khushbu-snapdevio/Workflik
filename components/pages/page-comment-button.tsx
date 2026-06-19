"use client";

import { useEffect, useState } from "react";

interface Props {
  pageId: string;
}

export function PageCommentButton({ pageId }: Props) {
  const [unresolvedCount, setUnresolvedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/pages/${pageId}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const count = (
          data.comments as Array<{ isResolved: boolean; deletedAt: string | null }>
        ).filter((t) => !t.isResolved && !t.deletedAt).length;
        setUnresolvedCount(count);
      })
      .catch(() => {});
  }, [pageId]);

  function scrollToComments() {
    document.getElementById("page-comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <button
      type="button"
      onClick={scrollToComments}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <svg
        className="size-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      Comments
      {unresolvedCount != null && unresolvedCount > 0 && (
        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 leading-none">
          {unresolvedCount}
        </span>
      )}
    </button>
  );
}
