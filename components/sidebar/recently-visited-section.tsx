"use client";

import { ClockIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VISIBLE_MAX = 3;

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
  const [popupOpen, setPopupOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!popupOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current?.contains(e.target as Node)) return;
      if (popupRef.current?.contains(e.target as Node)) return;
      setPopupOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popupOpen]);

  const resolved = items.filter((item) => !!pagesMap[item.pageId]);
  if (resolved.length === 0) return null;

  const visible = resolved.slice(0, VISIBLE_MAX);
  const hasMore = resolved.length > VISIBLE_MAX;

  function openPopup() {
    if (moreRef.current) {
      const r = moreRef.current.getBoundingClientRect();
      setPopupPos({ top: r.top, left: r.right + 8 });
    }
    setPopupOpen((v) => !v);
  }

  return (
    <div className="px-2 py-2">
      <div className="mb-1 flex items-center gap-2 px-2">
        <ClockIcon className="text-sidebar-foreground/50" size={11} />
        <span className="text-2xs font-semibold uppercase tracking-ui text-sidebar-foreground/50">
          Recently Visited
        </span>
      </div>

      {visible.map((item) => {
        const page = pagesMap[item.pageId];
        return (
          <Link
            key={item.id}
            href={`/app/${workspaceSlug}/${page.shortId}`}
            className="flex min-w-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
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

      {hasMore && (
        <button
          ref={moreRef}
          type="button"
          onClick={openPopup}
          className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3">
            <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
          </svg>
          {resolved.length - VISIBLE_MAX} more
        </button>
      )}

      {/* Popup flyout */}
      {popupOpen && popupPos && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[300] w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span className="text-xs font-semibold text-foreground">Recently Visited</span>
            <span className="text-xs text-muted-foreground">{resolved.length} pages</span>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {resolved.map((item) => {
              const page = pagesMap[item.pageId];
              return (
                <Link
                  key={item.id}
                  href={`/app/${workspaceSlug}/${page.shortId}`}
                  onClick={() => setPopupOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {page.icon ? (
                    <span className="shrink-0 text-sm leading-none">{page.icon}</span>
                  ) : (
                    <svg className="size-3.5 shrink-0 text-foreground/30" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  )}
                  <span className="min-w-0 truncate">{page.title || "Untitled"}</span>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-border px-3 py-2">
            <Link
              href={`/app/${workspaceSlug}/library`}
              onClick={() => setPopupOpen(false)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Open in Library
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
