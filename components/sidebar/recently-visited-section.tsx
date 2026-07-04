"use client";

import { ChevronDown, Clock, FileText, MoreHorizontal, BookOpen } from "lucide-react";
import { PageIcon } from "@/components/pages/page-icon";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";

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

 useScrollLockWhileOpen(popupOpen, (target) =>
  !!popupRef.current?.contains(target) || !!moreRef.current?.contains(target));

 const resolved = items.filter((item) => !!pagesMap[item.pageId]);
 if (resolved.length === 0) return null;

 const visible = resolved.slice(0, VISIBLE_MAX);
 const hasMore = resolved.length > VISIBLE_MAX;

 function openPopup() {
  if (moreRef.current) {
   const r = moreRef.current.getBoundingClientRect();
   const POPUP_MAX_H = 360;
   const top = Math.max(8, Math.min(r.top, window.innerHeight - POPUP_MAX_H - 8));
   setPopupPos({ top, left: r.right + 8 });
  }
  setPopupOpen((v) => !v);
 }

 return (
  <div className="px-2 py-2">
   <button
    type="button"
    onClick={() => setExpanded((v) => !v)}
    className="group mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
   >
    <Clock size={15} className="shrink-0 text-muted-foreground group-hover:text-sidebar-accent-foreground" />
    <span className="flex-1 text-left">Recently Visited</span>
    <ChevronDown
     size={13}
     className={`shrink-0 text-muted-foreground/70 transition-transform duration-150 group-hover:text-sidebar-accent-foreground ${expanded ? "" : "-rotate-90"}`}
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
        className="flex min-w-0 items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
       >
        {page.icon ? (
         <PageIcon icon={page.icon} size={13} />
        ) : (
         <FileText size={12} className="shrink-0 text-muted-foreground/60" />
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
       className="flex w-full items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
     className="fixed z-[300] w-72 overflow-hidden rounded-[var(--radius-xl)] border border-primary/20 bg-popover"
     style={{ top: popupPos.top, left: popupPos.left }}
    >
     {/* Header */}
     <div className="flex items-center justify-between bg-gradient-to-r from-[#0369A1] to-[#38BDF8] px-3 py-3">
      <span className="text-sm font-semibold text-white">Recently Visited</span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">{resolved.length}</span>
     </div>
     {/* List */}
     <div className="max-h-64 overflow-y-auto py-1">
      {resolved.map((item) => {
       const page = pagesMap[item.pageId];
       return (
        <Link
         key={item.id}
         href={`/app/${workspaceSlug}/${page.shortId}`}
         onClick={() => setPopupOpen(false)}
         className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
         {page.icon ? (
          <PageIcon icon={page.icon} size={13} />
         ) : (
          <FileText size={13} className="shrink-0 text-muted-foreground/70" />
         )}
         <span className="min-w-0 truncate">{page.title || "Untitled"}</span>
        </Link>
       );
      })}
     </div>
     {/* Footer */}
     <div className="mx-1 h-px bg-border/60" />
     <div className="px-3 py-2">
      <Link
       href={`/app/${workspaceSlug}/library`}
       onClick={() => setPopupOpen(false)}
       className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
       <BookOpen size={13} />
       Browse in Library
      </Link>
     </div>
    </div>,
    document.body,
   )}
  </div>
 );
}
