"use client";

import { ClockIcon } from "@phosphor-icons/react";
import Link from "next/link";

type RecentItem = {
  id: string;
  pageId: string;
  visitedAt: string;
};

type PageItem = {
  id: string;
  shortId: string;
  title: string;
  icon: string | null;
};

type Props = {
  items: RecentItem[];
  pagesMap: Record<string, PageItem>;
  workspaceSlug: string;
};

export function RecentlyVisitedSection({ items, pagesMap, workspaceSlug }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="px-2 py-2">
      <div className="mb-1 flex items-center gap-2 px-2">
        <ClockIcon className="text-sidebar-foreground/30" size={11} />
        <span className="text-2xs font-semibold uppercase tracking-ui text-sidebar-foreground/30">
          Recently Visited
        </span>
      </div>

      {items.map((item) => {
        const page = pagesMap[item.pageId];
        if (!page) return null;
        return (
          <Link
            key={item.id}
            href={`/${workspaceSlug}/${page.shortId}`}
            className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {page.icon ? (
              <span className="shrink-0 text-sm leading-none">{page.icon}</span>
            ) : (
              <svg
                className="size-3 shrink-0 text-sidebar-foreground/30"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className="min-w-0 truncate">{page.title || "Untitled"}</span>
          </Link>
        );
      })}
    </div>
  );
}
