"use client";

import { ChevronRight, FileText, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageIcon as SharedPageIcon } from "@/components/pages/page-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type FavPage = {
  id: string;
  pageId: string;
  shortId: string;
  title: string;
  icon: string | null;
};

function PageIcon({ icon }: { icon: string | null }) {
  if (icon) return <SharedPageIcon icon={icon} size={16} />;
  return <FileText size={14} className="text-muted-foreground-subtle" />;
}

export function HomeFavoritesSection({
  pages: initialPages,
  workspaceSlug,
  workspaceId,
}: {
  pages: FavPage[];
  workspaceSlug: string;
  workspaceId: string;
}) {
  const [pages, setPages] = useState(initialPages);

  function removeFavorite(pageId: string) {
    setPages((prev) => prev.filter((p) => p.pageId !== pageId));
    fetch(`/api/user/favorites/${pageId}`, { method: "DELETE" }).catch(() => {
      // rollback
      setPages((prev) => {
        const removed = initialPages.find((p) => p.pageId === pageId);
        return removed ? [...prev, removed] : prev;
      });
    });
    window.dispatchEvent(new CustomEvent("workflik:favorites-changed"));
  }

  if (pages.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Star size={14} className="shrink-0 text-warning" fill="currentColor" />
        <h2 className="text-sm font-semibold text-foreground">Favorites</h2>
        <span className="rounded-xs bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {pages.length}
        </span>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {pages.map((page) => (
          <div
            key={page.id}
            className="group/row relative flex items-center gap-3 border-l-2 border-l-transparent px-4 py-3 transition-all duration-150 hover:border-l-primary hover:bg-primary/5"
          >
            {/* Full-row link */}
            <Link href={`/app/${workspaceSlug}/${page.shortId}`} className="absolute inset-0" aria-label={page.title || "Untitled"} />

            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-sm leading-none">
              <PageIcon icon={page.icon} />
            </span>

            <span className="relative z-10 min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {page.title || "Untitled"}
            </span>

            {/* Unfavorite button with tooltip */}
            <div className="relative z-10 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => removeFavorite(page.pageId)}
                    className="flex size-6 items-center justify-center rounded text-warning opacity-0 transition-all duration-150 group-hover/row:opacity-100 hover:text-warning/60"
                  >
                    <Star size={13} fill="currentColor" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Remove from favorites</TooltipContent>
              </Tooltip>
            </div>

            <ChevronRight size={12} className="relative z-10 shrink-0 text-muted-foreground-subtle opacity-0 transition-opacity group-hover/row:opacity-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
