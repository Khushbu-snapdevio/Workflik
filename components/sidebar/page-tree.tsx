"use client";

import {
 closestCenter,
 DndContext,
 type DragEndEvent,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
} from "@dnd-kit/core";
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 useSortable,
 verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Copy, ExternalLink, FileText, FolderInput, Home, Link2, Monitor, MoreHorizontal, Plus, Search, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewPageButton } from "@/components/workspace/new-page-button";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { PageIcon } from "@/components/pages/page-icon";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { findRootFallback } from "@/lib/pages/root-sibling";

const ROOT_VISIBLE_MAX = 4;

type PageItem = {
 id: string;
 shortId: string;
 parentId: string | null;
 title: string;
 icon: string | null;
 orderIndex: number;
 kind: string;
 isPrivate: boolean;
 isDraft: boolean;
};

type TreeNode = PageItem & { children: TreeNode[] };

type Props = {
 pages: PageItem[];
 filter: string;
 loading?: boolean;
 workspaceSlug: string;
 workspaceId: string;
 onPagesChange: (pages: PageItem[]) => void;
 favoritePageIds: Set<string>;
 onToggleFavorite: (pageId: string, isFav: boolean) => void;
};

function buildTree(pages: PageItem[]): TreeNode[] {
 const map = new Map<string, TreeNode>();
 for (const p of pages) {
  map.set(p.id, { ...p, children: [] });
 }

 const roots: TreeNode[] = [];
 for (const node of map.values()) {
  const parent = node.parentId ? map.get(node.parentId) : undefined;
  if (parent) {
   parent.children.push(node);
  } else {
   roots.push(node);
  }
 }

 function sort(nodes: TreeNode[]) {
  nodes.sort((a, b) => a.orderIndex - b.orderIndex);
  for (const n of nodes) {
   sort(n.children);
  }
 }
 sort(roots);
 return roots;
}

function matchesFilter(node: TreeNode, lower: string): boolean {
 if (node.title.toLowerCase().includes(lower)) {
  return true;
 }
 return node.children.some((c) => matchesFilter(c, lower));
}

function applyFilter(nodes: TreeNode[], lower: string): TreeNode[] {
 if (!lower) {
  return nodes;
 }
 return nodes.flatMap((n) => {
  if (!matchesFilter(n, lower)) {
   return [];
  }
  return [{ ...n, children: applyFilter(n.children, lower) }];
 });
}

export function PageTree({
 pages,
 filter,
 loading = false,
 workspaceSlug,
 workspaceId,
 onPagesChange,
 favoritePageIds,
 onToggleFavorite,
}: Props) {
 const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
 );

 // All hooks must be declared before any early returns
 const [moreOpen, setMoreOpen] = useState(false);
 const moreRef = useRef<HTMLButtonElement>(null);
 const popupRef = useRef<HTMLDivElement>(null);
 const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

 useEffect(() => {
  if (!moreOpen) return;
  function handleClick(e: MouseEvent) {
   if (moreRef.current?.contains(e.target as Node)) return;
   if (popupRef.current?.contains(e.target as Node)) return;
   setMoreOpen(false);
  }
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
 }, [moreOpen]);

 useScrollLockWhileOpen(moreOpen, (target) =>
  !!popupRef.current?.contains(target) || !!moreRef.current?.contains(target));

 const lower = filter.toLowerCase();
 const tree = applyFilter(buildTree(pages), lower);

 function handleDragEnd(
  event: DragEndEvent,
  siblings: TreeNode[],
  parentId: string | null
 ) {
  const { active, over } = event;
  if (!over || active.id === over.id) {
   return;
  }

  const oldIdx = siblings.findIndex((n) => n.id === active.id);
  const newIdx = siblings.findIndex((n) => n.id === over.id);
  if (oldIdx === -1 || newIdx === -1) {
   return;
  }

  const reordered = arrayMove(siblings, oldIdx, newIdx);

  // Optimistically update local state
  const updated = pages.map((p) => {
   const idx = reordered.findIndex((r) => r.id === p.id);
   if (idx !== -1) {
    return { ...p, orderIndex: idx };
   }
   return p;
  });
  onPagesChange(updated);

  // Persist the moved page's new position
  fetch(`/api/pages/${active.id}/move`, {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ parentId, orderIndex: newIdx }),
  }).catch(() => {
   onPagesChange(pages); // revert on error
  });
 }

 if (loading) {
  return (
   <div className="space-y-1 px-1 py-2">
    {[80, 65, 90].map((w) => (
     <div key={w} className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1 py-1">
      <div className="size-3.5 shrink-0 rounded-[var(--radius-xs)] bg-sidebar-foreground/10 animate-pulse" />
      <div className="h-2.5 rounded bg-sidebar-foreground/10 animate-pulse" style={{ width: `${w}%` }} />
     </div>
    ))}
   </div>
  );
 }

 if (tree.length === 0) {
  return (
   <p className="px-2 py-4 text-center text-2xs text-sidebar-foreground/80">
    {filter ? "No pages match" : "No pages yet"}
   </p>
  );
 }

 // When a filter is active, show all matches; otherwise cap at ROOT_VISIBLE_MAX
 const visibleRoots = filter ? tree : tree.slice(0, ROOT_VISIBLE_MAX);
 const hiddenCount = filter ? 0 : Math.max(0, tree.length - ROOT_VISIBLE_MAX);

 function openMorePopup() {
  if (moreRef.current) {
   const r = moreRef.current.getBoundingClientRect();
   const POPUP_MAX_H = 360;
   const POPUP_W = 288;
   const top = Math.max(8, Math.min(r.top, window.innerHeight - POPUP_MAX_H - 8));
   let left = r.right + 8;
   if (left + POPUP_W > window.innerWidth - 8) left = Math.max(8, r.left - 8 - POPUP_W);
   setPopupPos({ top, left });
  }
  setMoreOpen((v) => !v);
 }

 return (
  <>
   <Level
    depth={0}
    favoritePageIds={favoritePageIds}
    nodes={visibleRoots}
    onDragEnd={handleDragEnd}
    onPagesChange={onPagesChange}
    onToggleFavorite={onToggleFavorite}
    pages={pages}
    parentId={null}
    sensors={sensors}
    workspaceId={workspaceId}
    workspaceSlug={workspaceSlug}
   />

   {hiddenCount > 0 && (
    <button
     ref={moreRef}
     type="button"
     onClick={openMorePopup}
     className="flex w-full items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
     <MoreHorizontal size={12} />
     {hiddenCount} more
    </button>
   )}

   {/* Portaled to document.body, making it a *sibling* of the sidebar's own
       wrapper (md:z-[550] in workspace-shell.tsx), not a descendant of it.
       z-[560] keeps it above that wrapper; anything lower renders half-hidden
       behind the sidebar wherever the two overlap. */}
   {moreOpen && popupPos && typeof document !== "undefined" && createPortal(
    <div
     ref={popupRef}
     className="fixed z-[560] w-72 overflow-hidden rounded-[var(--radius-xl)] border border-primary/20 bg-popover"
     style={{ top: popupPos.top, left: popupPos.left }}
    >
     {/* Header */}
     <div className="flex items-center justify-between bg-gradient-to-r from-[#0369A1] to-[#38BDF8] px-3 py-3">
      <span className="text-sm font-semibold text-white">Pages</span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">{tree.length}</span>
     </div>
     {/* List */}
     <div className="max-h-64 overflow-y-auto py-1">
      {tree.map((node) => (
       <Link
        key={node.id}
        href={`/app/${workspaceSlug}/${node.shortId}`}
        onClick={() => setMoreOpen(false)}
        className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
       >
        {node.icon ? (
         <PageIcon icon={node.icon} size={13} />
        ) : (
         <FileText size={13} className="shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 truncate">{node.title || "Untitled"}</span>
       </Link>
      ))}
     </div>
     {/* Footer */}
     <div className="mx-1 h-px bg-border" />
     <div className="px-3 py-2">
      <Link
       href={`/app/${workspaceSlug}/library`}
       onClick={() => setMoreOpen(false)}
       className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
       <Monitor size={13} />
       Browse in Library
      </Link>
     </div>
    </div>,
    document.body,
   )}
  </>
 );
}

function Level({
 nodes,
 depth,
 workspaceSlug,
 workspaceId,
 sensors,
 onDragEnd,
 onPagesChange,
 onToggleFavorite,
 favoritePageIds,
 pages,
 parentId,
}: {
 nodes: TreeNode[];
 depth: number;
 workspaceSlug: string;
 workspaceId: string;
 sensors: ReturnType<typeof useSensors>;
 onDragEnd: (event: DragEndEvent, siblings: TreeNode[], parentId: string | null) => void;
 onPagesChange: (pages: PageItem[]) => void;
 onToggleFavorite: (pageId: string, isFav: boolean) => void;
 favoritePageIds: Set<string>;
 pages: PageItem[];
 parentId: string | null;
}) {
 return (
  <DndContext
   id={`page-tree-${parentId ?? "root"}`}
   collisionDetection={closestCenter}
   onDragEnd={(e) => onDragEnd(e, nodes, parentId)}
   sensors={sensors}
  >
   <SortableContext
    items={nodes.map((n) => n.id)}
    strategy={verticalListSortingStrategy}
   >
    {/* Each Level nests inside its parent PageTreeNode's own DOM, which is
        already inside the parent Level's padded div — so indenting by
        `depth * 12` here compounded on top of that ancestor padding at every
        level (a quadratic 12*depth*(depth+1)/2 total), not the intended
        linear depth*12. A flat 12px per Level is exactly one indent step
        relative to its immediate parent; nesting itself accumulates the rest. */}
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
     {nodes.map((node) => (
      <PageTreeNode
       depth={depth}
       favoritePageIds={favoritePageIds}
       key={node.id}
       node={node}
       onDragEnd={onDragEnd}
       onPagesChange={onPagesChange}
       onToggleFavorite={onToggleFavorite}
       pages={pages}
       sensors={sensors}
       workspaceId={workspaceId}
       workspaceSlug={workspaceSlug}
      />
     ))}
    </div>
   </SortableContext>
  </DndContext>
 );
}

function PageTreeNode({
 node,
 depth,
 workspaceSlug,
 workspaceId,
 sensors,
 onDragEnd,
 onPagesChange,
 onToggleFavorite,
 favoritePageIds,
 pages,
}: {
 node: TreeNode;
 depth: number;
 workspaceSlug: string;
 workspaceId: string;
 sensors: ReturnType<typeof useSensors>;
 onDragEnd: (event: DragEndEvent, siblings: TreeNode[], parentId: string | null) => void;
 onPagesChange: (pages: PageItem[]) => void;
 onToggleFavorite: (pageId: string, isFav: boolean) => void;
 favoritePageIds: Set<string>;
 pages: PageItem[];
}) {
 const router = useRouter();
 const [open, setOpen] = useState(true);
 const [menuOpen, setMenuOpen] = useState(false);
 const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
 const [confirmTrash, setConfirmTrash] = useState(false);
 const [deleting, setDeleting] = useState(false);
 const [moveToOpen, setMoveToOpen] = useState(false);
 const menuRef = useRef<HTMLDivElement>(null);
 const btnRef = useRef<HTMLButtonElement>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
 const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : undefined };
 const hasChildren = node.children.length > 0;
 const descendantCount = (() => {
  const ids = new Set<string>();
  collectDescendantIds(node, ids);
  return ids.size;
 })();
 const isFav = favoritePageIds.has(node.id);

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
  await fetch(`/api/pages/${node.id}`, { method: "DELETE" });
  setDeleting(false);
  setConfirmTrash(false);
  onPagesChange(pages.filter((p) => p.id !== node.id));

  // Navigate away only if currently viewing the deleted page — otherwise
  // router.refresh() below is enough to sync other routes (e.g. Home's
  // page count / "Jump back in") with the deletion.
  const onDeletedPage = typeof window !== "undefined" && window.location.pathname.includes(node.shortId);
  if (onDeletedPage || node.kind === "database") {
   const parentShortId = pages.find((p) => p.id === node.parentId)?.shortId;
   // No parent → nearest other top-level item (sidebar order), or workspace
   // home if this was the only one.
   const fallbackShortId = parentShortId ?? findRootFallback(pages, node.id)?.shortId ?? null;
   window.location.replace(fallbackShortId ? `/app/${workspaceSlug}/${fallbackShortId}` : `/app/${workspaceSlug}`);
  } else {
   router.refresh();
  }
 }

 async function handleDuplicate() {
  setMenuOpen(false);
  const res = await fetch(`/api/pages/${node.id}/duplicate`, { method: "POST" });
  if (res.ok) {
   const dup = await res.json();
   const refetch = await fetch(`/api/workspaces/${workspaceId}/pages/tree`);
   if (refetch.ok) onPagesChange(await refetch.json());
   router.push(`/app/${workspaceSlug}/${dup.shortId}`);
  }
 }

 async function handleCopyLink() {
  setMenuOpen(false);
  await navigator.clipboard.writeText(`${window.location.origin}/app/${workspaceSlug}/${node.shortId}`);
 }

 const menuItem = "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-foreground/80 transition-colors duration-150 hover:bg-accent hover:text-foreground cursor-pointer";

 return (
  <div ref={setNodeRef} style={style} {...attributes}>
   <div className="group relative flex items-center gap-0.5 rounded-[var(--radius-sm)] py-0.5 transition-colors hover:bg-sidebar-accent">
    {/* Expand/collapse */}
    <button
     className="flex size-5 shrink-0 items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
     onClick={() => setOpen((v) => !v)}
     tabIndex={-1}
     type="button"
    >
     {hasChildren ? (open ? <ChevronDown size={11} /> : <ChevronRight size={11} />) : null}
    </button>

    {/* Page link */}
    <Link
     className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-0.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
     href={`/app/${workspaceSlug}/${node.shortId}`}
     {...listeners}
    >
     {node.icon ? (
      <PageIcon icon={node.icon} size={14} />
     ) : (
      <FileText size={14} className="shrink-0 text-sidebar-foreground/70" />
     )}
     <span className="min-w-0 truncate">{node.title || "Untitled"}</span>
     {node.isDraft && (
      <span className="shrink-0 rounded-[var(--radius-xs)] bg-[#fef9c3] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[#92400e] dark:bg-[#713f12] dark:text-[#fde68a]">
       Draft
      </span>
     )}
    </Link>

    {/* Hover actions */}
    <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
     <NewPageButton
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      parentId={node.id}
      title="Add subpage"
      className="flex size-5 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/80 hover:bg-primary/10 hover:text-sidebar-accent-foreground"
     >
      <Plus size={12} />
     </NewPageButton>
     <button
      ref={btnRef}
      className="flex size-5 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/80 hover:bg-primary/10 hover:text-sidebar-accent-foreground"
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
      tabIndex={-1}
      type="button"
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
      {/* Colored accent bar at top */}
      <div className="h-[3px] bg-primary" />
      <div className="py-1">
       <button
        className={menuItem}
        onClick={() => {
         setMenuOpen(false);
         onToggleFavorite(node.id, isFav);
        }}
        type="button"
       >
        <Star size={14} className={isFav ? "text-warning" : undefined} />
        {isFav ? "Remove from Favorites" : "Add to Favorites"}
       </button>
       <div className="my-1 border-t border-border" />
       <Link
        className={menuItem}
        href={`/app/${workspaceSlug}/${node.shortId}`}
        onClick={() => setMenuOpen(false)}
       >
        <ExternalLink size={14} />
        Open
       </Link>
       <NewPageButton
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        parentId={node.id}
        onBeforeCreate={() => setMenuOpen(false)}
        className={menuItem}
       >
        <Plus size={14} />
        Add subpage
       </NewPageButton>
       <button className={menuItem} onClick={handleDuplicate} type="button">
        <Copy size={14} />
        Duplicate
       </button>
       <button
        className={menuItem}
        onClick={() => { setMenuOpen(false); setMoveToOpen(true); }}
        type="button"
       >
        <FolderInput size={14} />
        Move to
       </button>
       <button className={menuItem} onClick={handleCopyLink} type="button">
        <Link2 size={14} />
        Copy link
       </button>
       <div className="my-1 border-t border-border" />
       <button className={`${menuItem} !text-destructive hover:!bg-destructive/5`} onClick={handleDelete} type="button">
        <Trash2 size={14} />
        Move to Trash
       </button>
      </div>
     </div>
    )}
   </div>

   {/* Children */}
   {hasChildren && open && (
    <Level
     depth={depth + 1}
     favoritePageIds={favoritePageIds}
     nodes={node.children}
     onDragEnd={onDragEnd}
     onPagesChange={onPagesChange}
     onToggleFavorite={onToggleFavorite}
     pages={pages}
     parentId={node.id}
     sensors={sensors}
     workspaceId={workspaceId}
     workspaceSlug={workspaceSlug}
    />
   )}

   {/* Move to Trash confirmation dialog */}
   <ConfirmDialog
    open={confirmTrash}
    onOpenChange={setConfirmTrash}
    title="Move to Trash?"
    description={<>
     <span className="font-medium text-foreground">&ldquo;{node.title || "Untitled"}&rdquo;</span>
     {descendantCount > 0 && ` and its ${descendantCount} sub-page${descendantCount > 1 ? "s" : ""}`}
     {" "}will be moved to Trash and permanently deleted after 30 days.
    </>}
    confirmLabel="Move to Trash"
    confirmLoadingLabel="Moving…"
    loading={deleting}
    onConfirm={confirmDelete}
   />

   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}

   {moveToOpen && (
    <MoveToDialog
     node={node}
     pages={pages}
     workspaceId={workspaceId}
     onClose={() => setMoveToOpen(false)}
     onMoved={onPagesChange}
    />
   )}
  </div>
 );
}

// ── Move to dialog ───────────────────────────────────────────────────────────────

function collectDescendantIds(node: TreeNode, out: Set<string>) {
 for (const child of node.children) {
  out.add(child.id);
  collectDescendantIds(child, out);
 }
}

function MoveToRow({
 node, depth, onSelect,
}: {
 node:   TreeNode;
 depth:  number;
 onSelect: (id: string) => void;
}) {
 return (
  <>
   <button
    type="button"
    onClick={() => onSelect(node.id)}
    style={{ paddingLeft: 12 + depth * 18 }}
    className="flex w-full items-center gap-2 py-1.5 pr-3 text-left text-sm text-foreground/80 transition-colors duration-150 hover:bg-accent hover:text-foreground"
   >
    {node.icon ? (
     <PageIcon icon={node.icon} size={14} />
    ) : (
     <FileText size={14} className="shrink-0 text-muted-foreground" />
    )}
    <span className="min-w-0 truncate">{node.title || "Untitled"}</span>
   </button>
   {node.children.map((child) => (
    <MoveToRow key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
   ))}
  </>
 );
}

function MoveToDialog({
 node, pages, workspaceId, onClose, onMoved,
}: {
 node:    TreeNode;
 pages:   PageItem[];
 workspaceId: string;
 onClose:  () => void;
 onMoved:  (pages: PageItem[]) => void;
}) {
 const [search, setSearch] = useState("");
 const [moving, setMoving] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => { inputRef.current?.focus(); }, []);

 useEffect(() => {
  function onKey(e: KeyboardEvent) {
   if (e.key === "Escape") onClose();
  }
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
 }, [onClose]);

 // A page can't be moved into itself or one of its own subpages — exclude
 // that whole subtree from the destination list rather than letting the
 // user pick an invalid target and find out from a server error.
 const excluded = new Set<string>([node.id]);
 collectDescendantIds(node, excluded);
 const destinationPages = pages.filter((p) => !excluded.has(p.id));
 const lower = search.toLowerCase();
 const tree = applyFilter(buildTree(destinationPages), lower);
 const rootMatches = !lower || "workspace root".includes(lower);
 const isAlreadyRoot = node.parentId === null;

 async function handleSelect(destinationParentId: string | null) {
  if (moving) return;
  if (destinationParentId === node.parentId) { onClose(); return; }
  setMoving(true);
  const siblings = pages.filter((p) => p.parentId === destinationParentId);
  const orderIndex = siblings.length > 0 ? Math.max(...siblings.map((p) => p.orderIndex)) + 1 : 0;
  try {
   const res = await fetch(`/api/pages/${node.id}/move`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentId: destinationParentId, orderIndex }),
   });
   if (!res.ok) {
    const body = await res.json().catch(() => null);
    toast.error(body?.error ?? "Couldn't move this page — please try again.");
    return;
   }
   const refetch = await fetch(`/api/workspaces/${workspaceId}/pages/tree`);
   if (refetch.ok) onMoved(await refetch.json());
   onClose();
  } catch {
   toast.error("Couldn't move this page — please try again.");
  } finally {
   setMoving(false);
  }
 }

 return (
  <>
   <div className="fixed inset-0 z-[800] bg-black/40" onClick={onClose} />
   <div className="fixed left-1/2 top-[16vh] z-[810] w-full max-w-sm -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
     <Search size={15} className="shrink-0 text-muted-foreground" />
     <input
      ref={inputRef}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder={`Move "${node.title || "Untitled"}" to…`}
      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground-subtle"
     />
     <button
      type="button"
      onClick={onClose}
      className="text-muted-foreground transition-colors hover:text-foreground"
     >
      <X size={14} />
     </button>
    </div>

    <div className={`max-h-80 overflow-y-auto py-1 ${moving ? "pointer-events-none opacity-50" : ""}`}>
     {rootMatches && (
      <button
       type="button"
       onClick={() => handleSelect(null)}
       disabled={isAlreadyRoot}
       className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground/80 transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
       <Home size={14} className="shrink-0 text-muted-foreground" />
       Workspace root
       {isAlreadyRoot && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
      </button>
     )}
     {tree.length === 0 && !rootMatches && (
      <p className="px-3 py-4 text-center text-xs text-muted-foreground">No pages match</p>
     )}
     {tree.map((n) => (
      <MoveToRow key={n.id} node={n} depth={0} onSelect={handleSelect} />
     ))}
    </div>
   </div>
  </>
 );
}
