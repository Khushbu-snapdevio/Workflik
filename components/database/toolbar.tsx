"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Table, Kanban, CalendarBlank, SquaresFour,
  Plus, Funnel, SortAscending, Pencil, Trash,
  MagnifyingGlass, X, Eye, EyeSlash, SlidersHorizontal, Copy,
  TextT, Hash, CircleDashed, Tag, CheckSquare,
  Link as LinkIcon, Envelope, Phone, User, ArrowsLeftRight,
  SidebarSimple, ArrowsOut, Cards,
  type Icon,
} from "@phosphor-icons/react";
import { PROPERTY_REGISTRY } from "@/components/database/property-registry";
import type { DbView, DbProperty, FilterRule, SortRule } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const VIEW_ICONS: Record<string, Icon> = {
  table:    Table,
  board:    Kanban,
  calendar: CalendarBlank,
  gallery:  SquaresFour,
};
const VIEW_TYPES  = ["table", "board", "calendar", "gallery"] as const;
const VIEW_LABELS: Record<string, string> = { table: "Table", board: "Board", calendar: "Calendar", gallery: "Gallery" };

// ── Props ─────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  views:             DbView[];
  activeViewId:      string | null;
  properties:        DbProperty[];
  activeView:        DbView | null;
  isEditor:          boolean;
  onSwitchView:      (viewId: string) => void;
  onAddView:         (name: string, type: string) => void;
  onDuplicateView:   (viewId: string) => void;
  onDeleteView:      (viewId: string) => void;
  onUpdateView:      (viewId: string, patch: Record<string, unknown>) => void;
  showFilterBar:     boolean;
  showSortBar:       boolean;
  onToggleFilterBar: () => void;
  onToggleSortBar:   () => void;
  onCreateEntry:     () => void;
  onAddProperty:     (name: string, type: string) => Promise<unknown>;
  searchQuery:       string;
  onSearchChange:    (q: string) => void;
  searchInputRef:    React.RefObject<HTMLInputElement | null>;
  selectedCount:     number;
  onBulkDelete:      () => Promise<void>;
  onClearSelection:  () => void;
  totalEntries:      number;
  inline?:           boolean;
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
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editingName, setEditingName]   = useState("");
  const [addViewRect, setAddViewRect]   = useState<DOMRect | null>(null);
  const [contextView, setContextView]   = useState<DbView | null>(null);
  const [contextRect, setContextRect]   = useState<DOMRect | null>(null);
  const [showSearch, setShowSearch]     = useState(!!searchQuery);
  const [deletingBulk, setDeletingBulk]           = useState(false);
  const [showBulkConfirm, setShowBulkConfirm]     = useState(false);
  const [propsRect, setPropsRect]       = useState<DOMRect | null>(null);
  const [cardsRect, setCardsRect]       = useState<DOMRect | null>(null);
  const [groupRect, setGroupRect]       = useState<DOMRect | null>(null);
  const [dateRect, setDateRect]         = useState<DOMRect | null>(null);
  const addViewDropRef = useRef<HTMLDivElement>(null);
  const contextDropRef = useRef<HTMLDivElement>(null);
  const propsDropRef   = useRef<HTMLDivElement>(null);
  const cardsDropRef   = useRef<HTMLDivElement>(null);
  const groupDropRef   = useRef<HTMLDivElement>(null);
  const dateDropRef    = useRef<HTMLDivElement>(null);

  const filterCount = ((activeView?.filters as FilterRule[] | undefined) ?? []).length;
  const sortCount   = ((activeView?.sorts   as SortRule[]   | undefined) ?? []).length;

  // Close portals on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      const t = e.target as Node;
      if (addViewDropRef.current && !addViewDropRef.current.contains(t)) setAddViewRect(null);
      if (contextDropRef.current && !contextDropRef.current.contains(t)) { setContextView(null); setContextRect(null); }
      if (propsDropRef.current   && !propsDropRef.current.contains(t))   setPropsRect(null);
      if (cardsDropRef.current   && !cardsDropRef.current.contains(t))   setCardsRect(null);
      if (groupDropRef.current   && !groupDropRef.current.contains(t))   setGroupRect(null);
      if (dateDropRef.current    && !dateDropRef.current.contains(t))    setDateRect(null);
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
  const dateProps   = properties.filter((p) => p.type === "date"   && !p.isSystem);

  // ── Bulk actions bar ──────────────────────────────────────────────────────

  if (selectedCount > 0) {
    return (
      <>
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-primary/5 px-4 backdrop-blur-sm">
          <button
            onClick={onClearSelection}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Trash size={13} />
            {deletingBulk ? "Deleting…" : `Delete ${selectedCount}`}
          </button>
        </div>

        {showBulkConfirm && typeof document !== "undefined" && createPortal(
          <div
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !deletingBulk) setShowBulkConfirm(false); }}
          >
            <div className="w-[360px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
              <div className="flex flex-col items-center gap-3 px-6 pb-4 pt-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
                  <Trash size={20} className="text-red-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-[15px] font-semibold text-foreground">
                    Delete {selectedCount} {selectedCount === 1 ? "entry" : "entries"}?
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {selectedCount === 1
                      ? "This entry and all its content will be permanently deleted."
                      : `These ${selectedCount} entries and all their content will be permanently deleted.`}
                    {" "}This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 border-t border-border/60 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setShowBulkConfirm(false)}
                  disabled={deletingBulk}
                  className="flex-1 rounded-xl border border-border/80 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={deletingBulk}
                  className="flex-1 rounded-xl bg-red-500 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  {deletingBulk ? "Deleting…" : `Delete ${selectedCount}`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // ── Normal toolbar ────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur-[8px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* ── View tabs ── */}
        <div className="flex items-center gap-0.5">
          {views.map((view) => {
            const ViewIcon = VIEW_ICONS[view.type] ?? Table;
            const isActive = view.id === activeViewId;
            return (
              <div key={view.id} className="group/tab flex items-center">
                {editingId === view.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(view)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")  commitRename(view);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="h-7 rounded-md border border-primary/40 bg-background px-2 text-[13px] focus:outline-none"
                    style={{ width: Math.max(80, editingName.length * 8) }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    onClick={() => onSwitchView(view.id)}
                    onDoubleClick={() => isEditor && (setEditingId(view.id), setEditingName(view.name))}
                    className={[
                      "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150",
                      isActive
                        ? "bg-primary text-white shadow-[0_1px_4px_rgba(201,106,43,0.30)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    ].join(" ")}
                  >
                    <ViewIcon size={13} weight={isActive ? "fill" : "regular"} />
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
                    className="ml-0 flex h-5 w-0 items-center justify-center overflow-hidden rounded text-muted-foreground/40 transition-all hover:bg-accent hover:text-muted-foreground group-hover/tab:mr-0.5 group-hover/tab:w-5"
                  >
                    <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="currentColor">
                      <circle cx="8" cy="3" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="8" cy="13" r="1.3"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })}

          {isEditor && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                if (addViewRect) { setAddViewRect(null); return; }
                setAddViewRect((e.currentTarget as HTMLElement).getBoundingClientRect());
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
              title="Add view"
            >
              <Plus size={13} />
            </button>
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
                "flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium whitespace-nowrap transition-all duration-150",
                groupRect || activeView.groupByPropertyId
                  ? "border-primary/30 bg-primary/8 text-primary"
                  : "border-border bg-background text-foreground/70 hover:border-border hover:bg-muted",
              ].join(" ")}
            >
              {activeView.groupByPropertyId
                ? selectProps.find((p) => p.id === activeView.groupByPropertyId)?.name ?? "Group"
                : <span className="text-muted-foreground/50">None</span>}
              <svg viewBox="0 0 10 6" className="size-2.5 shrink-0 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M1 1l4 4 4-4"/>
              </svg>
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
                "flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium whitespace-nowrap transition-all duration-150",
                dateRect || activeView.calendarPropertyId
                  ? "border-primary/30 bg-primary/8 text-primary"
                  : "border-border bg-background text-foreground/70 hover:border-border hover:bg-muted",
              ].join(" ")}
            >
              {activeView.calendarPropertyId
                ? dateProps.find((p) => p.id === activeView.calendarPropertyId)?.name ?? "Date"
                : <span className="text-muted-foreground/50">None</span>}
              <svg viewBox="0 0 10 6" className="size-2.5 shrink-0 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M1 1l4 4 4-4"/>
              </svg>
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
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground/50 hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {size[0].toUpperCase()}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Search ── */}
        <div className={`relative flex shrink-0 items-center transition-all duration-200 ${showSearch ? "w-48" : "w-7"}`}>
          {showSearch ? (
            <>
              <MagnifyingGlass
                size={13}
                className="absolute left-2.5 shrink-0 text-muted-foreground/50"
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
                className="h-8 w-full rounded-lg border border-border bg-muted/30 pl-7 pr-7 text-[13px] placeholder:text-muted-foreground/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:border-primary/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(""); searchInputRef.current?.focus(); }}
                  className="absolute right-2 text-muted-foreground/40 hover:text-muted-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-accent hover:text-muted-foreground"
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
            "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150",
            showFilterBar || filterCount > 0
              ? "bg-primary/10 text-primary"
              : "text-stone-500 hover:bg-muted hover:text-foreground",
          ].join(" ")}
        >
          <Funnel size={13} weight={filterCount > 0 ? "fill" : "regular"} />
          {!inline && "Filter"}
          {filterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {filterCount}
            </span>
          )}
        </button>

        <button
          onClick={onToggleSortBar}
          className={[
            "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150",
            showSortBar || sortCount > 0
              ? "bg-primary/10 text-primary"
              : "text-stone-500 hover:bg-muted hover:text-foreground",
          ].join(" ")}
        >
          <SortAscending size={13} weight={sortCount > 0 ? "bold" : "regular"} />
          {!inline && "Sort"}
          {sortCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
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
                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150",
                propsRect || hiddenCount > 0
                  ? "bg-primary/10 text-primary"
                  : "text-stone-500 hover:bg-muted hover:text-foreground",
              ].join(" ")}
              title="Manage properties"
            >
              <SlidersHorizontal size={13} />
              {!inline && "Properties"}
              {hiddenCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
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
              "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150",
              cardsRect || ((activeView.cardDisplayProps as string[]).length > 0)
                ? "bg-primary/10 text-primary"
                : "text-stone-500 hover:bg-muted hover:text-foreground",
            ].join(" ")}
            title="Configure card display"
          >
            <Cards size={13} />
            {!inline && "Cards"}
          </button>
        )}

        {/* ── Entry open mode segmented control ── */}
        {activeView && (
          <div className="flex shrink-0 items-center rounded-lg border border-border/60 bg-muted/30 p-0.5">
            <button
              onClick={() => onUpdateView(activeView.id, { entryOpenMode: "side_panel" })}
              title="Open entries in side panel"
              className={[
                "flex h-[26px] items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-all duration-150",
                (activeView.entryOpenMode ?? "side_panel") === "side_panel"
                  ? "bg-background text-primary shadow-sm"
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
                "flex h-[26px] items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-all duration-150",
                activeView.entryOpenMode === "full_page"
                  ? "bg-background text-foreground shadow-sm"
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
          <span className="mr-2 text-[12px] text-muted-foreground/40 select-none">
            {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
          </span>
        )}

        {/* ── New entry ── */}
        {isEditor && (
          <button
            onClick={onCreateEntry}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold whitespace-nowrap text-white shadow-[0_1px_4px_rgba(201,106,43,0.25)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_2px_8px_rgba(201,106,43,0.35)] active:scale-95"
          >
            <Plus size={14} weight="bold" />
            {!inline && "New"}
          </button>
        )}
      </div>

      {/* ── Portal: Add view dropdown ── */}
      {addViewRect && createPortal(
        <div
          ref={addViewDropRef}
          style={{ position: "fixed", top: addViewRect.bottom + 6, left: addViewRect.left, zIndex: 300 }}
          className="w-44 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-xl"
        >
          <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Add view</p>
          {VIEW_TYPES.map((type) => {
            const VIcon = VIEW_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => { onAddView(VIEW_LABELS[type], type); setAddViewRect(null); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground hover:bg-accent"
              >
                <VIcon size={14} />
                {VIEW_LABELS[type]}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      {/* ── Portal: View context menu ── */}
      {contextView && contextRect && createPortal(
        <div
          ref={contextDropRef}
          style={{ position: "fixed", top: contextRect.bottom + 6, left: contextRect.left, zIndex: 300 }}
          className="w-44 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-xl"
        >
          <button
            onClick={() => { setEditingId(contextView.id); setEditingName(contextView.name); setContextView(null); setContextRect(null); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground hover:bg-accent"
          >
            <Pencil size={13} /> Rename
          </button>
          <button
            onClick={() => { onDuplicateView(contextView.id); setContextView(null); setContextRect(null); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground hover:bg-accent"
          >
            <Copy size={13} /> Duplicate view
          </button>
          {views.length > 1 && (
            <>
              <div className="my-1 h-px bg-border/60" />
              <button
                onClick={() => { onDeleteView(contextView.id); setContextView(null); setContextRect(null); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash size={13} /> Delete view
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
          className="w-48 overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        >
          <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Group by</p>
          <div className="p-1.5 pt-0.5">
            <button
              onClick={() => { onUpdateView(activeView.id, { groupByPropertyId: null }); setGroupRect(null); }}
              className={[
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-accent",
                !activeView.groupByPropertyId ? "font-semibold text-primary" : "text-muted-foreground",
              ].join(" ")}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/60 text-[11px] text-muted-foreground/50">—</span>
              None
            </button>
            {selectProps.map((p) => {
              const isActive = activeView.groupByPropertyId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { onUpdateView(activeView.id, { groupByPropertyId: p.id }); setGroupRect(null); }}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-accent",
                    isActive ? "font-semibold text-primary" : "text-foreground",
                  ].join(" ")}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/60">
                    <CircleDashed size={11} className="text-muted-foreground/60" />
                  </span>
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  {isActive && (
                    <svg viewBox="0 0 12 12" className="size-3 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="2,6 5,9 10,3"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* ── Portal: Calendar date property dropdown ── */}
      {dateRect && activeView?.type === "calendar" && createPortal(
        <div
          ref={dateDropRef}
          style={{ position: "fixed", top: dateRect.bottom + 6, left: dateRect.left, zIndex: 300 }}
          className="w-48 overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        >
          <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Date property</p>
          <div className="p-1.5 pt-0.5">
            <button
              onClick={() => { onUpdateView(activeView.id, { calendarPropertyId: null }); setDateRect(null); }}
              className={[
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-accent",
                !activeView.calendarPropertyId ? "font-semibold text-primary" : "text-muted-foreground",
              ].join(" ")}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/60 text-[11px] text-muted-foreground/50">—</span>
              None
            </button>
            {dateProps.map((p) => {
              const isActive = activeView.calendarPropertyId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { onUpdateView(activeView.id, { calendarPropertyId: p.id }); setDateRect(null); }}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-accent",
                    isActive ? "font-semibold text-primary" : "text-foreground",
                  ].join(" ")}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/60">
                    <CalendarBlank size={11} className="text-muted-foreground/60" />
                  </span>
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  {isActive && (
                    <svg viewBox="0 0 12 12" className="size-3 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="2,6 5,9 10,3"/>
                    </svg>
                  )}
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
    const left   = Math.max(8, rect.right - panelW);
    const top    = rect.bottom + 6;

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
        className="overflow-hidden rounded-xl border border-border bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-[12px] font-semibold text-foreground/80">Card properties</p>
          {properties.length > 0 && (
            <button
              onClick={() => onChange(selected.size === properties.length ? [] : properties.map((p) => p.id))}
              className="text-[11px] font-medium text-primary/70 hover:text-primary"
            >
              {selected.size === properties.length ? "Clear all" : "Select all"}
            </button>
          )}
        </div>
        <div className="max-h-56 overflow-y-auto p-1.5">
          {properties.length === 0 && (
            <p className="px-3 py-3 text-[12px] text-muted-foreground/50">No properties</p>
          )}
          {properties.map((prop) => {
            const Icon    = PROP_ICONS_MAP[prop.type] ?? TextT;
            const on      = selected.has(prop.id);
            return (
              <button
                key={prop.id}
                onClick={() => toggle(prop.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  on ? "border-border/50 bg-muted/30 text-muted-foreground" : "border-border/30 bg-muted/10 text-muted-foreground/30"
                }`}>
                  {on ? <Eye size={12} /> : <EyeSlash size={12} />}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Icon size={12} />
                  <span className={`truncate text-[13px] font-medium ${on ? "text-foreground" : "text-muted-foreground/40"}`}>
                    {prop.name}
                  </span>
                </span>
                <span className={`size-1.5 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-400" : "bg-border/40"}`} />
              </button>
            );
          })}
        </div>
        <div className="border-t border-border/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground/50">
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
    const [adding, setAdding]       = useState(false);
    const [newName, setNewName]     = useState("");
    const [saving, setSaving]       = useState(false);

    // Position: align right edge of panel to button right edge, open below
    const panelW = 260;
    const left   = Math.max(8, rect.right - panelW);
    const top    = rect.bottom + 6;

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
        className="overflow-hidden rounded-xl border border-border bg-background shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-[12px] font-semibold text-foreground/80">Properties</p>
          {properties.length > 0 && (
            <button
              onClick={() => {
                if (allVisible) {
                  onUpdateHidden(properties.map((p) => p.id));
                } else {
                  onUpdateHidden([]);
                }
              }}
              className="text-[11px] font-medium text-primary/70 hover:text-primary"
            >
              {allVisible ? "Hide all" : "Show all"}
            </button>
          )}
        </div>

        {/* Property list */}
        <div className="max-h-60 overflow-y-auto p-1.5">
          {properties.length === 0 && !adding && (
            <p className="px-3 py-3 text-[12px] text-muted-foreground/50">No properties yet</p>
          )}
          {properties.map((prop) => {
            const Icon    = PROP_ICONS_MAP[prop.type] ?? TextT;
            const visible = !hiddenSet.has(prop.id);
            return (
              <button
                key={prop.id}
                onClick={() => onToggle(prop.id, visible)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  visible ? "border-border/50 bg-muted/30 text-muted-foreground" : "border-border/30 bg-muted/10 text-muted-foreground/30"
                }`}>
                  {visible ? <Eye size={12} /> : <EyeSlash size={12} />}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Icon size={12} />
                  <span className={`truncate text-[13px] font-medium ${visible ? "text-foreground" : "text-muted-foreground/40"}`}>
                    {prop.name}
                  </span>
                </span>
                <span className={`size-1.5 shrink-0 rounded-full transition-colors ${visible ? "bg-emerald-400" : "bg-border/40"}`} />
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
                  className="mb-2 w-full rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[13px] placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <div className="grid grid-cols-2 gap-1">
                  {PROP_TYPES_LIST.map((def) => {
                    const Icon = PROP_ICONS_MAP[def.type] ?? TextT;
                    return (
                      <button
                        key={def.type}
                        disabled={saving}
                        onClick={() => handleAdd(def.type)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                          <Icon size={11} />
                        </span>
                        {def.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => { setAdding(false); setNewName(""); }}
                  className="mt-1.5 w-full rounded-lg py-1.5 text-[12px] text-muted-foreground/60 hover:bg-accent hover:text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-muted-foreground/60 transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-dashed border-border/60">
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
