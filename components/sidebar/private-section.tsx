"use client";

import {
 ChevronDown, Copy, ExternalLink, FileText, Link2, Lock,
 MoreHorizontal, Plus, Star, Trash2, BookOpen,
} from "lucide-react";
import { PageIcon } from "@/components/pages/page-icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { NewPageButton } from "@/components/workspace/new-page-button";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { findRootFallback } from "@/lib/pages/root-sibling";

const VISIBLE_MAX = 3;

type PageItem = {
 id:    string;
 shortId:  string;
 parentId: string | null;
 title:  string;
 icon:   string | null;
 orderIndex: number;
 kind:   string;
 isPrivate: boolean;
 isDraft: boolean;
};

type Props = {
 pages:      PageItem[];
 // Private database entries (kind "entry") — fetched and updated separately
 // from `pages`, since entries never live in the general page tree / are
 // never favorited/recently-visited the same way; this section is the one
 // place they surface. See sidebar.tsx.
 entries:     PageItem[];
 workspaceId:   string;
 workspaceSlug:  string;
 favoritePageIds: Set<string>;
 onToggleFavorite: (pageId: string, isFav: boolean) => void;
 onPagesChange:  (pages: PageItem[]) => void;
 onEntriesChange: (entries: PageItem[]) => void;
};

// Mirrors recently-visited-section.tsx for the section shell (header, "N
// more" popup, empty-state), and page-tree.tsx's PageTreeNode for the
// per-row hover "+"/"···" actions — same options that already exist there
// (Favorite, Open, Add subpage, Duplicate, Copy link, Move to Trash), not a
// new menu design.
export function PrivateSection({
 pages, entries, workspaceId, workspaceSlug, favoritePageIds, onToggleFavorite, onPagesChange, onEntriesChange,
}: Props) {
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

 // Real pages first, then private entries appended — matches the order
 // they'd naturally accumulate in (pages are usually created/marked private
 // before someone starts privately using a database row).
 const privatePages = [...pages.filter((p) => p.isPrivate), ...entries];
 if (privatePages.length === 0) return null;

 const visible = privatePages.slice(0, VISIBLE_MAX);
 const hasMore = privatePages.length > VISIBLE_MAX;

 function openPopup() {
  if (moreRef.current) {
   const r = moreRef.current.getBoundingClientRect();
   const POPUP_MAX_H = 360;
   const POPUP_W = 288;
   const top = Math.max(8, Math.min(r.top, window.innerHeight - POPUP_MAX_H - 8));
   let left = r.right + 8;
   if (left + POPUP_W > window.innerWidth - 8) left = Math.max(8, r.left - 8 - POPUP_W);
   setPopupPos({ top, left });
  }
  setPopupOpen((v) => !v);
 }

 return (
  <div className="px-2">
   <div className="group/header mb-0.5 flex w-full items-center justify-between rounded-[var(--radius-md)] pr-1 transition-colors duration-150 hover:bg-sidebar-accent">
    <button
     type="button"
     onClick={() => setExpanded((v) => !v)}
     className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors duration-150 group-hover/header:text-sidebar-accent-foreground"
    >
     <Lock size={15} className="shrink-0 text-muted-foreground group-hover/header:text-sidebar-accent-foreground" />
     <span className="truncate text-left">Private</span>
     <ChevronDown
      size={14}
      className={`shrink-0 text-muted-foreground/70 transition-transform duration-150 group-hover/header:text-sidebar-accent-foreground ${expanded ? "" : "-rotate-90"}`}
     />
    </button>
    <NewPageButton
     workspaceId={workspaceId}
     workspaceSlug={workspaceSlug}
     isPrivate
     title="Add a page"
     onBeforeCreate={() => setExpanded(true)}
     className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/80 opacity-0 transition-colors duration-150 group-hover/header:opacity-100 hover:bg-primary/10 hover:text-sidebar-accent-foreground disabled:opacity-60"
    >
     <Plus size={14} />
    </NewPageButton>
   </div>

   {/* Grid-rows trick animates height without measuring it in JS — see
       favorites-section.tsx for the full rationale. */}
   <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
    <div className="overflow-hidden">
     {visible.map((page) => (
      <PrivateRow
       key={page.id}
       page={page}
       pages={pages}
       workspaceId={workspaceId}
       workspaceSlug={workspaceSlug}
       isFav={favoritePageIds.has(page.id)}
       onToggleFavorite={onToggleFavorite}
       onPagesChange={onPagesChange}
       // Entries live in a separate list from `pages` (see the Props
       // comment above) — route their removal there instead of trying to
       // filter them out of `pages`, which never contained them.
       onRemove={page.kind === "entry" ? (id) => onEntriesChange(entries.filter((e) => e.id !== id)) : undefined}
      />
     ))}
     {hasMore && (
      <button
       ref={moreRef}
       type="button"
       onClick={openPopup}
       className="flex w-full items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-sidebar-foreground/80 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
       <MoreHorizontal size={12} />
       {privatePages.length - VISIBLE_MAX} more
      </button>
     )}
    </div>
   </div>

   {/* Popup flyout — portaled to document.body, making it a *sibling* of the
       sidebar's own wrapper (md:z-[550] in workspace-shell.tsx), not a
       descendant of it. z-[560] keeps it above that wrapper; anything lower
       renders half-hidden behind the sidebar wherever the two overlap. */}
   {popupOpen && popupPos && typeof document !== "undefined" && createPortal(
    <div
     ref={popupRef}
     className="fixed z-[560] w-72 overflow-hidden rounded-[var(--radius-xl)] border border-primary/20 bg-popover"
     style={{ top: popupPos.top, left: popupPos.left }}
    >
     {/* Header */}
     <div className="flex items-center justify-between bg-gradient-to-r from-[#0369A1] to-[#38BDF8] px-3 py-3">
      <span className="text-sm font-semibold text-white">Private</span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">{privatePages.length}</span>
     </div>
     {/* List */}
     <div className="max-h-64 overflow-y-auto py-1">
      {privatePages.map((page) => (
       <Link
        key={page.id}
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
      ))}
     </div>
     {/* Footer */}
     <div className="mx-1 h-px bg-border/60" />
     <div className="px-3 py-2">
      <Link
       href={`/app/${workspaceSlug}/library?tab=private`}
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

// ── Row ──────────────────────────────────────────────────────────────────────
// Same hover "+"/"···" actions as page-tree.tsx's PageTreeNode, just without
// the drag-to-reorder/nesting UI — Private renders as a flat list.
function PrivateRow({
 page, pages, workspaceId, workspaceSlug, isFav, onToggleFavorite, onPagesChange, onRemove,
}: {
 page: PageItem;
 pages: PageItem[];
 workspaceId: string;
 workspaceSlug: string;
 isFav: boolean;
 onToggleFavorite: (pageId: string, isFav: boolean) => void;
 onPagesChange: (pages: PageItem[]) => void;
 /** Set for entry rows — removes from the separate private-entries list
  *  instead of `pages` (which never contains entries) on delete. */
 onRemove?: (id: string) => void;
}) {
 const router = useRouter();
 const [menuOpen, setMenuOpen] = useState(false);
 const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
 const [confirmTrash, setConfirmTrash] = useState(false);
 const [deleting, setDeleting] = useState(false);
 const menuRef = useRef<HTMLDivElement>(null);
 const btnRef = useRef<HTMLButtonElement>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 useEffect(() => {
  if (!menuOpen) return;
  function onOutside(e: MouseEvent) {
   if (menuRef.current && !menuRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
    setMenuOpen(false);
   }
  }
  function onScroll() { setMenuOpen(false); }
  document.addEventListener("mousedown", onOutside);
  document.addEventListener("scroll", onScroll, true);
  return () => {
   document.removeEventListener("mousedown", onOutside);
   document.removeEventListener("scroll", onScroll, true);
  };
 }, [menuOpen]);

 function handleDelete() {
  setMenuOpen(false);
  setConfirmTrash(true);
 }

 async function confirmDelete() {
  setDeleting(true);
  await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
  setDeleting(false);
  setConfirmTrash(false);
  if (onRemove) onRemove(page.id);
  else onPagesChange(pages.filter((p) => p.id !== page.id));

  const onDeletedPage = typeof window !== "undefined" && window.location.pathname.includes(page.shortId);
  if (onDeletedPage || page.kind === "database") {
   const parentShortId = pages.find((p) => p.id === page.parentId)?.shortId;
   // No parent → nearest other top-level item (sidebar order), or workspace
   // home if this was the only one.
   const fallbackShortId = parentShortId ?? findRootFallback(pages, page.id)?.shortId ?? null;
   window.location.replace(fallbackShortId ? `/app/${workspaceSlug}/${fallbackShortId}` : `/app/${workspaceSlug}`);
  } else {
   // Sync other routes (e.g. Home's page count / "Jump back in") with the deletion.
   router.refresh();
  }
 }

 async function handleDuplicate() {
  setMenuOpen(false);
  const res = await fetch(`/api/pages/${page.id}/duplicate`, { method: "POST" });
  if (res.ok) {
   const dup = await res.json();
   const refetch = await fetch(`/api/workspaces/${workspaceId}/pages/tree`);
   if (refetch.ok) onPagesChange(await refetch.json());
   router.push(`/app/${workspaceSlug}/${dup.shortId}`);
  }
 }

 async function handleCopyLink() {
  setMenuOpen(false);
  await navigator.clipboard.writeText(`${window.location.origin}/app/${workspaceSlug}/${page.shortId}`);
 }

 const menuItem = "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-foreground/80 transition-colors duration-150 hover:bg-accent hover:text-foreground cursor-pointer";

 return (
  <div className="group relative flex items-center gap-0.5 rounded-[var(--radius-sm)] py-0.5 transition-colors hover:bg-sidebar-accent">
   <Link
    href={`/app/${workspaceSlug}/${page.shortId}`}
    className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-0.5 pl-2.5 text-xs text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
   >
    {page.icon ? (
     <PageIcon icon={page.icon} size={13} />
    ) : (
     <FileText size={12} className="shrink-0 text-sidebar-foreground/70" />
    )}
    <span className="min-w-0 truncate">{page.title || "Untitled"}</span>
   </Link>

   {/* Hover actions */}
   <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
    <NewPageButton
     workspaceId={workspaceId}
     workspaceSlug={workspaceSlug}
     parentId={page.id}
     isPrivate
     title="Add a page inside"
     className="flex size-5 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/80 hover:bg-primary/10 hover:text-sidebar-accent-foreground"
    >
     <Plus size={12} />
    </NewPageButton>
    <button
     ref={btnRef}
     type="button"
     onClick={(e) => {
      e.stopPropagation();
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
       const MENU_W = 180;
       const MENU_H = 240;
       let x = rect.right + 4;
       if (x + MENU_W > window.innerWidth - 8) x = rect.left - 4 - MENU_W;
       x = Math.max(8, x);
       const y = Math.max(8, Math.min(rect.top, window.innerHeight - 8 - MENU_H));
       setMenuPos({ x, y });
      }
      setMenuOpen((v) => !v);
     }}
     onMouseEnter={(e) => showTooltip("Options", e)}
     onMouseLeave={hideTooltip}
     className="flex size-5 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/80 hover:bg-primary/10 hover:text-sidebar-accent-foreground"
    >
     <MoreHorizontal size={14} />
    </button>
   </div>

   {/* Context menu — fixed so it escapes the sidebar's overflow clip */}
   {menuOpen && (
    <div
     ref={menuRef}
     className="fixed z-[200] min-w-[168px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover"
     style={{ left: menuPos.x, top: menuPos.y }}
    >
     <div className="h-[3px] bg-primary" />
     <div className="py-1">
      <button
       type="button"
       className={menuItem}
       onClick={() => {
        setMenuOpen(false);
        onToggleFavorite(page.id, isFav);
       }}
      >
       <Star size={14} className={isFav ? "text-warning" : undefined} />
       {isFav ? "Remove from Favorites" : "Add to Favorites"}
      </button>
      <div className="my-1 border-t border-border" />
      <Link
       href={`/app/${workspaceSlug}/${page.shortId}`}
       onClick={() => setMenuOpen(false)}
       className={menuItem}
      >
       <ExternalLink size={14} />
       Open
      </Link>
      <NewPageButton
       workspaceId={workspaceId}
       workspaceSlug={workspaceSlug}
       parentId={page.id}
       isPrivate
       onBeforeCreate={() => setMenuOpen(false)}
       className={menuItem}
      >
       <Plus size={14} />
       Add subpage
      </NewPageButton>
      <button type="button" className={menuItem} onClick={handleDuplicate}>
       <Copy size={14} />
       Duplicate
      </button>
      <button type="button" className={menuItem} onClick={handleCopyLink}>
       <Link2 size={14} />
       Copy link
      </button>
      <div className="my-1 border-t border-border" />
      <button type="button" className={`${menuItem} !text-destructive hover:!bg-destructive/5`} onClick={handleDelete}>
       <Trash2 size={14} />
       Move to Trash
      </button>
     </div>
    </div>
   )}

   <ConfirmDialog
    open={confirmTrash}
    onOpenChange={setConfirmTrash}
    title="Move to Trash?"
    description={<><span className="font-medium text-foreground">&ldquo;{page.title || "Untitled"}&rdquo;</span> will be moved to Trash and permanently deleted after 30 days.</>}
    confirmLabel="Move to Trash"
    confirmLoadingLabel="Moving…"
    loading={deleting}
    onConfirm={confirmDelete}
   />

   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
  </div>
 );
}
