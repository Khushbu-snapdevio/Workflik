"use client";

import { ChevronDown, Clock, FileText, MoreHorizontal, BookOpen } from "lucide-react";
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
 const [expanded, setExpanded] = useState(true);
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
   <button
    type="button"
    onClick={() => setExpanded((v) => !v)}
    className="group mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
   >
    <Clock size={15} className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
    <span className="flex-1 text-left">Recently Visited</span>
    <ChevronDown
     size={13}
     className={`shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:text-muted-foreground ${expanded ? "" : "-rotate-90"}`}
    />
   </button>

   {expanded && (
    <>
     {visible.map((item) => {
      const page = pagesMap[item.pageId];
      return (
       <Link
        key={item.id}
        href={`/app/${workspaceSlug}/${page.shortId}`}
        className="flex min-w-0 items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
       >
        {page.icon ? (
         <span className="shrink-0 text-sm leading-none">{page.icon}</span>
        ) : (
         <FileText size={12} className="shrink-0 text-muted-foreground/30" />
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
       className="flex w-full items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-sidebar-foreground/40 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
      >
       <MoreHorizontal size={12} />
       {resolved.length - VISIBLE_MAX} more
      </button>
     )}
    </>
   )}

   {/* Popup flyout */}
   {popupOpen && popupPos && typeof document !== "undefined" && createPortal(
    <div
     ref={popupRef}
     className="fixed z-[300] w-64 overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover"
     style={{ top: popupPos.top, left: popupPos.left }}
    >
     <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5">
      <span className="text-xs font-semibold text-foreground">Recently Visited</span>
      <span className="rounded-[var(--radius-xs)] bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{resolved.length} total</span>
     </div>
     <div className="max-h-72 overflow-y-auto py-1">
      {resolved.map((item) => {
       const page = pagesMap[item.pageId];
       return (
        <Link
         key={item.id}
         href={`/app/${workspaceSlug}/${page.shortId}`}
         onClick={() => setPopupOpen(false)}
         className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
         {page.icon ? (
          <span className="shrink-0 text-sm leading-none">{page.icon}</span>
         ) : (
          <FileText size={14} className="shrink-0 text-muted-foreground/40" />
         )}
         <span className="min-w-0 truncate">{page.title || "Untitled"}</span>
        </Link>
       );
      })}
     </div>
     <div className="border-t border-border bg-popover px-3 py-2">
      <Link
       href={`/app/${workspaceSlug}/library`}
       onClick={() => setPopupOpen(false)}
       className="flex items-center gap-2 text-xs font-medium text-primary transition-colors duration-150 hover:text-foreground"
      >
       <BookOpen size={14} />
       Open in Library
      </Link>
     </div>
    </div>,
    document.body,
   )}
  </div>
 );
}
