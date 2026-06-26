"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
 Table2 as Table, Kanban, Calendar as CalendarBlank, LayoutGrid as SquaresFour,
 Plus, Filter as Funnel, ArrowUpDown as SortAscending, Pencil, Trash2 as Trash,
 Search as MagnifyingGlass, X, Eye, EyeOff as EyeSlash, SlidersHorizontal, Copy,
 Type as TextT, Hash, CircleDashed, Tag, CheckSquare,
 Link as LinkIcon, Mail as Envelope, Phone, User, ArrowLeftRight as ArrowsLeftRight,
 PanelLeft as SidebarSimple, Expand as ArrowsOut, LayoutGrid as Cards,
 MoreVertical, ChevronDown, Check,
 type LucideIcon,
} from "lucide-react";
import { PROPERTY_REGISTRY } from "@/components/database/property-registry";
import type { DbView, DbProperty, FilterRule, SortRule } from "./types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── Constants ─────────────────────────────────────────────────────────────────

const VIEW_ICONS: Record<string, LucideIcon> = {
 table:  Table,
 board:  Kanban,
 calendar: CalendarBlank,
 gallery: SquaresFour,
};
const VIEW_TYPES = ["table", "board", "calendar", "gallery"] as const;
const VIEW_LABELS: Record<string, string> = { table: "Table", board: "Board", calendar: "Calendar", gallery: "Gallery" };

// ── Props ─────────────────────────────────────────────────────────────────────

interface ToolbarProps {
 views:       DbView[];
 activeViewId:   string | null;
 properties:    DbProperty[];
 activeView:    DbView | null;
 isEditor:     boolean;
 onSwitchView:   (viewId: string) => void;
 onAddView:     (name: string, type: string) => void;
 onDuplicateView:  (viewId: string) => void;
 onDeleteView:   (viewId: string) => void;
 onUpdateView:   (viewId: string, patch: Record<string, unknown>) => void;
 showFilterBar:   boolean;
 showSortBar:    boolean;
 onToggleFilterBar: () => void;
 onToggleSortBar:  () => void;
 onCreateEntry:   () => void;
 onAddProperty:   (name: string, type: string) => Promise<unknown>;
 searchQuery:    string;
 onSearchChange:  (q: string) => void;
 searchInputRef:  React.RefObject<HTMLInputElement | null>;
 selectedCount:   number;
 onBulkDelete:   () => Promise<void>;
 onClearSelection: () => void;
 totalEntries:   number;
 inline?:      boolean;
}

// ── DatabaseToolbar ───────────────────────────────────────────────────────────

export function DatabaseToolbar({
 views, activeViewId, properties, activeView, isEditor,
 onSwitchView, onAddView, onDuplicateView, onDeleteView, onUpdateView,
 showFilterBar, showSortBar, onToggleFilterBar, onToggleSortBar, onCreateEntry,
 onAddProperty,
 searchQuery, onSearchChange, searchInputRef,
 selectedCount, onBulkDelete, onClearSelection,
 totalEntries, inline = false,
}: ToolbarProps) {
 const [editingId, setEditingId]    = useState<string | null>(null);
 const [editingName, setEditingName]  = useState("");
 const [addViewRect, setAddViewRect]  = useState<DOMRect | null>(null);
 const [contextView, setContextView]  = useState<DbView | null>(null);
 const [contextRect, setContextRect]  = useState<DOMRect | null>(null);
 const [showSearch, setShowSearch]   = useState(!!searchQuery);
 const [deletingBulk, setDeletingBulk]      = useState(false);
 const [showBulkConfirm, setShowBulkConfirm]   = useState(false);
 const [deleteViewTarget, setDeleteViewTarget]  = useState<DbView | null>(null);
 const [deletingView, setDeletingView]      = useState(false);
 const [propsRect, setPropsRect]    = useState<DOMRect | null>(null);
 const [cardsRect, setCardsRect]    = useState<DOMRect | null>(null);
 const [groupRect, setGroupRect]    = useState<DOMRect | null>(null);
 const [dateRect, setDateRect]     = useState<DOMRect | null>(null);
 const addViewDropRef = useRef<HTMLDivElement>(null);
 const contextDropRef = useRef<HTMLDivElement>(null);
 const propsDropRef  = useRef<HTMLDivElement>(null);
 const cardsDropRef  = useRef<HTMLDivElement>(null);
 const groupDropRef  = useRef<HTMLDivElement>(null);
 const dateDropRef  = useRef<HTMLDivElement>(null);

 const filterCount = ((activeView?.filters as FilterRule[] | undefined) ?? []).length;
 const sortCount  = ((activeView?.sorts  as SortRule[]  | undefined) ?? []).length;

 // Close portals on outside click
 useEffect(() => {
  function h(e: MouseEvent) {
   const t = e.target as Node;
   if (addViewDropRef.current && !addViewDropRef.current.contains(t)) setAddViewRect(null);
   if (contextDropRef.current && !contextDropRef.current.contains(t)) { setContextView(null); setContextRect(null); }
   if (propsDropRef.current  && !propsDropRef.current.contains(t))  setPropsRect(null);
   if (cardsDropRef.current  && !cardsDropRef.current.contains(t))  setCardsRect(null);
   if (groupDropRef.current  && !groupDropRef.current.contains(t))  setGroupRect(null);
   if (dateDropRef.current  && !dateDropRef.current.contains(t))  setDateRect(null);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, []);

 // Focus search on mount when query exists
 useEffect(() => {
  if (searchQuery && searchInputRef.current) {
   setShowSearch(true);
  }
 }, [searchQuery, searchInputRef]);

 function commitRename(view: DbView) {
  const name = editingName.trim() || view.name;
  if (name !== view.name) onUpdateView(view.id, { name });
  setEditingId(null);
 }

 async function handleBulkDelete() {
  setDeletingBulk(true);
  await onBulkDelete();
  setDeletingBulk(false);
  setShowBulkConfirm(false);
 }

 const selectProps = properties.filter((p) => p.type === "select" && !p.isSystem);
 const dateProps  = properties.filter((p) => p.type === "date"  && !p.isSystem);

 // ── Bulk actions bar ──────────────────────────────────────────────────────

 if (selectedCount > 0) {
  return (
   <>
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-primary/5 px-4">
     <button
      onClick={onClearSelection}
      className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
     >
      <X size={14} />
     </button>
     <span className="text-sm font-semibold text-foreground">
      {selectedCount} {selectedCount === 1 ? "row" : "rows"} selected
     </span>
     <div className="h-4 w-px bg-border/60" />
     <span className="text-xs text-muted-foreground">{totalEntries} total</span>
     <div className="flex-1" />
     <button
      onClick={() => setShowBulkConfirm(true)}
      disabled={deletingBulk}
      className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors duration-150 hover:bg-destructive/10 disabled:opacity-50"
     >
      <Trash size={13} />
      {deletingBulk ? "Deleting…" : `Delete ${selectedCount}`}
     </button>
    </div>

    <ConfirmDialog
     open={showBulkConfirm}
     onOpenChange={setShowBulkConfirm}
     title={`Delete ${selectedCount} ${selectedCount === 1 ? "entry" : "entries"}?`}
     description={`${selectedCount === 1 ? "This entry and all its content" : `These ${selectedCount} entries and all their content`} will be permanently deleted. This action cannot be undone.`}
     confirmLabel={`Delete ${selectedCount}`}
     confirmLoadingLabel="Deleting…"
     loading={deletingBulk}
     onConfirm={handleBulkDelete}
    />
   </>
  );
 }

 // ── Normal toolbar ────────────────────────────────────────────────────────

 return (
  <>
   <div className="flex h-[46px] shrink-0 items-center overflow-x-auto border-b border-border bg-card pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

    {/* ── View tabs ── */}
    <div className="flex shrink-0 self-stretch items-stretch pl-2">
     {views.map((view) => {
      const ViewIcon = VIEW_ICONS[view.type] ?? Table;
      const isActive = view.id === activeViewId;
      return (
       <div
        key={view.id}
        className="group flex items-stretch"
       >
        {editingId === view.id ? (
         <div className="flex items-center px-1">
          <input
           value={editingName}
           onChange={(e) => setEditingName(e.target.value)}
           onBlur={() => commitRename(view)}
           onKeyDown={(e) => {
            if (e.key === "Enter") commitRename(view);
            if (e.key === "Escape") setEditingId(null);
           }}
           autoFocus
           className="h-7 rounded-[var(--radius-sm)] border border-primary/40 bg-background px-2 text-sm focus:outline-none"
           style={{ width: Math.max(80, editingName.length * 8) }}
           onClick={(e) => e.stopPropagation()}
          />
         </div>
        ) : (
         <button
          onClick={() => onSwitchView(view.id)}
          onDoubleClick={() => isEditor && (setEditingId(view.id), setEditingName(view.name))}
          className={[
           "relative flex h-full shrink-0 items-center gap-1.5 px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
           isActive
            ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
            : "text-muted-foreground/70 hover:bg-accent hover:text-foreground",
          ].join(" ")}
         >
          <ViewIcon size={13} />
          {view.name}
         </button>
        )}

        {isEditor && !editingId && (
         <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
           e.stopPropagation();
           if (contextView?.id === view.id) { setContextView(null); setContextRect(null); }
           else { setContextView(view); setContextRect((e.currentTarget as HTMLElement).getBoundingClientRect()); }
          }}
          className={[
           "flex h-full w-6 items-center justify-center rounded-[var(--radius-xs)] transition-colors duration-150",
           contextView?.id === view.id
            ? "bg-accent text-foreground"
            : "text-transparent hover:bg-accent hover:text-foreground group-hover:text-muted-foreground/60",
          ].join(" ")}
          title="View options"
         >
          <MoreVertical size={13} className="shrink-0" />
         </button>
        )}
       </div>
      );
     })}

     {/* ── Add view button ── */}
     {isEditor && (
      <div className="flex items-center pl-2 pr-1">
       <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
         if (addViewRect) { setAddViewRect(null); return; }
         setAddViewRect((e.currentTarget as HTMLElement).getBoundingClientRect());
        }}
        className={[
         "flex h-[26px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed px-2.5 text-xs font-medium transition-colors duration-150",
         addViewRect
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/70 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
        ].join(" ")}
       >
        <Plus size={11} className="text-primary/60" />
        Add a view
       </button>
      </div>
     )}
    </div>

    <div className="mx-2 h-4 w-px shrink-0 bg-border/60" />

    {/* ── Group by (board / table / gallery) ── */}
    {(activeView?.type === "board" || activeView?.type === "table" || activeView?.type === "gallery") && selectProps.length > 0 && (
     <div className="flex shrink-0 items-center gap-1.5">
      {!inline && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/60">Group</span>}
      <button
       onMouseDown={(e) => e.stopPropagation()}
       onClick={(e) => {
        if (groupRect) { setGroupRect(null); return; }
        setGroupRect((e.currentTarget as HTMLElement).getBoundingClientRect());
       }}
       className={[
        "flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
        groupRect || activeView.groupByPropertyId
         ? "border-primary/30 bg-primary/8 text-primary"
         : "border-border bg-background text-foreground/70 hover:border-border hover:bg-accent",
       ].join(" ")}
      >
       {activeView.groupByPropertyId
        ? selectProps.find((p) => p.id === activeView.groupByPropertyId)?.name ?? "Group"
        : <span className="text-muted-foreground">None</span>}
       <ChevronDown size={10} className="shrink-0 text-muted-foreground" />
      </button>
     </div>
    )}

    {/* ── Calendar date property ── */}
    {activeView?.type === "calendar" && dateProps.length > 0 && (
     <div className="flex shrink-0 items-center gap-1.5">
      {!inline && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/60">Date</span>}
      <button
       onMouseDown={(e) => e.stopPropagation()}
       onClick={(e) => {
        if (dateRect) { setDateRect(null); return; }
        setDateRect((e.currentTarget as HTMLElement).getBoundingClientRect());
       }}
       className={[
        "flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
        dateRect || activeView.calendarPropertyId
         ? "border-primary/30 bg-primary/8 text-primary"
         : "border-border bg-background text-foreground/70 hover:border-border hover:bg-accent",
       ].join(" ")}
      >
       {activeView.calendarPropertyId
        ? dateProps.find((p) => p.id === activeView.calendarPropertyId)?.name ?? "Date"
        : <span className="text-muted-foreground">None</span>}
       <ChevronDown size={10} className="shrink-0 text-muted-foreground" />
      </button>
     </div>
    )}

    {/* ── Gallery card size ── */}
    {activeView?.type === "gallery" && (
     <div className="flex shrink-0 items-center gap-1">
      {!inline && (
       <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/60">Size</span>
      )}
      {(["small", "medium", "large"] as const).map((size) => {
       const isActive = (activeView.galleryCardSize ?? "medium") === size;
       return (
        <button
         key={size}
         onClick={() => onUpdateView(activeView.id, { galleryCardSize: size })}
         title={`${size.charAt(0).toUpperCase() + size.slice(1)} cards`}
         className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold tracking-wide transition-colors duration-150",
          isActive
           ? "bg-primary/10 text-primary"
           : "text-muted-foreground hover:bg-accent hover:text-foreground",
         ].join(" ")}
        >
         {size[0].toUpperCase()}
        </button>
       );
      })}
     </div>
    )}

    {/* ── Search ── */}
    <div className={`relative flex shrink-0 items-center transition-[width] duration-200 ${showSearch ? "w-48" : "w-7"}`}>
     {showSearch ? (
      <>
       <MagnifyingGlass
        size={13}
        className="absolute left-2.5 shrink-0 text-muted-foreground"
       />
       <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onBlur={() => { if (!searchQuery) setShowSearch(false); }}
        onKeyDown={(e) => { if (e.key === "Escape") { onSearchChange(""); setShowSearch(false); } }}
        placeholder="Search…"
        autoFocus
        className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-muted/30 pl-7 pr-7 text-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:bg-background focus:outline-none"
       />
       {searchQuery && (
        <button
         onClick={() => { onSearchChange(""); searchInputRef.current?.focus(); }}
         className="absolute right-2 text-muted-foreground/70 hover:text-muted-foreground"
        >
         <X size={12} />
        </button>
       )}
      </>
     ) : (
      <button
       onClick={() => setShowSearch(true)}
       className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground"
       title="Search (⌘K)"
      >
       <MagnifyingGlass size={13} />
      </button>
     )}
    </div>

    {/* ── Filter / Sort / Properties ── */}
    <button
     onClick={onToggleFilterBar}
     className={[
      "flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
      showFilterBar || filterCount > 0
       ? "bg-primary/10 text-primary"
       : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
     ].join(" ")}
    >
     <Funnel size={13} />
     {!inline && "Filter"}
     {filterCount > 0 && (
      <span className="flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-xs)] bg-primary px-1 text-xs font-bold text-white">
       {filterCount}
      </span>
     )}
    </button>

    <button
     onClick={onToggleSortBar}
     className={[
      "flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
      showSortBar || sortCount > 0
       ? "bg-primary/10 text-primary"
       : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
     ].join(" ")}
    >
     <SortAscending size={13} />
     {!inline && "Sort"}
     {sortCount > 0 && (
      <span className="flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-xs)] bg-primary px-1 text-xs font-bold text-white">
       {sortCount}
      </span>
     )}
    </button>

    {(() => {
     const hiddenCount = ((activeView?.hiddenPropertyIds ?? []) as string[]).length;
     return (
      <button
       onMouseDown={(e) => e.stopPropagation()}
       onClick={(e) => {
        if (propsRect) { setPropsRect(null); return; }
        setPropsRect((e.currentTarget as HTMLElement).getBoundingClientRect());
       }}
       className={[
        "flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
        propsRect || hiddenCount > 0
         ? "bg-primary/10 text-primary"
         : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
       ].join(" ")}
       title="Manage properties"
      >
       <SlidersHorizontal size={13} />
       {!inline && "Properties"}
       {hiddenCount > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-xs)] bg-primary px-1 text-xs font-bold text-white">
         {hiddenCount}
        </span>
       )}
      </button>
     );
    })()}

    {/* ── Board: card display config ── */}
    {activeView?.type === "board" && (
     <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
       if (cardsRect) { setCardsRect(null); return; }
       setCardsRect((e.currentTarget as HTMLElement).getBoundingClientRect());
      }}
      className={[
       "flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
       cardsRect || ((activeView.cardDisplayProps as string[]).length > 0)
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
      ].join(" ")}
      title="Configure card display"
     >
      <Cards size={13} />
      {!inline && "Cards"}
     </button>
    )}

    {/* ── Entry open mode segmented control ── */}
    {activeView && (
     <div className="flex shrink-0 items-center rounded-[var(--radius-sm)] border border-border/60 bg-muted/30 p-0.5">
      <button
       onClick={() => onUpdateView(activeView.id, { entryOpenMode: "side_panel" })}
       title="Open entries in side panel"
       className={[
        "flex h-[26px] items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-medium transition-colors duration-150",
        (activeView.entryOpenMode ?? "side_panel") === "side_panel"
         ? "bg-background text-primary"
         : "text-muted-foreground hover:text-foreground",
       ].join(" ")}
      >
       <SidebarSimple size={12} />
       {!inline && <span className="hidden xl:inline">Panel</span>}
      </button>
      <button
       onClick={() => onUpdateView(activeView.id, { entryOpenMode: "full_page" })}
       title="Open entries as full page"
       className={[
        "flex h-[26px] items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-medium transition-colors duration-150",
        activeView.entryOpenMode === "full_page"
         ? "bg-background text-foreground"
         : "text-muted-foreground hover:text-foreground",
       ].join(" ")}
      >
       <ArrowsOut size={12} />
       {!inline && <span className="hidden xl:inline">Full page</span>}
      </button>
     </div>
    )}

    <div className="flex-1" />

    {/* ── Entry count ── */}
    {!inline && totalEntries > 0 && (
     <span className="mr-2 text-xs text-muted-foreground/70 select-none">
      {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
     </span>
    )}

    {/* ── New entry ── */}
    {isEditor && (
     <button
      onClick={onCreateEntry}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-semibold whitespace-nowrap text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
     >
      <Plus size={14} />
      {!inline && "New"}
     </button>
    )}
   </div>

   {/* ── Portal: Add view dropdown (Notion-style grid) ── */}
   {addViewRect && createPortal(
    <div
     ref={addViewDropRef}
     style={{ position: "fixed", top: addViewRect.bottom + 6, left: addViewRect.left, zIndex: 300 }}
     className="w-[calc(100vw-24px)] max-w-[320px] overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card"
     onClick={(e) => e.stopPropagation()}
    >
     {/* Header */}
     <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
      <Plus size={13} className="text-primary" />
      <p className="text-sm font-semibold text-foreground">Add a new view</p>
     </div>

     {/* View type grid — 4 per row */}
     <div className="grid grid-cols-4 gap-1.5 p-3">
      {VIEW_TYPES.map((type) => {
       const VIcon = VIEW_ICONS[type];
       return (
        <button
         key={type}
         onClick={() => { onAddView(VIEW_LABELS[type], type); setAddViewRect(null); }}
         className="group flex flex-col items-center gap-2 rounded-[var(--radius-md)] px-2 py-3 text-center transition-colors duration-150 hover:bg-accent"
        >
         <div className="flex size-12 items-center justify-center rounded-[var(--radius-md)] border border-border/70 bg-muted/50 transition-colors duration-150 group-hover:border-primary/40 group-hover:bg-primary/10">
          <VIcon size={24} className="text-foreground/70 transition-colors duration-150 group-hover:text-primary" />
         </div>
         <span className="text-xs font-medium leading-tight text-muted-foreground transition-colors duration-150 group-hover:text-primary">
          {VIEW_LABELS[type]}
         </span>
        </button>
       );
      })}
     </div>

     {/* Footer hint */}
     <div className="border-t border-border/40 px-4 py-2.5">
      <p className="text-xs text-muted-foreground">Click a view type to create it</p>
     </div>
    </div>,
    document.body
   )}

   {/* ── Portal: View context menu ── */}
   {contextView && contextRect && createPortal(
    <div
     ref={contextDropRef}
     style={{ position: "fixed", top: contextRect.bottom + 4, left: contextRect.left, zIndex: 500 }}
     className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover p-1"
    >
     <button
      onClick={() => { setEditingId(contextView.id); setEditingName(contextView.name); setContextView(null); setContextRect(null); }}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors duration-100 hover:bg-accent"
     >
      <Pencil size={13} className="shrink-0 text-muted-foreground" /> Rename
     </button>
     <button
      onClick={() => { onDuplicateView(contextView.id); setContextView(null); setContextRect(null); }}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors duration-100 hover:bg-accent"
     >
      <Copy size={13} className="shrink-0 text-muted-foreground" /> Duplicate view
     </button>
     {views.length > 1 && (
      <>
       <div className="my-1 h-px bg-border/60" />
       <button
        onClick={() => { setDeleteViewTarget(contextView); setContextView(null); setContextRect(null); }}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-destructive transition-colors duration-100 hover:bg-destructive/10"
       >
        <Trash size={13} className="shrink-0" /> Delete view
       </button>
      </>
     )}
    </div>,
    document.body
   )}

   {/* ── Portal: Board card display panel ── */}
   {cardsRect && activeView?.type === "board" && createPortal(
    <CardDisplayPanel
     ref={cardsDropRef}
     rect={cardsRect}
     properties={properties.filter((p) => !p.isSystem && p.id !== activeView.groupByPropertyId)}
     cardDisplayProps={(activeView.cardDisplayProps as string[]) ?? []}
     onChange={(ids) => { onUpdateView(activeView.id, { cardDisplayProps: ids }); }}
     onClose={() => setCardsRect(null)}
    />,
    document.body
   )}

   {/* ── Portal: Properties panel ── */}
   {propsRect && createPortal(
    <PropertiesPanel
     ref={propsDropRef}
     rect={propsRect}
     properties={properties.filter((p) => !p.isSystem)}
     hiddenPropertyIds={(activeView?.hiddenPropertyIds ?? []) as string[]}
     onToggle={(propId, hidden) => {
      if (!activeView) return;
      const current = (activeView.hiddenPropertyIds ?? []) as string[];
      const next = hidden
       ? [...current, propId]
       : current.filter((id) => id !== propId);
      onUpdateView(activeView.id, { hiddenPropertyIds: next });
     }}
     onUpdateHidden={(ids) => {
      if (!activeView) return;
      onUpdateView(activeView.id, { hiddenPropertyIds: ids });
     }}
     onAddProperty={isEditor ? onAddProperty : undefined}
     onClose={() => setPropsRect(null)}
    />,
    document.body
   )}

   {/* ── Portal: Group by dropdown ── */}
   {groupRect && activeView && createPortal(
    <div
     ref={groupDropRef}
     style={{ position: "fixed", top: groupRect.bottom + 6, left: groupRect.left, zIndex: 300 }}
     className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
    >
     <p className="px-3 pb-1 pt-2.5 text-xs font-semibold tracking-wide text-muted-foreground">Group by</p>
     <div className="p-1.5 pt-0.5">
      <button
       onClick={() => { onUpdateView(activeView.id, { groupByPropertyId: null }); setGroupRect(null); }}
       className={[
        "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
        !activeView.groupByPropertyId ? "font-semibold text-primary" : "text-muted-foreground",
       ].join(" ")}
      >
       <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60 text-xs text-muted-foreground">—</span>
       None
      </button>
      {selectProps.map((p) => {
       const isActive = activeView.groupByPropertyId === p.id;
       return (
        <button
         key={p.id}
         onClick={() => { onUpdateView(activeView.id, { groupByPropertyId: p.id }); setGroupRect(null); }}
         className={[
          "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
          isActive ? "font-semibold text-primary" : "text-foreground",
         ].join(" ")}
        >
         <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60">
          <CircleDashed size={11} className="text-muted-foreground/60" />
         </span>
         <span className="flex-1 truncate text-left">{p.name}</span>
         {isActive && <Check size={12} className="shrink-0 text-primary" />}
        </button>
       );
      })}
     </div>
    </div>,
    document.body
   )}

   {/* ── Delete view confirmation ── */}
   <ConfirmDialog
    open={!!deleteViewTarget}
    onOpenChange={(o) => !o && setDeleteViewTarget(null)}
    title={`Delete "${deleteViewTarget?.name}"?`}
    description="This view and its configuration (filters, sorts, hidden fields) will be permanently deleted. Entries in your database will not be affected."
    confirmLabel="Delete view"
    confirmLoadingLabel="Deleting…"
    loading={deletingView}
    onConfirm={async () => {
     if (!deleteViewTarget) return;
     setDeletingView(true);
     await onDeleteView(deleteViewTarget.id);
     setDeletingView(false);
     setDeleteViewTarget(null);
    }}
   />

   {/* ── Portal: Calendar date property dropdown ── */}
   {dateRect && activeView?.type === "calendar" && createPortal(
    <div
     ref={dateDropRef}
     style={{ position: "fixed", top: dateRect.bottom + 6, left: dateRect.left, zIndex: 300 }}
     className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
    >
     <p className="px-3 pb-1 pt-2.5 text-xs font-semibold tracking-wide text-muted-foreground">Date property</p>
     <div className="p-1.5 pt-0.5">
      <button
       onClick={() => { onUpdateView(activeView.id, { calendarPropertyId: null }); setDateRect(null); }}
       className={[
        "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
        !activeView.calendarPropertyId ? "font-semibold text-primary" : "text-muted-foreground",
       ].join(" ")}
      >
       <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60 text-xs text-muted-foreground">—</span>
       None
      </button>
      {dateProps.map((p) => {
       const isActive = activeView.calendarPropertyId === p.id;
       return (
        <button
         key={p.id}
         onClick={() => { onUpdateView(activeView.id, { calendarPropertyId: p.id }); setDateRect(null); }}
         className={[
          "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
          isActive ? "font-semibold text-primary" : "text-foreground",
         ].join(" ")}
        >
         <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60">
          <CalendarBlank size={11} className="text-muted-foreground/60" />
         </span>
         <span className="flex-1 truncate text-left">{p.name}</span>
         {isActive && <Check size={12} className="shrink-0 text-primary" />}
        </button>
       );
      })}
     </div>
    </div>,
    document.body
   )}
  </>
 );
}

// ── CardDisplayPanel ──────────────────────────────────────────────────────────

import { forwardRef } from "react";

interface CardDisplayPanelProps {
 rect: DOMRect;
 properties: import("./types").DbProperty[];
 cardDisplayProps: string[];
 onChange: (ids: string[]) => void;
 onClose: () => void;
}

const CardDisplayPanel = forwardRef<HTMLDivElement, CardDisplayPanelProps>(
 function CardDisplayPanel({ rect, properties, cardDisplayProps, onChange }, ref) {
  const selected = new Set(cardDisplayProps);
  const panelW = 240;
  const left  = Math.max(8, rect.right - panelW);
  const top  = rect.bottom + 6;

  function toggle(propId: string) {
   if (selected.has(propId)) {
    onChange(cardDisplayProps.filter((id) => id !== propId));
   } else {
    onChange([...cardDisplayProps, propId]);
   }
  }

  return (
   <div
    ref={ref}
    style={{ position: "fixed", top, left, zIndex: 300, width: panelW }}
    className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
   >
    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
     <p className="text-xs font-semibold text-foreground/80">Card properties</p>
     {properties.length > 0 && (
      <button
       onClick={() => onChange(selected.size === properties.length ? [] : properties.map((p) => p.id))}
       className="text-xs font-medium text-primary/70 hover:text-primary"
      >
       {selected.size === properties.length ? "Clear all" : "Select all"}
      </button>
     )}
    </div>
    <div className="max-h-56 overflow-y-auto p-1.5">
     {properties.length === 0 && (
      <p className="px-3 py-3 text-xs text-muted-foreground">No properties</p>
     )}
     {properties.map((prop) => {
      const Icon  = PROP_ICONS_MAP[prop.type] ?? TextT;
      const on   = selected.has(prop.id);
      return (
       <button
        key={prop.id}
        onClick={() => toggle(prop.id)}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-accent"
       >
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border transition-colors ${
         on ? "border-border/50 bg-muted/30 text-muted-foreground" : "border-border/30 bg-muted/10 text-muted-foreground/60"
        }`}>
         {on ? <Eye size={12} /> : <EyeSlash size={12} />}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
         <Icon size={12} />
         <span className={`truncate text-sm font-medium ${on ? "text-foreground" : "text-muted-foreground/70"}`}>
          {prop.name}
         </span>
        </span>
        <span className={`size-1.5 shrink-0 rounded-full transition-colors ${on ? "bg-success" : "bg-border/40"}`} />
       </button>
      );
     })}
    </div>
    <div className="border-t border-border/60 px-3 py-2">
     <p className="text-xs text-muted-foreground">
      {selected.size === 0 ? "Showing all properties" : `${selected.size} propert${selected.size === 1 ? "y" : "ies"} selected`}
     </p>
    </div>
   </div>
  );
 }
);

// ── PropertiesPanel ───────────────────────────────────────────────────────────

const PROP_ICONS_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
 text: TextT, number: Hash, select: CircleDashed, multi_select: Tag,
 date: CalendarBlank, checkbox: CheckSquare, url: LinkIcon, email: Envelope,
 phone: Phone, person: User, relation: ArrowsLeftRight,
};

interface PropertiesPanelProps {
 rect: DOMRect;
 properties: import("./types").DbProperty[];
 hiddenPropertyIds: string[];
 onToggle: (propId: string, hide: boolean) => void;
 onUpdateHidden: (ids: string[]) => void;
 onAddProperty?: (name: string, type: string) => Promise<unknown>;
 onClose: () => void;
}

const PROP_TYPES_LIST = Object.values(PROPERTY_REGISTRY).filter((d) => d.type !== "relation");

const PropertiesPanel = forwardRef<HTMLDivElement, PropertiesPanelProps>(
 function PropertiesPanel({ rect, properties, hiddenPropertyIds, onToggle, onUpdateHidden, onAddProperty }, ref) {
  const hiddenSet = new Set(hiddenPropertyIds);
  const [adding, setAdding]    = useState(false);
  const [newName, setNewName]   = useState("");
  const [saving, setSaving]    = useState(false);

  // Position: align right edge of panel to button right edge, open below
  const panelW = 260;
  const left  = Math.max(8, rect.right - panelW);
  const top  = rect.bottom + 6;

  const allVisible = hiddenPropertyIds.length === 0;

  async function handleAdd(type: string) {
   if (!onAddProperty || saving) return;
   setSaving(true);
   await onAddProperty(newName.trim() || (PROPERTY_REGISTRY[type as keyof typeof PROPERTY_REGISTRY]?.label ?? type), type);
   setNewName("");
   setAdding(false);
   setSaving(false);
  }

  return (
   <div
    ref={ref}
    style={{ position: "fixed", top, left, zIndex: 300, width: panelW }}
    className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
   >
    {/* Header */}
    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
     <p className="text-xs font-semibold text-foreground/80">Properties</p>
     {properties.length > 0 && (
      <button
       onClick={() => {
        if (allVisible) {
         onUpdateHidden(properties.map((p) => p.id));
        } else {
         onUpdateHidden([]);
        }
       }}
       className="text-xs font-medium text-primary/70 hover:text-primary"
      >
       {allVisible ? "Hide all" : "Show all"}
      </button>
     )}
    </div>

    {/* Property list */}
    <div className="max-h-60 overflow-y-auto p-1.5">
     {properties.length === 0 && !adding && (
      <p className="px-3 py-3 text-xs text-muted-foreground">No properties yet</p>
     )}
     {properties.map((prop) => {
      const Icon  = PROP_ICONS_MAP[prop.type] ?? TextT;
      const visible = !hiddenSet.has(prop.id);
      return (
       <button
        key={prop.id}
        onClick={() => onToggle(prop.id, visible)}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-accent"
       >
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border transition-colors ${
         visible ? "border-border/50 bg-muted/30 text-muted-foreground" : "border-border/30 bg-muted/10 text-muted-foreground/60"
        }`}>
         {visible ? <Eye size={12} /> : <EyeSlash size={12} />}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
         <Icon size={12} />
         <span className={`truncate text-sm font-medium ${visible ? "text-foreground" : "text-muted-foreground/70"}`}>
          {prop.name}
         </span>
        </span>
        <span className={`size-1.5 shrink-0 rounded-full transition-colors ${visible ? "bg-success" : "bg-border/40"}`} />
       </button>
      );
     })}
    </div>

    {/* Add property — editor only */}
    {onAddProperty && (
     <div className="border-t border-border/60">
      {adding ? (
       <div className="p-2">
        <input
         autoFocus
         value={newName}
         onChange={(e) => setNewName(e.target.value)}
         onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setNewName(""); } e.stopPropagation(); }}
         placeholder="Property name…"
         className="mb-2 w-full rounded-[var(--radius-sm)] border border-border bg-muted/30 px-2.5 py-1.5 text-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-1">
         {PROP_TYPES_LIST.map((def) => {
          const Icon = PROP_ICONS_MAP[def.type] ?? TextT;
          return (
           <button
            key={def.type}
            disabled={saving}
            onClick={() => handleAdd(def.type)}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
           >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60 text-muted-foreground">
             <Icon size={11} />
            </span>
            {def.label}
           </button>
          );
         })}
        </div>
        <button
         onClick={() => { setAdding(false); setNewName(""); }}
         className="mt-1.5 w-full rounded-[var(--radius-sm)] py-1.5 text-xs text-muted-foreground/60 hover:bg-accent hover:text-muted-foreground"
        >
         Cancel
        </button>
       </div>
      ) : (
       <button
        onClick={() => setAdding(true)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground/60 transition-colors hover:bg-accent/60 hover:text-foreground"
       >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-dashed border-border/60">
         <Plus size={11} />
        </span>
        Add property
       </button>
      )}
     </div>
    )}
   </div>
  );
 }
);
