"use client";

import {
  Expand as ArrowsOut,
  Calendar as CalendarBlank,
  Check,
  ChevronDown,
  CircleDashed,
  Copy,
  Eye,
  EyeOff as EyeSlash,
  Filter as Funnel,
  GanttChartSquare,
  Kanban,
  type LucideIcon,
  Search as MagnifyingGlass,
  MoreVertical,
  Pencil,
  Plus,
  PanelLeft as SidebarSimple,
  SlidersHorizontal,
  ArrowUpDown as SortAscending,
  LayoutGrid as SquaresFour,
  Table2 as Table,
  Type as TextT,
  Trash2 as Trash,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PROPERTY_REGISTRY,
  PROPERTY_TYPE_ICON,
} from "@/components/database/property-registry";
import { PageIcon } from "@/components/pages/page-icon";
import { isGroupableType } from "@/components/database/grouping";
import { RelationDatabasePicker } from "@/components/database/relation-database-picker";
import { RollupConfigPicker } from "@/components/database/rollup-config-picker";
import { FormulaConfigPicker } from "@/components/database/formula-config-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import {
  getClampedLeft,
  getClampedTop,
} from "@/lib/ui/clamp-to-viewport";
import type { DbProperty, DbView, FilterRule, SortRule } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const VIEW_ICONS: Record<string, LucideIcon> = {
  table: Table,
  board: Kanban,
  calendar: CalendarBlank,
  gallery: SquaresFour,
  gantt: GanttChartSquare,
};
const VIEW_TYPES = ["table", "board", "calendar", "gallery"] as const;
const VIEW_LABELS: Record<string, string> = {
  table: "Table",
  board: "Board",
  calendar: "Calendar",
  gallery: "Gallery",
  gantt: "Gantt",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  activeView: DbView | null;
  activeViewId: string | null;
  inline?: boolean;
  isEditor: boolean;
  workspaceId: string;
  databaseId: string;
  onAddProperty: (name: string, type: string, config?: Record<string, unknown>, twoWay?: boolean) => Promise<unknown>;
  onAddView: (name: string, type: string) => void;
  onBulkDelete: () => Promise<void>;
  onClearSelection: () => void;
  onCreateEntry: () => void;
  onDeleteView: (viewId: string) => void;
  onDuplicateView: (viewId: string) => void;
  onSearchChange: (q: string) => void;
  onSwitchView: (viewId: string) => void;
  onToggleFilterBar: () => void;
  onToggleSortBar: () => void;
  onUpdateView: (viewId: string, patch: Record<string, unknown>) => void;
  properties: DbProperty[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  selectedCount: number;
  showFilterBar: boolean;
  showSortBar: boolean;
  totalEntries: number;
  views: DbView[];
}

// ── DatabaseToolbar ───────────────────────────────────────────────────────────

export function DatabaseToolbar({
  views,
  activeViewId,
  properties,
  activeView,
  isEditor,
  workspaceId,
  databaseId,
  onSwitchView,
  onAddView,
  onDuplicateView,
  onDeleteView,
  onUpdateView,
  showFilterBar,
  showSortBar,
  onToggleFilterBar,
  onToggleSortBar,
  onCreateEntry,
  onAddProperty,
  searchQuery,
  onSearchChange,
  searchInputRef,
  selectedCount,
  onBulkDelete,
  onClearSelection,
  totalEntries,
  inline = false,
}: ToolbarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addViewRect, setAddViewRect] = useState<DOMRect | null>(null);
  const [contextView, setContextView] = useState<DbView | null>(null);
  const [contextRect, setContextRect] = useState<DOMRect | null>(null);
  const [showSearch, setShowSearch] = useState(!!searchQuery);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [deleteViewTarget, setDeleteViewTarget] = useState<DbView | null>(null);
  const [deletingView, setDeletingView] = useState(false);
  const [propsRect, setPropsRect] = useState<DOMRect | null>(null);
  const [cardsRect, setCardsRect] = useState<DOMRect | null>(null);
  const [groupRect, setGroupRect] = useState<DOMRect | null>(null);
  const [dateRect, setDateRect] = useState<DOMRect | null>(null);
  const [ganttPropRect, setGanttPropRect] = useState<{ field: "start" | "end"; rect: DOMRect } | null>(null);
  // "Layout" (change an existing view's type, e.g. Table → Board) — separate
  // from the "Add a new view" grid (addViewRect), which only ever creates a
  // fresh view and can't retarget one that already exists.
  const [layoutView, setLayoutView] = useState<DbView | null>(null);
  const [layoutRect, setLayoutRect] = useState<DOMRect | null>(null);
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();
  const addViewDropRef = useRef<HTMLDivElement>(null);
  const contextDropRef = useRef<HTMLDivElement>(null);
  const propsDropRef = useRef<HTMLDivElement>(null);
  const cardsDropRef = useRef<HTMLDivElement>(null);
  const groupDropRef = useRef<HTMLDivElement>(null);
  const dateDropRef = useRef<HTMLDivElement>(null);
  const ganttPropDropRef = useRef<HTMLDivElement>(null);
  const layoutDropRef = useRef<HTMLDivElement>(null);

  const filterCount = ((activeView?.filters as FilterRule[] | undefined) ?? [])
    .length;
  const sortCount = ((activeView?.sorts as SortRule[] | undefined) ?? [])
    .length;

  // Each of these dropdowns is positioned once from a captured DOMRect — lock
  // scroll while any is open instead of repositioning, so none can drift from
  // its trigger button.
  useScrollLockWhileOpen(
    !!addViewRect ||
      !!contextRect ||
      !!propsRect ||
      !!cardsRect ||
      !!groupRect ||
      !!dateRect ||
      !!ganttPropRect ||
      !!layoutRect,
    (target) =>
      !!addViewDropRef.current?.contains(target) ||
      !!contextDropRef.current?.contains(target) ||
      !!propsDropRef.current?.contains(target) ||
      !!cardsDropRef.current?.contains(target) ||
      !!groupDropRef.current?.contains(target) ||
      !!dateDropRef.current?.contains(target) ||
      !!ganttPropDropRef.current?.contains(target) ||
      !!layoutDropRef.current?.contains(target) ||
      !!target.closest?.('[role="alertdialog"], [data-edit-property-exempt]')
  );

  function closeAllLocalDropdowns() {
    setAddViewRect(null);
    setContextView(null);
    setContextRect(null);
    setPropsRect(null);
    setCardsRect(null);
    setGroupRect(null);
    setDateRect(null);
    setGanttPropRect(null);
    setLayoutView(null);
    setLayoutRect(null);
  }

  // Close portals on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      const t = e.target as Node;
      if (addViewDropRef.current && !addViewDropRef.current.contains(t)) {
        setAddViewRect(null);
      }
      // Exclude the trigger button itself — it already toggles open/closed in
      // its own onClick. Next.js hydrates the whole document, so React's
      // stopPropagation on the button can't stop this sibling document-level
      // listener from also seeing the same mousedown; without this exclusion,
      // clicking the button while its menu is open would close it here first,
      // then the button's onClick would immediately reopen it (reading the
      // just-cleared state) — the menu would blink instead of closing.
      if (
        contextDropRef.current &&
        !contextDropRef.current.contains(t) &&
        !(t as HTMLElement).closest?.("[data-view-context-trigger]")
      ) {
        setContextView(null);
        setContextRect(null);
      }
      if (propsDropRef.current && !propsDropRef.current.contains(t)) {
        setPropsRect(null);
      }
      if (cardsDropRef.current && !cardsDropRef.current.contains(t)) {
        setCardsRect(null);
      }
      if (groupDropRef.current && !groupDropRef.current.contains(t)) {
        setGroupRect(null);
      }
      if (dateDropRef.current && !dateDropRef.current.contains(t)) {
        setDateRect(null);
      }
      if (ganttPropDropRef.current && !ganttPropDropRef.current.contains(t)) {
        setGanttPropRect(null);
      }
      if (layoutDropRef.current && !layoutDropRef.current.contains(t)) {
        setLayoutView(null);
        setLayoutRect(null);
      }
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
    if (name !== view.name) {
      onUpdateView(view.id, { name });
    }
    setEditingId(null);
  }

  async function handleBulkDelete() {
    setDeletingBulk(true);
    await onBulkDelete();
    setDeletingBulk(false);
    setShowBulkConfirm(false);
  }

  const groupableProps = properties.filter(
    (p) => isGroupableType(p.type) && !p.isSystem
  );
  const dateProps = properties.filter((p) => p.type === "date" && !p.isSystem);

  // ── Bulk actions bar ──────────────────────────────────────────────────────

  if (selectedCount > 0) {
    return (
      <>
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-primary/5 px-4">
          <button
            className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onClearSelection}
          >
            <X size={14} />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {selectedCount} {selectedCount === 1 ? "row" : "rows"} selected
          </span>
          <div className="h-4 w-px bg-border/60" />
          <span className="text-xs text-muted-foreground">
            {totalEntries} total
          </span>
          <div className="flex-1" />
          <button
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors duration-150 hover:bg-destructive/10 disabled:opacity-50"
            disabled={deletingBulk}
            onClick={() => setShowBulkConfirm(true)}
          >
            <Trash size={13} />
            {deletingBulk ? "Deleting…" : `Delete ${selectedCount}`}
          </button>
        </div>

        <ConfirmDialog
          confirmLabel={`Delete ${selectedCount}`}
          confirmLoadingLabel="Deleting…"
          description={`${selectedCount === 1 ? "This entry and all its content" : `These ${selectedCount} entries and all their content`} will be permanently deleted. This action cannot be undone.`}
          loading={deletingBulk}
          onConfirm={handleBulkDelete}
          onOpenChange={setShowBulkConfirm}
          open={showBulkConfirm}
          title={`Delete ${selectedCount} ${selectedCount === 1 ? "entry" : "entries"}?`}
        />
      </>
    );
  }

  // ── Normal toolbar ────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex h-[46px] shrink-0 items-center overflow-x-auto border-b border-border bg-background pr-4 sm:pr-8 lg:pr-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* ── View tabs ── */}
        <div className="flex shrink-0 self-stretch items-stretch pl-4 sm:pl-8 lg:pl-16">
          {views.map((view) => {
            const ViewIcon = VIEW_ICONS[view.type] ?? Table;
            const isActive = view.id === activeViewId;
            return (
              <div className="group flex items-stretch" key={view.id}>
                {editingId === view.id ? (
                  <div className="flex items-center px-1">
                    <input
                      autoFocus
                      className="h-7 rounded-[var(--radius-sm)] border border-primary/40 bg-background px-2 text-sm focus:outline-none"
                      onBlur={() => commitRename(view)}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          commitRename(view);
                        }
                        if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      style={{ width: Math.max(80, editingName.length * 8) }}
                      value={editingName}
                    />
                  </div>
                ) : (
                  <button
                    className={[
                      "relative flex h-full shrink-0 items-center gap-1.5 px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
                      isActive
                        ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
                        : "text-muted-foreground/70 hover:bg-accent hover:text-foreground",
                    ].join(" ")}
                    onClick={() => onSwitchView(view.id)}
                    onDoubleClick={() =>
                      isEditor &&
                      (setEditingId(view.id), setEditingName(view.name))
                    }
                  >
                    <ViewIcon size={13} />
                    {view.name}
                  </button>
                )}

                {isEditor && !editingId && (
                  <button
                    data-view-context-trigger
                    className={[
                      "flex h-full w-6 items-center justify-center rounded-[var(--radius-xs)] transition-colors duration-150",
                      contextView?.id === view.id
                        ? "bg-accent text-foreground"
                        : "text-transparent hover:bg-accent hover:text-foreground group-hover:text-muted-foreground/60",
                    ].join(" ")}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (contextView?.id === view.id) {
                        setContextView(null);
                        setContextRect(null);
                      } else {
                        const rect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();
                        closeAllLocalDropdowns();
                        if (showFilterBar) {
                          onToggleFilterBar();
                        }
                        if (showSortBar) {
                          onToggleSortBar();
                        }
                        setContextView(view);
                        setContextRect(rect);
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => showTooltip("View options", e)}
                    onMouseLeave={hideTooltip}
                  >
                    <MoreVertical className="shrink-0" size={13} />
                  </button>
                )}
              </div>
            );
          })}

          {/* ── Add view button ── */}
          {isEditor && (
            <div className="flex items-center pl-2 pr-1">
              <button
                className={[
                  "flex h-[26px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed px-2.5 text-xs font-medium transition-colors duration-150",
                  addViewRect
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                ].join(" ")}
                onClick={(e) => {
                  if (addViewRect) {
                    setAddViewRect(null);
                    return;
                  }
                  closeAllLocalDropdowns();
                  if (showFilterBar) {
                    onToggleFilterBar();
                  }
                  if (showSortBar) {
                    onToggleSortBar();
                  }
                  setAddViewRect(
                    (e.currentTarget as HTMLElement).getBoundingClientRect()
                  );
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Plus className="text-primary/60" size={11} />
                Add a view
              </button>
            </div>
          )}
        </div>

        <div className="mx-2 h-4 w-px shrink-0 bg-border/60" />

        {/* ── Group by (board / table / gallery) ── */}
        {(activeView?.type === "board" ||
          activeView?.type === "table" ||
          activeView?.type === "gallery") &&
          groupableProps.length > 0 && (
            <div className="flex shrink-0 items-center gap-1.5">
              {!inline && (
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/60">
                  Group
                </span>
              )}
              <button
                className={[
                  "flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
                  groupRect || activeView.groupByPropertyId
                    ? "border-primary/30 bg-primary/8 text-primary"
                    : "border-border bg-background text-foreground/70 hover:border-border hover:bg-accent",
                ].join(" ")}
                onClick={(e) => {
                  if (groupRect) {
                    setGroupRect(null);
                    return;
                  }
                  closeAllLocalDropdowns();
                  if (showFilterBar) {
                    onToggleFilterBar();
                  }
                  if (showSortBar) {
                    onToggleSortBar();
                  }
                  setGroupRect(
                    (e.currentTarget as HTMLElement).getBoundingClientRect()
                  );
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {activeView.groupByPropertyId ? (
                  (groupableProps.find(
                    (p) => p.id === activeView.groupByPropertyId
                  )?.name ?? "Group")
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
                <ChevronDown
                  className="shrink-0 text-muted-foreground"
                  size={10}
                />
              </button>
            </div>
          )}

        {/* ── Calendar date property ── */}
        {activeView?.type === "calendar" && dateProps.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5">
            {!inline && (
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/60">
                Date
              </span>
            )}
            <button
              className={[
                "flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
                dateRect || activeView.calendarPropertyId
                  ? "border-primary/30 bg-primary/8 text-primary"
                  : "border-border bg-background text-foreground/70 hover:border-border hover:bg-accent",
              ].join(" ")}
              onClick={(e) => {
                if (dateRect) {
                  setDateRect(null);
                  return;
                }
                closeAllLocalDropdowns();
                if (showFilterBar) {
                  onToggleFilterBar();
                }
                if (showSortBar) {
                  onToggleSortBar();
                }
                setDateRect(
                  (e.currentTarget as HTMLElement).getBoundingClientRect()
                );
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {activeView.calendarPropertyId ? (
                (dateProps.find((p) => p.id === activeView.calendarPropertyId)
                  ?.name ?? "Date")
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
              <ChevronDown
                className="shrink-0 text-muted-foreground"
                size={10}
              />
            </button>
          </div>
        )}

        {/* ── Gantt start/end date properties ── */}
        {activeView?.type === "gantt" && dateProps.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5">
            {(["start", "end"] as const).map((field) => {
              const propId = field === "start" ? activeView.ganttStartPropertyId : activeView.ganttEndPropertyId;
              return (
                <div key={field} className="flex shrink-0 items-center gap-1.5">
                  {!inline && (
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/60 capitalize">
                      {field}
                    </span>
                  )}
                  <button
                    className={[
                      "flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
                      (ganttPropRect?.field === field) || propId
                        ? "border-primary/30 bg-primary/8 text-primary"
                        : "border-border bg-background text-foreground/70 hover:border-border hover:bg-accent",
                    ].join(" ")}
                    onClick={(e) => {
                      if (ganttPropRect?.field === field) {
                        setGanttPropRect(null);
                        return;
                      }
                      closeAllLocalDropdowns();
                      if (showFilterBar) onToggleFilterBar();
                      if (showSortBar) onToggleSortBar();
                      setGanttPropRect({ field, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {propId ? (dateProps.find((p) => p.id === propId)?.name ?? field) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                    <ChevronDown className="shrink-0 text-muted-foreground" size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Gallery card size ── */}
        {activeView?.type === "gallery" && (
          <div className="flex shrink-0 items-center gap-1">
            {!inline && (
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground/60">
                Size
              </span>
            )}
            {(["small", "medium", "large"] as const).map((size) => {
              const isActive =
                (activeView.galleryCardSize ?? "medium") === size;
              return (
                <button
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold tracking-wide transition-colors duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                  key={size}
                  onClick={() =>
                    onUpdateView(activeView.id, { galleryCardSize: size })
                  }
                  onMouseEnter={(e) =>
                    showTooltip(
                      `${size.charAt(0).toUpperCase() + size.slice(1)} cards`,
                      e
                    )
                  }
                  onMouseLeave={hideTooltip}
                >
                  {size[0].toUpperCase()}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Search ── */}
        <div
          className={`relative flex shrink-0 items-center transition-[width] duration-200 ${showSearch ? "w-48" : "w-7"}`}
        >
          {showSearch ? (
            <>
              <MagnifyingGlass
                className="absolute left-2.5 shrink-0 text-muted-foreground"
                size={13}
              />
              <input
                autoFocus
                className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-muted/30 pl-7 pr-7 text-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:bg-background focus:outline-none"
                onBlur={() => {
                  if (!searchQuery) {
                    setShowSearch(false);
                  }
                }}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    onSearchChange("");
                    setShowSearch(false);
                  }
                }}
                placeholder="Search…"
                ref={searchInputRef}
                type="text"
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 text-muted-foreground/70 hover:text-muted-foreground"
                  onClick={() => {
                    onSearchChange("");
                    searchInputRef.current?.focus();
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </>
          ) : (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground"
              onClick={() => setShowSearch(true)}
              onMouseEnter={(e) => showTooltip("Search (⌘K)", e)}
              onMouseLeave={hideTooltip}
            >
              <MagnifyingGlass size={13} />
            </button>
          )}
        </div>

        {/* ── Filter / Sort / Properties ── */}
        <button
          className={[
            "flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
            showFilterBar || filterCount > 0
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
          ].join(" ")}
          onClick={() => {
            closeAllLocalDropdowns();
            onToggleFilterBar();
          }}
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
          className={[
            "flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
            showSortBar || sortCount > 0
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
          ].join(" ")}
          onClick={() => {
            closeAllLocalDropdowns();
            onToggleSortBar();
          }}
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
          const hiddenCount = (
            (activeView?.hiddenPropertyIds ?? []) as string[]
          ).length;
          return (
            <button
              className={[
                "flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
                propsRect || hiddenCount > 0
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
              ].join(" ")}
              onClick={(e) => {
                if (propsRect) {
                  setPropsRect(null);
                  return;
                }
                closeAllLocalDropdowns();
                if (showFilterBar) {
                  onToggleFilterBar();
                }
                if (showSortBar) {
                  onToggleSortBar();
                }
                setPropsRect(
                  (e.currentTarget as HTMLElement).getBoundingClientRect()
                );
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={(e) => showTooltip("Manage properties", e)}
              onMouseLeave={hideTooltip}
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

        {/* ── Entry open mode segmented control ── */}
        {activeView && (
          <div className="flex shrink-0 items-center rounded-[var(--radius-sm)] border border-border/60 bg-muted/30 p-0.5">
            <button
              className={[
                "flex h-[26px] items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-medium transition-colors duration-150",
                (activeView.entryOpenMode ?? "side_panel") === "side_panel"
                  ? "bg-background text-primary"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              onClick={() =>
                onUpdateView(activeView.id, { entryOpenMode: "side_panel" })
              }
              onMouseEnter={(e) => showTooltip("Open entries in side panel", e)}
              onMouseLeave={hideTooltip}
            >
              <SidebarSimple size={12} />
              {!inline && <span className="hidden xl:inline">Panel</span>}
            </button>
            <button
              className={[
                "flex h-[26px] items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-medium transition-colors duration-150",
                activeView.entryOpenMode === "full_page"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              onClick={() =>
                onUpdateView(activeView.id, { entryOpenMode: "full_page" })
              }
              onMouseEnter={(e) => showTooltip("Open entries as full page", e)}
              onMouseLeave={hideTooltip}
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
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-semibold whitespace-nowrap text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
            data-new-entry-button
            onClick={onCreateEntry}
          >
            <Plus size={14} />
            {!inline && "New"}
          </button>
        )}
      </div>

      {/* ── Portal: Add view dropdown (Notion-style grid) ── */}
      {addViewRect &&
        createPortal(
          <div
            className="w-[calc(100vw-24px)] max-w-[320px] overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card"
            onClick={(e) => e.stopPropagation()}
            ref={addViewDropRef}
            style={{
              position: "fixed",
              top: getClampedTop(addViewRect, 200),
              left: getClampedLeft(addViewRect, 320, { align: "start" }),
              zIndex: 300,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <Plus className="text-primary" size={13} />
              <p className="text-sm font-semibold text-foreground">
                Add a new view
              </p>
            </div>

            {/* View type grid — 4 per row */}
            <div className="grid grid-cols-4 gap-1.5 p-3">
              {VIEW_TYPES.map((type) => {
                const VIcon = VIEW_ICONS[type];
                return (
                  <button
                    className="group flex flex-col items-center gap-2 rounded-[var(--radius-md)] px-2 py-3 text-center transition-colors duration-150 hover:bg-accent"
                    key={type}
                    onClick={() => {
                      onAddView(VIEW_LABELS[type], type);
                      setAddViewRect(null);
                    }}
                  >
                    <div className="flex size-12 items-center justify-center rounded-[var(--radius-md)] border border-border/70 bg-muted/50 transition-colors duration-150 group-hover:border-primary/40 group-hover:bg-primary/10">
                      <VIcon
                        className="text-foreground/70 transition-colors duration-150 group-hover:text-primary"
                        size={24}
                      />
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
              <p className="text-xs text-muted-foreground">
                Click a view type to create it
              </p>
            </div>
          </div>,
          document.body
        )}

      {/* ── Portal: View context menu ── */}
      {contextView &&
        contextRect &&
        createPortal(
          <div
            className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover p-1"
            ref={contextDropRef}
            style={{
              position: "fixed",
              top: getClampedTop(contextRect, 140),
              left: getClampedLeft(contextRect, 192, { align: "start" }),
              zIndex: 500,
            }}
          >
            <button
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors duration-100 hover:bg-accent"
              onClick={() => {
                setEditingId(contextView.id);
                setEditingName(contextView.name);
                setContextView(null);
                setContextRect(null);
              }}
            >
              <Pencil className="shrink-0 text-muted-foreground" size={13} />{" "}
              Rename
            </button>
            <button
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors duration-100 hover:bg-accent"
              onClick={() => {
                setLayoutView(contextView);
                setLayoutRect(contextRect);
                setContextView(null);
                setContextRect(null);
              }}
            >
              <Kanban className="shrink-0 text-muted-foreground" size={13} />{" "}
              Layout
            </button>
            <button
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors duration-100 hover:bg-accent"
              onClick={() => {
                onDuplicateView(contextView.id);
                setContextView(null);
                setContextRect(null);
              }}
            >
              <Copy className="shrink-0 text-muted-foreground" size={13} />{" "}
              Duplicate view
            </button>
            {views.length > 1 && (
              <>
                <div className="my-1 h-px bg-border/60" />
                <button
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-destructive transition-colors duration-100 hover:bg-destructive/10"
                  onClick={() => {
                    setDeleteViewTarget(contextView);
                    setContextView(null);
                    setContextRect(null);
                  }}
                >
                  <Trash className="shrink-0" size={13} /> Delete view
                </button>
              </>
            )}
          </div>,
          document.body
        )}

      {/* ── Portal: Change view layout (type) ── */}
      {layoutView &&
        layoutRect &&
        createPortal(
          <div
            ref={layoutDropRef}
            className="w-[calc(100vw-24px)] max-w-[320px] overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: getClampedTop(layoutRect, 220),
              left: getClampedLeft(layoutRect, 320, { align: "start" }),
              zIndex: 500,
            }}
          >
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <Kanban className="text-primary" size={13} />
              <p className="truncate text-sm font-semibold text-foreground">
                Layout — {layoutView.name}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-3">
              {VIEW_TYPES.map((type) => {
                const VIcon = VIEW_ICONS[type];
                const isActive = layoutView.type === type;
                return (
                  <button
                    className="group flex flex-col items-center gap-2 rounded-[var(--radius-md)] px-2 py-3 text-center transition-colors duration-150 hover:bg-accent"
                    key={type}
                    onClick={() => {
                      if (type !== layoutView.type) {
                        onUpdateView(layoutView.id, { type });
                      }
                      setLayoutView(null);
                      setLayoutRect(null);
                    }}
                  >
                    <div
                      className={[
                        "flex size-12 items-center justify-center rounded-[var(--radius-md)] border transition-colors duration-150",
                        isActive
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/70 bg-muted/50 group-hover:border-primary/40 group-hover:bg-primary/10",
                      ].join(" ")}
                    >
                      <VIcon
                        className={
                          isActive
                            ? "text-primary"
                            : "text-foreground/70 transition-colors duration-150 group-hover:text-primary"
                        }
                        size={24}
                      />
                    </div>
                    <span
                      className={[
                        "flex items-center gap-1 text-xs font-medium leading-tight transition-colors duration-150",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                      ].join(" ")}
                    >
                      {isActive && <Check size={10} />}
                      {VIEW_LABELS[type]}
                    </span>
                  </button>
                );
              })}
            </div>

            {layoutView.type === "board" && !layoutView.groupByPropertyId && (
              <div className="border-t border-border/40 px-4 py-2.5">
                <p className="text-xs text-muted-foreground">
                  Next, use the <strong>Group by</strong> button in the toolbar to pick a Select, Status, Checkbox, or Person property to organize cards into columns.
                </p>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* ── Portal: Properties panel ── */}
      {propsRect &&
        createPortal(
          <PropertiesPanel
            hiddenPropertyIds={
              (activeView?.hiddenPropertyIds ?? []) as string[]
            }
            workspaceId={workspaceId}
            databaseId={databaseId}
            onAddProperty={isEditor ? onAddProperty : undefined}
            onClose={() => setPropsRect(null)}
            onToggle={(propId, hidden) => {
              if (!activeView) {
                return;
              }
              const current = (activeView.hiddenPropertyIds ?? []) as string[];
              const next = hidden
                ? [...current, propId]
                : current.filter((id) => id !== propId);
              onUpdateView(activeView.id, { hiddenPropertyIds: next });
            }}
            onUpdateHidden={(ids) => {
              if (!activeView) {
                return;
              }
              onUpdateView(activeView.id, { hiddenPropertyIds: ids });
            }}
            properties={properties.filter((p) => !p.isSystem)}
            rect={propsRect}
            ref={propsDropRef}
          />,
          document.body
        )}

      {/* ── Portal: Group by dropdown ── */}
      {groupRect &&
        activeView &&
        createPortal(
          <div
            className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
            ref={groupDropRef}
            style={{
              position: "fixed",
              top: getClampedTop(
                groupRect,
                Math.min(400, 46 + (groupableProps.length + 1) * 36)
              ),
              left: getClampedLeft(groupRect, 192, { align: "start" }),
              zIndex: 300,
            }}
          >
            <p className="px-3 pb-1 pt-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
              Group by
            </p>
            <div className="p-1.5 pt-0.5">
              <button
                className={[
                  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
                  activeView.groupByPropertyId
                    ? "text-muted-foreground"
                    : "font-semibold text-primary",
                ].join(" ")}
                onClick={() => {
                  onUpdateView(activeView.id, { groupByPropertyId: null });
                  setGroupRect(null);
                }}
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60 text-xs text-muted-foreground">
                  —
                </span>
                None
              </button>
              {groupableProps.map((p) => {
                const isActive = activeView.groupByPropertyId === p.id;
                const TypeIcon = PROPERTY_TYPE_ICON[p.type as keyof typeof PROPERTY_TYPE_ICON] ?? CircleDashed;
                const propConfig = (p.config ?? {}) as { icon?: string };
                return (
                  <button
                    className={[
                      "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
                      isActive
                        ? "font-semibold text-primary"
                        : "text-foreground",
                    ].join(" ")}
                    key={p.id}
                    onClick={() => {
                      onUpdateView(activeView.id, { groupByPropertyId: p.id });
                      setGroupRect(null);
                    }}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60">
                      {propConfig.icon ? (
                        <PageIcon icon={propConfig.icon} size={11} />
                      ) : (
                        <TypeIcon
                          className="text-muted-foreground/60"
                          size={11}
                        />
                      )}
                    </span>
                    <span className="flex-1 truncate text-left">{p.name}</span>
                    {isActive && (
                      <Check className="shrink-0 text-primary" size={12} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {/* ── Delete view confirmation ── */}
      <ConfirmDialog
        confirmLabel="Delete view"
        confirmLoadingLabel="Deleting…"
        description="This view and its configuration (filters, sorts, hidden fields) will be permanently deleted. Entries in your database will not be affected."
        loading={deletingView}
        onConfirm={async () => {
          if (!deleteViewTarget) {
            return;
          }
          setDeletingView(true);
          await onDeleteView(deleteViewTarget.id);
          setDeletingView(false);
          setDeleteViewTarget(null);
        }}
        onOpenChange={(o) => !o && setDeleteViewTarget(null)}
        open={!!deleteViewTarget}
        title={`Delete "${deleteViewTarget?.name}"?`}
      />

      {/* ── Portal: Calendar date property dropdown ── */}
      {dateRect &&
        activeView?.type === "calendar" &&
        createPortal(
          <div
            className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
            ref={dateDropRef}
            style={{
              position: "fixed",
              top: getClampedTop(
                dateRect,
                Math.min(400, 46 + (dateProps.length + 1) * 36)
              ),
              left: getClampedLeft(dateRect, 192, { align: "start" }),
              zIndex: 300,
            }}
          >
            <p className="px-3 pb-1 pt-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
              Date property
            </p>
            <div className="p-1.5 pt-0.5">
              <button
                className={[
                  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
                  activeView.calendarPropertyId
                    ? "text-muted-foreground"
                    : "font-semibold text-primary",
                ].join(" ")}
                onClick={() => {
                  onUpdateView(activeView.id, { calendarPropertyId: null });
                  setDateRect(null);
                }}
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60 text-xs text-muted-foreground">
                  —
                </span>
                None
              </button>
              {dateProps.map((p) => {
                const isActive = activeView.calendarPropertyId === p.id;
                return (
                  <button
                    className={[
                      "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
                      isActive
                        ? "font-semibold text-primary"
                        : "text-foreground",
                    ].join(" ")}
                    key={p.id}
                    onClick={() => {
                      onUpdateView(activeView.id, { calendarPropertyId: p.id });
                      setDateRect(null);
                    }}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60">
                      <CalendarBlank
                        className="text-muted-foreground/60"
                        size={11}
                      />
                    </span>
                    <span className="flex-1 truncate text-left">{p.name}</span>
                    {isActive && (
                      <Check className="shrink-0 text-primary" size={12} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {/* ── Portal: Gantt start/end property dropdown ── */}
      {ganttPropRect &&
        activeView?.type === "gantt" &&
        createPortal(
          <div
            className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
            ref={ganttPropDropRef}
            style={{
              position: "fixed",
              top: getClampedTop(
                ganttPropRect.rect,
                Math.min(400, 46 + (dateProps.length + 1) * 36)
              ),
              left: getClampedLeft(ganttPropRect.rect, 192, { align: "start" }),
              zIndex: 300,
            }}
          >
            <p className="px-3 pb-1 pt-2.5 text-xs font-semibold capitalize tracking-wide text-muted-foreground">
              {ganttPropRect.field} date property
            </p>
            <div className="p-1.5 pt-0.5">
              <button
                className={[
                  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
                  (ganttPropRect.field === "start" ? activeView.ganttStartPropertyId : activeView.ganttEndPropertyId)
                    ? "text-muted-foreground"
                    : "font-semibold text-primary",
                ].join(" ")}
                onClick={() => {
                  const patch = ganttPropRect.field === "start" ? { ganttStartPropertyId: null } : { ganttEndPropertyId: null };
                  onUpdateView(activeView.id, patch);
                  setGanttPropRect(null);
                }}
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60 text-xs text-muted-foreground">
                  —
                </span>
                None
              </button>
              {dateProps.map((p) => {
                const isActive = (ganttPropRect.field === "start" ? activeView.ganttStartPropertyId : activeView.ganttEndPropertyId) === p.id;
                return (
                  <button
                    className={[
                      "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors hover:bg-accent",
                      isActive
                        ? "font-semibold text-primary"
                        : "text-foreground",
                    ].join(" ")}
                    key={p.id}
                    onClick={() => {
                      const patch = ganttPropRect.field === "start" ? { ganttStartPropertyId: p.id } : { ganttEndPropertyId: p.id };
                      onUpdateView(activeView.id, patch);
                      setGanttPropRect(null);
                    }}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60">
                      <CalendarBlank
                        className="text-muted-foreground/60"
                        size={11}
                      />
                    </span>
                    <span className="flex-1 truncate text-left">{p.name}</span>
                    {isActive && (
                      <Check className="shrink-0 text-primary" size={12} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {tooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
          document.body
        )}
    </>
  );
}

// ── CardDisplayPanel ──────────────────────────────────────────────────────────

import { forwardRef } from "react";

interface CardDisplayPanelProps {
  cardDisplayProps: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
  properties: import("./types").DbProperty[];
  rect: DOMRect;
}

const CardDisplayPanel = forwardRef<HTMLDivElement, CardDisplayPanelProps>(
  function CardDisplayPanel(
    { rect, properties, cardDisplayProps, onChange },
    ref
  ) {
    const selected = new Set(cardDisplayProps);
    const panelW = 240;
    const left = getClampedLeft(rect, panelW, { align: "end" });
    const top = getClampedTop(rect, 296);

    function toggle(propId: string) {
      if (selected.has(propId)) {
        onChange(cardDisplayProps.filter((id) => id !== propId));
      } else {
        onChange([...cardDisplayProps, propId]);
      }
    }

    return (
      <div
        className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
        ref={ref}
        style={{ position: "fixed", top, left, zIndex: 300, width: panelW }}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground/80">
            Card properties
          </p>
          {properties.length > 0 && (
            <button
              className="text-xs font-medium text-primary/70 hover:text-primary"
              onClick={() =>
                onChange(
                  selected.size === properties.length
                    ? []
                    : properties.map((p) => p.id)
                )
              }
            >
              {selected.size === properties.length ? "Clear all" : "Select all"}
            </button>
          )}
        </div>
        <div className="max-h-56 overflow-y-auto p-1.5">
          {properties.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No properties
            </p>
          )}
          {properties.map((prop) => {
            const Icon =
              PROPERTY_TYPE_ICON[
                prop.type as keyof typeof PROPERTY_TYPE_ICON
              ] ?? TextT;
            const propConfig = (prop.config ?? {}) as { icon?: string };
            const on = selected.has(prop.id);
            return (
              <button
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-accent"
                key={prop.id}
                onClick={() => toggle(prop.id)}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border transition-colors ${
                    on
                      ? "border-border/50 bg-muted/30 text-muted-foreground"
                      : "border-border/30 bg-muted/10 text-muted-foreground/60"
                  }`}
                >
                  {on ? <Eye size={12} /> : <EyeSlash size={12} />}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {propConfig.icon ? <PageIcon icon={propConfig.icon} size={12} /> : <Icon size={12} />}
                  <span
                    className={`truncate text-sm font-medium ${on ? "text-foreground" : "text-muted-foreground/70"}`}
                  >
                    {prop.name}
                  </span>
                </span>
                <span
                  className={`size-1.5 shrink-0 rounded-full transition-colors ${on ? "bg-success" : "bg-border/40"}`}
                />
              </button>
            );
          })}
        </div>
        <div className="border-t border-border/60 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {selected.size === 0
              ? "Showing all properties"
              : `${selected.size} propert${selected.size === 1 ? "y" : "ies"} selected`}
          </p>
        </div>
      </div>
    );
  }
);

// ── PropertiesPanel ───────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  hiddenPropertyIds: string[];
  workspaceId: string;
  databaseId: string;
  onAddProperty?: (name: string, type: string, config?: Record<string, unknown>, twoWay?: boolean) => Promise<unknown>;
  onClose: () => void;
  onToggle: (propId: string, hide: boolean) => void;
  onUpdateHidden: (ids: string[]) => void;
  properties: import("./types").DbProperty[];
  rect: DOMRect;
}

const PROP_TYPES_LIST = Object.values(PROPERTY_REGISTRY);

const PropertiesPanel = forwardRef<HTMLDivElement, PropertiesPanelProps>(
  function PropertiesPanel(
    {
      rect,
      properties,
      hiddenPropertyIds,
      workspaceId,
      databaseId,
      onToggle,
      onUpdateHidden,
      onAddProperty,
    },
    ref
  ) {
    const hiddenSet = new Set(hiddenPropertyIds);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [saving, setSaving] = useState(false);
    const [pickingRelation, setPickingRelation] = useState(false);
    const [pickingRollup, setPickingRollup] = useState(false);
    const [pickingFormula, setPickingFormula] = useState(false);

    // Position: align right edge of panel to button right edge, open below
    const panelW = 260;
    const left = getClampedLeft(rect, panelW, { align: "end" });
    const top = getClampedTop(rect, 320);

    const allVisible = hiddenPropertyIds.length === 0;

    async function handleAdd(type: string, config?: Record<string, unknown>, twoWay?: boolean) {
      if (!onAddProperty || saving) {
        return;
      }
      setSaving(true);
      await onAddProperty(
        newName.trim() ||
          (PROPERTY_REGISTRY[type as keyof typeof PROPERTY_REGISTRY]?.label ??
            type),
        type,
        config,
        twoWay
      );
      setNewName("");
      setAdding(false);
      setSaving(false);
      setPickingRelation(false);
      setPickingRollup(false);
      setPickingFormula(false);
    }

    if (pickingRelation) {
      return (
        <RelationDatabasePicker
          rect={rect}
          workspaceId={workspaceId}
          onBack={() => setPickingRelation(false)}
          onClose={() => setPickingRelation(false)}
          onPick={(relatedDatabaseId, twoWay) => handleAdd("relation", { relatedDatabaseId }, twoWay)}
        />
      );
    }

    if (pickingRollup) {
      return (
        <RollupConfigPicker
          rect={rect}
          properties={properties}
          onBack={() => setPickingRollup(false)}
          onClose={() => setPickingRollup(false)}
          onPick={(config) => handleAdd("rollup", config)}
        />
      );
    }

    if (pickingFormula) {
      return (
        <FormulaConfigPicker
          rect={rect}
          databaseId={databaseId}
          properties={properties}
          onBack={() => setPickingFormula(false)}
          onClose={() => setPickingFormula(false)}
          onPick={(expression) => handleAdd("formula", { expression })}
        />
      );
    }

    return (
      <div
        className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
        ref={ref}
        style={{ position: "fixed", top, left, zIndex: 300, width: panelW }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground/80">Properties</p>
          {properties.length > 0 && (
            <button
              className="text-xs font-medium text-primary/70 hover:text-primary"
              onClick={() => {
                if (allVisible) {
                  onUpdateHidden(properties.map((p) => p.id));
                } else {
                  onUpdateHidden([]);
                }
              }}
            >
              {allVisible ? "Hide all" : "Show all"}
            </button>
          )}
        </div>

        {/* Property list */}
        <div className="max-h-60 overflow-y-auto p-1.5">
          {properties.length === 0 && !adding && (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No properties yet
            </p>
          )}
          {properties.map((prop) => {
            const Icon =
              PROPERTY_TYPE_ICON[
                prop.type as keyof typeof PROPERTY_TYPE_ICON
              ] ?? TextT;
            const propConfig = (prop.config ?? {}) as { icon?: string };
            const visible = !hiddenSet.has(prop.id);
            return (
              <button
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-accent"
                key={prop.id}
                onClick={() => onToggle(prop.id, visible)}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border transition-colors ${
                    visible
                      ? "border-border/50 bg-muted/30 text-muted-foreground"
                      : "border-border/30 bg-muted/10 text-muted-foreground/60"
                  }`}
                >
                  {visible ? <Eye size={12} /> : <EyeSlash size={12} />}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {propConfig.icon ? <PageIcon icon={propConfig.icon} size={12} /> : <Icon size={12} />}
                  <span
                    className={`truncate text-sm font-medium ${visible ? "text-foreground" : "text-muted-foreground/70"}`}
                  >
                    {prop.name}
                  </span>
                </span>
                <span
                  className={`size-1.5 shrink-0 rounded-full transition-colors ${visible ? "bg-success" : "bg-border/40"}`}
                />
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
                  className="mb-2 w-full rounded-[var(--radius-sm)] border border-border bg-muted/30 px-2.5 py-1.5 text-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setAdding(false);
                      setNewName("");
                    }
                    e.stopPropagation();
                  }}
                  placeholder="Property name…"
                  value={newName}
                />
                <div className="grid grid-cols-2 gap-1">
                  {PROP_TYPES_LIST.map((def) => {
                    const Icon =
                      PROPERTY_TYPE_ICON[
                        def.type as keyof typeof PROPERTY_TYPE_ICON
                      ] ?? TextT;
                    return (
                      <button
                        className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                        disabled={saving}
                        key={def.type}
                        onClick={() => {
                          if (def.type === "relation") setPickingRelation(true);
                          else if (def.type === "rollup") setPickingRollup(true);
                          else if (def.type === "formula") setPickingFormula(true);
                          else handleAdd(def.type);
                        }}
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
                  className="mt-1.5 w-full rounded-[var(--radius-sm)] py-1.5 text-xs text-muted-foreground/60 hover:bg-accent hover:text-muted-foreground"
                  onClick={() => {
                    setAdding(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground/60 transition-colors hover:bg-accent/60 hover:text-foreground"
                onClick={() => setAdding(true)}
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
