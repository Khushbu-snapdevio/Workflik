"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { toast } from "sonner";
import {
 Plus, ExternalLink as ArrowSquareOut, Trash2 as Trash, EyeOff as EyeSlash, Type as TextT,
 ArrowUp as SortAscending, ArrowDown as SortDescending,
 Check, FileText, Table2, GripVertical, MessageSquare as MessageSquareIcon, Link2 as Link2Icon,
 Copy as CopyIcon, Settings2 as GearIcon, Pencil as PencilIcon,
} from "lucide-react";
import { CellCommentPopover } from "@/components/database/cell-comment-popover";
import { CellActionOverlay } from "@/components/database/cell-action-overlay";
import {
 DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
 type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
 SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PROPERTY_REGISTRY, PROPERTY_TYPE_ICON } from "@/components/database/property-registry";
import { getOptionColor, formatDateValue } from "@/components/database/property-registry";
import { PageIcon } from "@/components/pages/page-icon";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import { EditPropertySidePanel } from "@/components/database/edit-property-panel";
import { resolveDisplayAs, resolveWrapContent, resolvePropertyOrder } from "@/components/database/view-property-resolver";
import { isGroupableType, deriveGroups, getEntryGroupIds } from "@/components/database/grouping";
import { RelationDatabasePicker } from "@/components/database/relation-database-picker";
import { RollupConfigPicker } from "@/components/database/rollup-config-picker";
import { FormulaConfigPicker } from "@/components/database/formula-config-picker";
import type { SharedViewProps, DbProperty, DbEntry, SelectOption } from "@/components/database/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { getClampedTop, getClampedLeft } from "@/lib/ui/clamp-to-viewport";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";

// ── Constants ────────────────────────────────────────────────────────────────

const TEXT_TYPES = new Set(["text", "number", "url", "email", "phone"]);
const POPUP_TYPES = new Set(["select", "status", "multi_select", "date", "person", "relation", "files"]);
// Badge-style properties (colored pill values) intentionally get comment-only
// hover actions — no copy-to-clipboard, unlike plain-value properties.
const BADGE_TYPES = new Set(["select", "status", "multi_select"]);

// ── Property text helper (for clipboard copy) ────────────────────────────────
function getPropertyText(prop: DbProperty, rawVal: unknown): string {
 if (!rawVal) return "";
 const v = rawVal as Record<string, unknown>;
 switch (prop.type) {
  case "text":   return String(v.text ?? "");
  case "number": return v.number != null ? String(v.number) : "";
  case "url":    return String(v.url ?? "");
  case "email":  return String(v.email ?? "");
  case "phone":  return String(v.phone ?? "");
  case "checkbox": return (v as { checked?: boolean }).checked ? "Yes" : "No";
  case "date": return formatDateValue(v);
  case "select":
  case "status": {
   const optId = (v as { optionId?: string | null }).optionId;
   if (!optId) return "";
   const opts = (prop.config?.options ?? []) as SelectOption[];
   return opts.find((o) => o.id === optId)?.name ?? "";
  }
  case "multi_select": {
   const ids = (v as { optionIds?: string[] }).optionIds ?? [];
   const opts = (prop.config?.options ?? []) as SelectOption[];
   return ids.map((id) => opts.find((o) => o.id === id)?.name ?? "").filter(Boolean).join(", ");
  }
  default: return "";
 }
}

const DRAG_COL_W  = 44;
const IDX_COL_W   = 48;
const TITLE_COL_W  = 300;
const DEFAULT_COL_W = 180;
const MIN_COL_W   = 80;
const ROW_H     = 40;

// ── Types ────────────────────────────────────────────────────────────────────

interface ActiveCell  { entryId: string; propId: string }
interface EditPop    { entryId: string; propId: string; rect: DOMRect }
interface PropMenuState { propId: string; rect: DOMRect }
interface AddPropState { rect: DOMRect }
interface RowMenuState { entryId: string; shortId: string; rect: DOMRect }

// ── SortableTableRow ─────────────────────────────────────────────────────────

interface SortableTableRowProps {
 entry:       DbEntry;
 rowIdx:      number;
 visible:     DbProperty[];
 activeCell:    ActiveCell | null;
 editPop:     EditPop | null;
 editValue:    string;
 cellInputRef:   React.RefObject<HTMLInputElement | null>;
 selectedEntryIds: Set<string>;
 hoveredRowId:   string | null;
 deleteConfirm:  { entryId: string } | null;
 isEditor:     boolean;
 rowMenu:     RowMenuState | null;
 workspaceId:   string;
 workspaceSlug:  string;
 addBtnW:     number;
 activeView:    SharedViewProps["activeView"];
 colW:       (id: string) => number;
 onMouseEnter:   () => void;
 onMouseLeave:   () => void;
 onSelectEntry:  (id: string, selected: boolean) => void;
 onUpdateTitle:  (id: string, title: string) => void;
 onOpenEntry:   ((entry: DbEntry) => void) | undefined;
 setActiveCell:  (cell: ActiveCell | null) => void;
 setEditValue:   (val: string) => void;
 setRowMenu:    (menu: RowMenuState | null) => void;
 activateCell:   (entryId: string, propId: string, e: React.MouseEvent) => void;
 commitText:    (entryId: string, propId: string, val: string) => void;
 getRaw:      (entryId: string, propId: string) => unknown;
}

function SortableTableRow({
 entry, rowIdx, visible, activeCell, editPop, editValue, cellInputRef, selectedEntryIds,
 hoveredRowId, deleteConfirm, isEditor, rowMenu, workspaceId, workspaceSlug, addBtnW, activeView, colW,
 onMouseEnter, onMouseLeave, onSelectEntry, onUpdateTitle, onOpenEntry,
 setActiveCell, setEditValue, setRowMenu, activateCell, commitText, getRaw,
}: SortableTableRowProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
  useSortable({ id: entry.id });
 // Comment popover — tracks which cell (propId) it was opened from, plus a
 // frozen snapshot of that property's name/value for the quoted reference.
 const [commentPopover, setCommentPopover] = useState<{
  rect: DOMRect; propId: string | null; propName: string | null; valueLabel: string | null;
 } | null>(null);
 // Raw per-property comment list for this row, fetched once and used to derive
 // a per-cell comment badge count (comments are scoped to a property now).
 const [rowComments, setRowComments] = useState<Array<{ blockId: string | null; deletedAt: string | null; propertyId: string | null }> | null>(null);
 const commentsFetchedRef = useRef(false);
 const [copiedPropId, setCopiedPropId] = useState<string | null>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();
 // entry.commentCount is batch-computed server-side; shadowed in local state
 // so the row badge can bump instantly when a new page-level comment is
 // added via commentPopover below, instead of waiting on the next full fetch.
 const [rowCommentCount, setRowCommentCount] = useState(entry.commentCount ?? 0);
 useEffect(() => { setRowCommentCount(entry.commentCount ?? 0); }, [entry.commentCount]);

 // Portal-based hover overlay state
 const [hoveredCell, setHoveredCell] = useState<{
  propId: string;
  prop: DbProperty;
  rawVal: unknown;
  rect: DOMRect;
 } | null>(null);
 const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 function clearLeaveTimer() {
  if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
 }
 function scheduleLeave() {
  clearLeaveTimer();
  leaveTimerRef.current = setTimeout(() => setHoveredCell(null), 150);
 }

 // The overlay is a `position: fixed` portal anchored to a `rect` snapshotted
 // once on mouseenter. Unlike the click-opened menus below (which lock scroll
 // instead), this is a passive hover affordance, so scrolling should just
 // dismiss it rather than block the table — listen in the capture phase so a
 // scroll on the table's scroll container (an ancestor, not this row) is seen.
 useEffect(() => {
  if (!hoveredCell) return;
  function handleScroll() {
   clearLeaveTimer();
   setHoveredCell(null);
  }
  // Self-healing: `onMouseLeave` doesn't fire for every way the cursor can
  // stop being over this cell (e.g. it can be skipped when the pointer jumps
  // straight to a newly-mounted element, such as a popup, without crossing
  // the cell's boundary in between) — left unchecked, `hoveredCell` (and its
  // portal) gets stuck showing at its last position indefinitely. Validate
  // against the real cursor position on every move and self-clear if it's
  // drifted outside the snapshotted rect, instead of relying solely on the
  // leave event.
  const rect = hoveredCell.rect;
  function handleMove(e: MouseEvent) {
   const r = rect;
   if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
    clearLeaveTimer();
    setHoveredCell(null);
   }
  }
  document.addEventListener("scroll", handleScroll, true);
  document.addEventListener("mousemove", handleMove);
  return () => {
   document.removeEventListener("scroll", handleScroll, true);
   document.removeEventListener("mousemove", handleMove);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [hoveredCell]);

 // Belt-and-suspenders: the overlay is also blocked from being (re)shown for
 // the active cell in the mouseenter handler below, but if any cell in this
 // row becomes active through a path other than that exact click (e.g. a
 // future keyboard-nav entry point), make sure the hover overlay never stays
 // stuck showing over a cell the user is actively typing into — matching
 // Notion, where the comment/copy icons never appear while editing.
 useEffect(() => {
  if (activeCell?.entryId === entry.id) setHoveredCell(null);
 }, [activeCell, entry.id]);

 // Same belt-and-suspenders reasoning as above, for the popup-editor case —
 // an inline `onClick={() => { setHoveredCell(null); activateCell(...) }}`
 // handles the common path, but Chromium can re-dispatch a synthetic
 // mouseenter when the DOM under a stationary cursor changes shape after the
 // click (e.g. once the popup portal mounts), re-setting hoveredCell after
 // the inline clear already ran. A commit-phase effect clears it again on
 // every render where a popup is open for this row, closing that race.
 useEffect(() => {
  if (editPop?.entryId === entry.id) setHoveredCell(null);
 }, [editPop, entry.id]);

 function fetchRowComments() {
  if (commentsFetchedRef.current) return;
  commentsFetchedRef.current = true;
  fetch(`/api/pages/${entry.id}/comments`)
   .then((r) => (r.ok ? r.json() : null))
   .then((data) => {
    if (data) setRowComments(data.comments as Array<{ blockId: string | null; deletedAt: string | null; propertyId: string | null }>);
   })
   .catch(() => {});
 }

 function commentCountFor(propId: string | null): number | null {
  if (!rowComments) return null;
  return rowComments.filter((c) => !c.blockId && !c.deletedAt && c.propertyId === propId).length;
 }

 const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
 };

 const isSelected  = selectedEntryIds.has(entry.id);
 const isRowHovered = hoveredRowId === entry.id && !deleteConfirm;

 return (
  <>
  <div
   ref={setNodeRef}
   style={style}
   {...attributes}
   className={[
    "flex items-stretch db-border-b transition-colors duration-100",
    isSelected ? "bg-primary/5" : !deleteConfirm ? "hover:bg-muted/40" : "",
   ].join(" ")}
   onMouseEnter={onMouseEnter}
   onMouseLeave={onMouseLeave}
  >
   {/* Drag handle + context menu (left column, Notion style) */}
   <div
    className="flex shrink-0 items-center justify-center gap-0"
    style={{ width: DRAG_COL_W, minWidth: DRAG_COL_W, minHeight: ROW_H, touchAction: "none", userSelect: "none" }}
   >
    {isEditor && (
     <div
      {...listeners}
      onClick={(e) => {
       e.stopPropagation();
       const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
       setRowMenu(rowMenu?.entryId === entry.id ? null : { entryId: entry.id, shortId: entry.shortId, rect });
      }}
      className="flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground/30 hover:bg-accent hover:text-muted-foreground/60 transition-colors active:cursor-grabbing"
      style={{ opacity: isRowHovered ? 1 : 0, transition: "opacity 150ms" }}
      onMouseEnter={(e) => showTooltip("Drag · Click for actions", e)}
      onMouseLeave={hideTooltip}
     >
      <GripVertical size={13} />
     </div>
    )}
   </div>

   {/* Checkbox / index */}
   <div
    className="flex shrink-0 items-center justify-center"
    style={{ width: IDX_COL_W, minWidth: IDX_COL_W, minHeight: ROW_H }}
   >
    {isEditor ? (
     <label className="relative flex size-5 cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <input
       type="checkbox"
       checked={isSelected}
       onChange={(e) => onSelectEntry(entry.id, e.target.checked)}
       className="sr-only"
      />
      {/* Row number — fades out on hover/select */}
      <span className="absolute select-none text-xs tabular-nums text-muted-foreground/60 transition-opacity duration-150"
       style={{ opacity: isSelected || isRowHovered ? 0 : 1 }}>
       {rowIdx + 1}
      </span>
      {/* Checkbox — fades in on hover/select */}
      <span className={`flex size-[15px] shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
       isSelected ? "border-primary bg-primary" : "border-border/50 bg-background"
      }`} style={{ opacity: isSelected || isRowHovered ? 1 : 0 }}>
       {isSelected && (
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(0.6px, -0.2px)" }}>
         <polyline points="2 6 5 9 10 3"/>
        </svg>
       )}
      </span>
     </label>
    ) : (
     <span className="select-none text-xs tabular-nums text-muted-foreground/60">{rowIdx + 1}</span>
    )}
   </div>

   {/* Title cell */}
   <div
    className="flex shrink-0 items-center gap-2.5 px-3"
    style={{ width: TITLE_COL_W, minWidth: TITLE_COL_W, minHeight: ROW_H, borderRight: "1px solid var(--color-border)" }}
   >
    {entry.icon ? (
     <PageIcon icon={entry.icon} size={14} className="shrink-0" />
    ) : (
     <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-border/40 bg-muted/20">
      <FileText size={11} className="text-muted-foreground/60" />
     </span>
    )}

    {activeCell?.entryId === entry.id && activeCell.propId === "__title__" ? (
     <input
      ref={cellInputRef}
      value={editValue}
      onChange={(e) => {
       setEditValue(e.target.value);
       window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: entry.id, title: e.target.value } }));
      }}
      onBlur={() => { onUpdateTitle(entry.id, editValue); setActiveCell(null); }}
      onKeyDown={(e) => {
       if (e.key === "Enter" || e.key === "Tab") { onUpdateTitle(entry.id, editValue); setActiveCell(null); e.preventDefault(); }
       if (e.key === "Escape") setActiveCell(null);
      }}
      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none"
      placeholder="Untitled"
     />
    ) : (
     <span
      onClick={() => {
       const inPanelMode = (activeView?.entryOpenMode ?? "side_panel") === "side_panel";
       if (inPanelMode && onOpenEntry) {
        onOpenEntry(entry);
       } else if (isEditor) {
        setActiveCell({ entryId: entry.id, propId: "__title__" });
        setEditValue(entry.title ?? "");
       }
      }}
      className={`min-w-0 flex-1 truncate text-sm font-medium cursor-pointer ${
       entry.title ? "text-foreground" : "text-muted-foreground/60"
      }`}
     >
      {entry.title || "Untitled"}
     </span>
    )}

    {!!rowCommentCount && (
     <button
      type="button"
      onClick={(e) => {
       e.stopPropagation();
       setCommentPopover({ rect: (e.currentTarget as HTMLElement).getBoundingClientRect(), propId: null, propName: null, valueLabel: null });
      }}
      onMouseEnter={(e) => showTooltip("View comments", e)}
      onMouseLeave={hideTooltip}
      className="flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-1 text-[11px] text-muted-foreground/60 transition-opacity duration-150 hover:bg-accent hover:text-foreground"
      style={{ opacity: isRowHovered ? 1 : 0 }}
     >
      <MessageSquareIcon size={11} />
      {rowCommentCount}
     </button>
    )}

    {/* Row quick action: OPEN */}
    <div className="ml-auto flex shrink-0 items-center transition-opacity duration-150"
     style={{ opacity: isRowHovered ? 1 : 0 }}>
     <Link
      href={`/app/${workspaceSlug}/${entry.shortId}`}
      className="flex items-center gap-[3px] rounded-[var(--radius-sm)] border border-border/60 bg-background px-1.5 py-[3px] text-[10px] font-semibold tracking-wide text-muted-foreground/60 hover:border-primary/40 hover:bg-muted/60 hover:text-foreground transition-colors"
      onMouseEnter={(e) => showTooltip("Open full page", e)}
      onMouseLeave={hideTooltip}
      onClick={(e) => e.stopPropagation()}
     >
      <FileText size={9} />
      OPEN
     </Link>
    </div>
   </div>

   {/* Property cells */}
   {visible.map((prop) => {
    const rawVal  = getRaw(entry.id, prop.id);
    const isActive = activeCell?.entryId === entry.id && activeCell.propId === prop.id;
    return (
     <div
      key={prop.id}
      className={[
       // pr-8 (not px-3 on the right) reserves a gutter matching the hover
       // CellActionOverlay's comment/copy icon zone (cell-action-overlay.tsx)
       // — without it, wide badge/text content truncates flush to the cell's
       // true edge and the icons render directly on top of it on hover.
       "relative flex min-w-0 shrink-0 cursor-pointer items-center overflow-hidden pl-3 pr-8 transition-colors duration-100",
       isActive
        ? "bg-primary/5 border-l border-primary/30"
        : "hover:bg-muted/40",
      ].join(" ")}
      style={{ width: colW(prop.id), minWidth: colW(prop.id), minHeight: ROW_H }}
      onClick={(e) => { setHoveredCell(null); activateCell(entry.id, prop.id, e); }}
      onMouseEnter={(e) => {
       clearLeaveTimer();
       // Suppressed while ANY cell popup is open, not just this exact cell —
       // a popup can visually extend well past its own trigger cell (e.g.
       // the files editor spans multiple rows once opened on a short row),
       // so a hover overlay on a nearby cell could render on top of it
       // regardless of z-index if the two ever raced on mount order.
       if (!isActive && !editPop && !commentPopover) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHoveredCell({ propId: prop.id, prop, rawVal, rect });
        fetchRowComments();
       }
      }}
      onMouseLeave={scheduleLeave}
     >
      {isActive && TEXT_TYPES.has(prop.type) ? (
       <input
        ref={cellInputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => commitText(entry.id, prop.id, editValue)}
        onKeyDown={(e) => {
         if (e.key === "Enter" || e.key === "Tab") { commitText(entry.id, prop.id, editValue); e.preventDefault(); }
         if (e.key === "Escape") setActiveCell(null);
        }}
        type={prop.type === "number" ? "number" : "text"}
        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
       />
      ) : rawVal ? (
       <CellDisplay property={prop} value={rawVal} compact resolvedDisplayAs={resolveDisplayAs(prop, activeView)} resolvedWrapContent={resolveWrapContent(prop, activeView)} workspaceId={workspaceId} />
      ) : (
       <>
        <CellDisplay property={prop} value={rawVal} compact resolvedDisplayAs={resolveDisplayAs(prop, activeView)} resolvedWrapContent={resolveWrapContent(prop, activeView)} workspaceId={workspaceId} />
        {isEditor && TEXT_TYPES.has(prop.type) && (
         <span className="pointer-events-none select-none text-sm text-muted-foreground/60">Type…</span>
        )}
       </>
      )}
     </div>
    );
   })}

   {isEditor && <div className="shrink-0" style={{ width: addBtnW, minHeight: ROW_H }} />}
  </div>

  {/* Portal overlay — rendered to document.body, completely outside table DOM.
      `!editPop` is a belt-and-suspenders guard here (not just in the
      onMouseEnter handler that sets hoveredCell) — it doesn't matter how or
      when hoveredCell got set, this overlay must never render while a cell
      popup is open, since the popup can visually extend over other rows. */}
  {hoveredCell && !editPop && typeof document !== "undefined" && createPortal(
   <CellActionOverlay
    rect={hoveredCell.rect}
    canCopy={!BADGE_TYPES.has(hoveredCell.prop.type) && !!getPropertyText(hoveredCell.prop, hoveredCell.rawVal)}
    commentCount={commentCountFor(hoveredCell.propId)}
    copied={copiedPropId === hoveredCell.propId}
    onClearLeaveTimer={clearLeaveTimer}
    onScheduleLeave={scheduleLeave}
    onCommentClick={(btnRect) => {
     if (!commentPopover) {
      clearLeaveTimer();
      setHoveredCell(null); // dismiss overlay when popover opens
     }
     setCommentPopover(commentPopover ? null : {
      rect: btnRect,
      propId: hoveredCell.propId,
      propName: hoveredCell.prop.name,
      valueLabel: getPropertyText(hoveredCell.prop, hoveredCell.rawVal),
     });
    }}
    onCopyClick={() => {
     const txt = getPropertyText(hoveredCell.prop, hoveredCell.rawVal);
     if (!txt) return;
     const apply = () => { setCopiedPropId(hoveredCell.propId); setTimeout(() => setCopiedPropId(null), 1500); };
     if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(apply).catch(() => {
       try {
        const el = document.createElement("textarea");
        el.value = txt; el.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
        document.body.appendChild(el); el.select();
        document.execCommand("copy"); document.body.removeChild(el);
        apply();
       } catch {}
      });
     }
    }}
   />,
   document.body,
  )}

  {commentPopover && (
   <CellCommentPopover
    pageId={entry.id}
    workspaceId={workspaceId}
    workspaceSlug={workspaceSlug}
    entryShortId={entry.shortId}
    anchorRect={commentPopover.rect}
    propertyId={commentPopover.propId}
    propertyName={commentPopover.propName}
    propertyValueLabel={commentPopover.valueLabel}
    onClose={() => { setCommentPopover(null); commentsFetchedRef.current = false; }}
    onCommentAdded={() => {
     setRowComments((prev) => [...(prev ?? []), { blockId: null, deletedAt: null, propertyId: commentPopover.propId }]);
     if (commentPopover.propId === null) setRowCommentCount((c) => c + 1);
    }}
   />
  )}
  {tooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
   document.body,
  )}
  </>
 );
}

// ── TableView ────────────────────────────────────────────────────────────────

export function TableView({
 databaseId, workspaceId, workspaceSlug, entries, properties, valueMap, activeView, isEditor,
 onUpdateValue, onUpdateTitle, onCreateEntry, onAddProperty, onUpdateProperty,
 onDeleteProperty, onUpdateView, onDeleteEntry, onDuplicateEntry, selectedEntryIds, onSelectEntry, onOpenEntry,
}: SharedViewProps) {
 const [activeCell, setActiveCell]   = useState<ActiveCell | null>(null);
 const [editValue, setEditValue]    = useState("");
 const [editPop, setEditPop]      = useState<EditPop | null>(null);
 const [propMenu, setPropMenu]     = useState<PropMenuState | null>(null);
 const [editPropPanel, setEditPropPanel] = useState<{ propId: string; anchorRect: DOMRect } | null>(null);
 const [addPropMenu, setAddPropMenu]  = useState<AddPropState | null>(null);
 const [propName, setPropName]     = useState("");
 const [renamingProp, setRenamingProp] = useState<string | null>(null);
 const [renameVal, setRenameVal]    = useState("");
 const [rowMenu, setRowMenu]      = useState<RowMenuState | null>(null);
 const [rowCommentTarget, setRowCommentTarget] = useState<{ entryId: string; rect: DOMRect } | null>(null);
 const [deleteConfirm, setDeleteConfirm] = useState<{ entryId: string } | null>(null);
 const [deletingEntry, setDeletingEntry] = useState(false);
 const [hoveredRowId, setHoveredRowId]   = useState<string | null>(null);
 const [colWidths, setColWidths]    = useState<Record<string, number>>({});
 const cellInputRef          = useRef<HTMLInputElement>(null);
 const scrollHeaderRef        = useRef<HTMLDivElement>(null);
 const scrollBodyRef          = useRef<HTMLDivElement>(null);
 // DnD state: when grouped, keyed by group id; when ungrouped, keyed by "__flat__"
 const [localEntryOrder, setLocalEntryOrder] = useState<Map<string, string[]>>(new Map());
 const [draggingId, setDraggingId]      = useState<string | null>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 const hiddenIds = new Set((activeView?.hiddenPropertyIds ?? []) as string[]);
 const visible  = resolvePropertyOrder(properties.filter((p) => !p.isSystem && !hiddenIds.has(p.id)), activeView);

 const allSelected = entries.length > 0 && entries.every((e) => selectedEntryIds.has(e.id));
 const someSelected = entries.some((e) => selectedEntryIds.has(e.id));

 function getRaw(entryId: string, propId: string) {
  return valueMap.get(entryId)?.get(propId) ?? null;
 }
 function getTextVal(entryId: string, propId: string): string {
  const v  = getRaw(entryId, propId) as Record<string, unknown> | null;
  const prop = visible.find((p) => p.id === propId);
  if (!prop) return "";
  return String(v?.[prop.type as keyof typeof v] ?? "");
 }
 // Local state is only the live-drag buffer — the persisted width lives in
 // this view's own propertyOverrides, so resizing a column in Table never
 // affects any other view (none of which have columns anyway).
 function colW(id: string) { return colWidths[id] ?? activeView?.propertyOverrides?.[id]?.width ?? DEFAULT_COL_W; }

 function activateCell(entryId: string, propId: string, e: React.MouseEvent) {
  if (!isEditor) return;
  const prop = visible.find((p) => p.id === propId);
  if (!prop) return;
  if (prop.type === "checkbox") {
   const cur = getRaw(entryId, propId) as { checked?: boolean } | null;
   onUpdateValue(entryId, propId, { checked: !(cur?.checked ?? false) });
   return;
  }
  if (TEXT_TYPES.has(prop.type)) {
   setActiveCell({ entryId, propId });
   setEditValue(getTextVal(entryId, propId));
   setTimeout(() => cellInputRef.current?.focus(), 0);
   return;
  }
  if (POPUP_TYPES.has(prop.type)) {
   const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
   setEditPop({ entryId, propId, rect });
  }
 }

 function commitText(entryId: string, propId: string, raw: string) {
  const prop = visible.find((p) => p.id === propId);
  if (!prop) return;
  const val = prop.type === "number"
   ? { number: raw === "" ? null : Number(raw) }
   : { [prop.type]: raw };
  onUpdateValue(entryId, propId, val);
  setActiveCell(null);
 }

 // Column resize
 function startResize(propId: string, startX: number, startW: number) {
  let finalW = startW;
  function onMove(e: MouseEvent) {
   finalW = Math.max(MIN_COL_W, startW + (e.clientX - startX));
   setColWidths((prev) => ({ ...prev, [propId]: finalW }));
  }
  function onUp() {
   document.removeEventListener("mousemove", onMove);
   document.removeEventListener("mouseup", onUp);
   document.body.style.cursor = "";
   document.body.style.userSelect = "";
   if (finalW !== startW) {
    onUpdateView({
     propertyOverrides: { ...activeView?.propertyOverrides, [propId]: { ...(activeView?.propertyOverrides?.[propId] ?? {}), width: finalW } },
    });
   }
  }
  document.body.style.cursor  = "col-resize";
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
 }

 // Reordering only ever drags among currently-VISIBLE columns — hidden ones
 // keep their existing relative slots in the saved order untouched, so
 // un-hiding a property later doesn't drop it somewhere unexpected.
 function handleColumnDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIndex = visible.findIndex((p) => p.id === active.id);
  const newIndex = visible.findIndex((p) => p.id === over.id);
  if (oldIndex === -1 || newIndex === -1) return;
  const newVisibleOrder = arrayMove(visible, oldIndex, newIndex).map((p) => p.id);
  const fullOrder = resolvePropertyOrder(properties.filter((p) => !p.isSystem), activeView).map((p) => p.id);
  const visibleIds = new Set(visible.map((p) => p.id));
  let vi = 0;
  const merged = fullOrder.map((id) => (visibleIds.has(id) ? newVisibleOrder[vi++] : id));
  onUpdateView({ propertyOrder: merged });
 }

 const propsW  = visible.reduce((s, p) => s + colW(p.id), 0);
 const addBtnW  = isEditor ? 52 : 0;
 const totalW  = DRAG_COL_W + IDX_COL_W + TITLE_COL_W + propsW + addBtnW;

 // Grouping
 const groupPropId = activeView?.groupByPropertyId;
 const groupProp  = groupPropId ? properties.find((p) => p.id === groupPropId && isGroupableType(p.type)) : null;

 type RowGroup = { id: string | null; label: string; color: string | null; entries: DbEntry[] };
 let rowGroups: RowGroup[] | null = null;
 if (groupProp) {
  const gMap = new Map<string | null, RowGroup>();
  gMap.set(null, { id: null, label: `No ${groupProp.name}`, color: null, entries: [] });
  deriveGroups(groupProp, entries, valueMap).forEach((g) => gMap.set(g.id, { ...g, entries: [] }));
  for (const e of entries) {
   const val = valueMap.get(e.id)?.get(groupPropId!) ?? null;
   for (const key of getEntryGroupIds(groupProp, val)) {
    (gMap.get(key) ?? gMap.get(null)!).entries.push(e);
   }
  }
  rowGroups = [...gMap.values()].filter((g) => g.entries.length > 0 || g.id === null);
 }

 // DnD sensors
 const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
 );

 // Reset local order when entries change
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(() => { setLocalEntryOrder(new Map()); }, [entries.map((e) => e.id).join(",")]);

 const draggingEntry = draggingId ? entries.find((e) => e.id === draggingId) : null;

 function getOrderedEntries(groupKey: string, groupEntries: DbEntry[]): DbEntry[] {
  const order = localEntryOrder.get(groupKey);
  if (!order || order.length === 0) return groupEntries;
  return order.map((id) => groupEntries.find((e) => e.id === id)).filter(Boolean) as DbEntry[];
 }

 function handleDragStart(event: DragStartEvent) {
  setDraggingId(String(event.active.id));
 }

 function handleDragEnd(groupKey: string, groupEntries: DbEntry[], event: DragEndEvent) {
  const { active, over } = event;
  setDraggingId(null);
  if (!over || active.id === over.id) return;
  const currentOrder = localEntryOrder.get(groupKey);
  const base = currentOrder && currentOrder.length > 0
   ? currentOrder
   : groupEntries.map((e) => e.id);
  const oldIdx = base.indexOf(String(active.id));
  const newIdx = base.indexOf(String(over.id));
  if (oldIdx === -1 || newIdx === -1) return;
  setLocalEntryOrder((prev) => {
   const next = new Map(prev);
   next.set(groupKey, arrayMove(base, oldIdx, newIdx));
   return next;
  });
 }

 return (
  <div className="flex h-full flex-col bg-background isolate">

   {/* ═══════════ HEADER — fixed at top, clipped, synced horizontally ═══════════ */}
   <div
    ref={scrollHeaderRef}
    className="shrink-0 overflow-hidden bg-background db-header-b"
   >
    <div style={{ minWidth: totalW, paddingRight: 32 }}>
    <div className="flex items-stretch">
     {/* Drag handle header (empty) */}
     <div
      className="shrink-0 bg-muted/30"
      style={{ width: DRAG_COL_W, minWidth: DRAG_COL_W }}
     />

     {/* Checkbox / select-all */}
     <div
      className="flex shrink-0 items-center justify-center bg-muted/30"
      style={{ width: IDX_COL_W, minWidth: IDX_COL_W }}
     >
      {isEditor && (
       <label className="flex cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <input
         type="checkbox"
         checked={allSelected}
         ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
         onChange={(e) => {
          entries.forEach((entry) => onSelectEntry(entry.id, e.target.checked));
         }}
         className="sr-only"
        />
        <span className={`flex size-[15px] items-center justify-center rounded border transition-colors duration-150 ${
         allSelected
          ? "border-primary bg-primary"
          : someSelected
           ? "border-primary bg-primary/20"
           : "border-border/60 bg-background hover:border-primary/50"
        }`}>
         {allSelected && (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(0.6px, -0.2px)" }}>
           <polyline points="2 6 5 9 10 3"/>
          </svg>
         )}
         {someSelected && !allSelected && (
          <span className="block h-0.5 w-2 rounded-full bg-primary" />
         )}
        </span>
       </label>
      )}
     </div>

     {/* Name header */}
     <div
      className="flex shrink-0 items-center gap-2 bg-muted/30 px-3 py-0"
      style={{ width: TITLE_COL_W, minWidth: TITLE_COL_W, height: 34, borderRight: "1px solid var(--color-border)" }}
     >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60">
       <TextT size={10} className="text-muted-foreground/60" />
      </span>
      <span className="text-xs font-semibold text-muted-foreground tracking-wide">Name</span>
     </div>

     {/* Property headers — draggable to reorder, saved per-view (propertyOrder) */}
     <DndContext sensors={sensors} onDragEnd={handleColumnDragEnd}>
      <SortableContext items={visible.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
       {visible.map((prop) => (
        <SortableColumnHeader
         key={prop.id}
         prop={prop}
         width={colW(prop.id)}
         isEditor={isEditor}
         isRenaming={renamingProp === prop.id}
         renameVal={renameVal}
         onRenameChange={setRenameVal}
         onCommitRename={() => { if (renameVal.trim()) onUpdateProperty(prop.id, { name: renameVal.trim() }); setRenamingProp(null); }}
         onCancelRename={() => setRenamingProp(null)}
         onOpenMenu={(rect) => setPropMenu(propMenu?.propId === prop.id ? null : { propId: prop.id, rect })}
         onStartResize={(clientX) => startResize(prop.id, clientX, colW(prop.id))}
        />
       ))}
      </SortableContext>
     </DndContext>

     {/* Add property */}
     {isEditor && (
      <div className="shrink-0" style={{ width: addBtnW, minWidth: addBtnW, height: 34 }}>
       <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
         const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
         setAddPropMenu(addPropMenu ? null : { rect });
        }}
        className="flex size-full items-center justify-center text-muted-foreground/60 transition-colors hover:bg-accent/60 hover:text-muted-foreground"
        onMouseEnter={(e) => showTooltip("Add property", e)}
        onMouseLeave={hideTooltip}
       >
        <Plus size={13} />
       </button>
      </div>
     )}
    </div>
    </div>
   </div>

   {/* ═══════════ SCROLLABLE BODY — fills remaining height, both axes ═══════════ */}
   <div
    ref={scrollBodyRef}
    className="flex-1 overflow-auto pb-20"
    onScroll={(e) => {
     if (scrollHeaderRef.current) {
      scrollHeaderRef.current.scrollLeft = (e.currentTarget as HTMLDivElement).scrollLeft;
     }
    }}
   >
   <div style={{ minWidth: totalW, paddingRight: 32 }}>

    {/* ═══════════ ROWS ═══════════ */}
    {(rowGroups ?? [{ id: null, label: "", color: null, entries }] as RowGroup[]).flatMap((group, gIdx) => {
     const groupKey = group.id ?? "__flat__";
     const orderedGroupEntries = getOrderedEntries(groupKey, group.entries);

     const groupHeader = rowGroups && (
      <div
       key={`gh-${gIdx}`}
       className="flex items-center gap-2.5 border-b border-border/40 bg-muted/20 px-3 py-2"
      >
       {group.id && group.color ? (() => {
        const c = getOptionColor(group.color);
        return (
         <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
          {group.label}
         </span>
        );
       })() : (
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground/70">
         <span className="size-1.5 rounded-full bg-muted-foreground/30" />
         {group.label}
        </span>
       )}
       <span className="text-xs text-muted-foreground/70">{group.entries.length}</span>
      </div>
     );

     const dndRows = (
      <DndContext
       key={`dnd-${groupKey}`}
       sensors={sensors}
       onDragStart={handleDragStart}
       onDragEnd={(event) => handleDragEnd(groupKey, group.entries, event)}
      >
       <SortableContext items={orderedGroupEntries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        {orderedGroupEntries.map((entry, rowIdx) => (
         <SortableTableRow
          key={entry.id}
          entry={entry}
          rowIdx={rowIdx}
          visible={visible}
          activeCell={activeCell}
          editPop={editPop}
          editValue={editValue}
          cellInputRef={cellInputRef}
          selectedEntryIds={selectedEntryIds}
          hoveredRowId={hoveredRowId}
          deleteConfirm={deleteConfirm}
          isEditor={isEditor}
          rowMenu={rowMenu}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          addBtnW={addBtnW}
          activeView={activeView}
          colW={colW}
          onMouseEnter={() => { if (!deleteConfirm) setHoveredRowId(entry.id); }}
          onMouseLeave={() => setHoveredRowId(null)}
          onSelectEntry={onSelectEntry}
          onUpdateTitle={onUpdateTitle}
          onOpenEntry={onOpenEntry}
          setActiveCell={setActiveCell}
          setEditValue={setEditValue}
          setRowMenu={setRowMenu}
          activateCell={activateCell}
          commitText={commitText}
          getRaw={getRaw}
         />
        ))}
       </SortableContext>
       <DragOverlay>
        {draggingEntry && (
         <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
          <GripVertical size={13} className="text-muted-foreground/40" />
          {draggingEntry.title || "Untitled"}
         </div>
        )}
       </DragOverlay>
      </DndContext>
     );

     return groupHeader ? [groupHeader, dndRows] : [dndRows];
    })}

    {/* ═══════════ EMPTY STATE ═══════════ */}
    {entries.length === 0 && (
     <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-muted/50">
       <Table2 size={24} className="text-muted-foreground/70" />
      </div>
      <div className="text-center">
       <p className="text-base font-semibold text-foreground">No entries yet</p>
       <p className="mt-1.5 text-sm text-muted-foreground/60">
        Add your first entry to start building your database
       </p>
      </div>
      {isEditor && (
       <button
        onClick={() => onCreateEntry()}
        className="flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150"
       >
        <Plus size={14} />
        Add first entry
       </button>
      )}
     </div>
    )}

    {/* ═══════════ ADD ROW ═══════════ */}
    {isEditor && entries.length > 0 && (
     <div>
      <button
       onClick={() => onCreateEntry()}
       className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground cursor-pointer w-full"
      >
       <Plus size={13} />
       <span>New entry</span>
      </button>
     </div>
    )}

   </div>
   </div>

   {/* ═══════════ PORTALS ═══════════ */}

   {rowMenu && isEditor && (
    <RowContextMenu
     menu={rowMenu}
     workspaceSlug={workspaceSlug}
     onCommentClick={(rect) => { setRowCommentTarget({ entryId: rowMenu.entryId, rect }); setRowMenu(null); }}
     onDuplicate={onDuplicateEntry ? () => { onDuplicateEntry(rowMenu.entryId); setRowMenu(null); } : undefined}
     onDeleteRequest={() => { setDeleteConfirm({ entryId: rowMenu.entryId }); setRowMenu(null); setHoveredRowId(null); }}
     onClose={() => setRowMenu(null)}
    />
   )}

   {rowCommentTarget && (
    <CellCommentPopover
     pageId={rowCommentTarget.entryId}
     workspaceId={workspaceId}
     workspaceSlug={workspaceSlug}
     entryShortId={entries.find((e) => e.id === rowCommentTarget.entryId)?.shortId ?? ""}
     anchorRect={rowCommentTarget.rect}
     onClose={() => setRowCommentTarget(null)}
    />
   )}

   <ConfirmDialog
    open={!!deleteConfirm}
    onOpenChange={(o) => !o && setDeleteConfirm(null)}
    title="Delete entry?"
    description="This entry and all its content will be permanently deleted. This action cannot be undone."
    confirmLabel="Delete"
    confirmLoadingLabel="Deleting…"
    loading={deletingEntry}
    onConfirm={async () => {
     if (!deleteConfirm) return;
     setDeletingEntry(true);
     await onDeleteEntry(deleteConfirm.entryId);
     setDeletingEntry(false);
     setDeleteConfirm(null);
    }}
   />

   {propMenu && isEditor && (
    <PropHeaderMenu
     menu={propMenu}
     prop={visible.find((p) => p.id === propMenu.propId)}
     onRename={(id) => { const p = visible.find((x) => x.id === id); if (p) { setRenamingProp(id); setRenameVal(p.name); } setPropMenu(null); }}
     onHide={(id) => { onUpdateView({ hiddenPropertyIds: [...((activeView?.hiddenPropertyIds ?? []) as string[]), id] }); setPropMenu(null); }}
     onDelete={async (id) => { await onDeleteProperty(id); setPropMenu(null); }}
     onSort={(id, dir) => { onUpdateView({ sorts: [{ propertyId: id, direction: dir }] }); setPropMenu(null); }}
     onUpdateProperty={onUpdateProperty}
     onDuplicateProperty={async (prop) => { await onAddProperty(`${prop.name} (copy)`, prop.type, prop.config); }}
     onClose={() => setPropMenu(null)}
     activeView={activeView}
     onUpdateView={onUpdateView}
    />
   )}

   {addPropMenu && isEditor && (
    <AddPropertyMenu
     rect={addPropMenu.rect}
     propName={propName}
     workspaceId={workspaceId}
     databaseId={databaseId}
     properties={properties}
     onNameChange={setPropName}
     onAdd={async (name, type, config, twoWay) => { await onAddProperty(name, type, config, twoWay); setAddPropMenu(null); setPropName(""); }}
     onClose={() => { setAddPropMenu(null); setPropName(""); }}
    />
   )}

   {editPop && (
    <CellEditorPopover
     property={visible.find((p) => p.id === editPop.propId)!}
     value={getRaw(editPop.entryId, editPop.propId)}
     cellRect={editPop.rect}
     workspaceId={workspaceId}
     onSave={(val) => onUpdateValue(editPop.entryId, editPop.propId, val)}
     onClose={() => setEditPop(null)}
     onPropertyConfigChange={(propId, config) => onUpdateProperty(propId, { config })}
     onEditProperty={(rect) => setEditPropPanel({ propId: editPop.propId, anchorRect: rect })}
     // Same z-index override used elsewhere in this file — without it this
     // shares CellActionOverlay's own z-index (200), so whichever mounted
     // more recently wins the stack and a hovered comment/copy icon on a
     // different row can render on top of this still-open popup.
     zIndex={300}
    />
   )}

   {editPropPanel && (() => {
    const panelProp = visible.find((p) => p.id === editPropPanel.propId);
    if (!panelProp) return null;
    return (
     <EditPropertySidePanel
      key={panelProp.id}
      property={panelProp}
      getAnchorRect={() => editPropPanel.anchorRect}
      canDelete={!panelProp.isSystem}
      onUpdateProperty={(patch) => onUpdateProperty(panelProp.id, patch)}
      onDeleteProperty={() => onDeleteProperty(panelProp.id)}
      onDuplicateProperty={async () => { await onAddProperty(`${panelProp.name} (copy)`, panelProp.type, panelProp.config); }}
      onClose={() => setEditPropPanel(null)}
      viewContext={activeView ? {
       override: activeView.propertyOverrides?.[panelProp.id] ?? {},
       onUpdateOverride: (patch) => onUpdateView({
        propertyOverrides: { ...activeView.propertyOverrides, [panelProp.id]: { ...(activeView.propertyOverrides?.[panelProp.id] ?? {}), ...patch } },
       }),
      } : undefined}
     />
    );
   })()}
  {tooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
   document.body,
  )}
  </div>
 );
}

// ── SortableColumnHeader ─────────────────────────────────────────────────────

interface SortableColumnHeaderProps {
 prop: DbProperty;
 width: number;
 isEditor: boolean;
 isRenaming: boolean;
 renameVal: string;
 onRenameChange: (val: string) => void;
 onCommitRename: () => void;
 onCancelRename: () => void;
 onOpenMenu: (rect: DOMRect) => void;
 onStartResize: (clientX: number) => void;
}

function SortableColumnHeader({ prop, width, isEditor, isRenaming, renameVal, onRenameChange, onCommitRename, onCancelRename, onOpenMenu, onStartResize }: SortableColumnHeaderProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: prop.id, disabled: !isEditor });
 const style: React.CSSProperties = {
  width, minWidth: width, height: 34,
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.4 : 1,
 };
 const Icon = PROPERTY_TYPE_ICON[prop.type as keyof typeof PROPERTY_TYPE_ICON] ?? TextT;
 const propConfig = (prop.config ?? {}) as { icon?: string };

 return (
  <div ref={setNodeRef} style={style} className="group relative shrink-0">
   {isRenaming ? (
    <input
     value={renameVal}
     onChange={(e) => onRenameChange(e.target.value)}
     onBlur={onCommitRename}
     onKeyDown={(e) => {
      if (e.key === "Enter") onCommitRename();
      if (e.key === "Escape") onCancelRename();
     }}
     autoFocus
     className="h-full w-full bg-transparent px-3 text-xs font-semibold text-foreground/70 focus:outline-none"
    />
   ) : (
    <button
     onMouseDown={(e) => e.stopPropagation()}
     onClick={(e) => {
      if (!isEditor) return;
      onOpenMenu((e.currentTarget as HTMLElement).getBoundingClientRect());
     }}
     className="flex h-full w-full items-center gap-1.5 bg-muted/30 px-3 transition-colors hover:bg-accent/60"
    >
     {isEditor && (
      <span
       {...attributes}
       {...listeners}
       onClick={(e) => e.stopPropagation()}
       style={{ touchAction: "none" }}
       className="flex size-3.5 shrink-0 cursor-grab items-center justify-center text-muted-foreground/0 group-hover:text-muted-foreground/40"
      >
       <GripVertical size={11} />
      </span>
     )}
     <span className="flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/50">
      {propConfig.icon ? <PageIcon icon={propConfig.icon} size={10} /> : <Icon size={10} />}
     </span>
     <span className="truncate text-xs font-semibold text-muted-foreground tracking-wide">{prop.name}</span>
    </button>
   )}
   {/* Resize handle */}
   {isEditor && (
    <div
     className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/40"
     onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onStartResize(e.clientX); }}
    />
   )}
  </div>
 );
}

// ── RowContextMenu ────────────────────────────────────────────────────────────

interface RowContextMenuProps {
 menu: RowMenuState;
 workspaceSlug: string;
 onCommentClick: (rect: DOMRect) => void;
 onDuplicate?: () => void;
 onDeleteRequest: () => void;
 onClose: () => void;
}

function RowContextMenu({ menu, workspaceSlug, onCommentClick, onDuplicate, onDeleteRequest, onClose }: RowContextMenuProps) {
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => {
  function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [onClose]);
 // Anchored to a row's "⋯" button inside the scrollable table — lock scroll
 // while open instead of repositioning, so it can't drift from its row.
 useScrollLockWhileOpen(true, (target) => !!ref.current?.contains(target));

 const itemCount = 3 + (onDuplicate ? 1 : 0) + 1;
 const menuHeight = itemCount * 32 + 9 + 8;
 const menuWidth = 192;

 return createPortal(
  <div
   ref={ref}
   style={{
    position: "fixed",
    top: getClampedTop(menu.rect, menuHeight),
    left: getClampedLeft(menu.rect, menuWidth),
    zIndex: 300,
   }}
   className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background p-1.5"
  >
   <Link
    href={`/app/${workspaceSlug}/${menu.shortId}`}
    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    onClick={onClose}
   >
    <ArrowSquareOut size={13} className="shrink-0 text-muted-foreground" /> Open full page
   </Link>
   <button
    onClick={(e) => onCommentClick((e.currentTarget as HTMLElement).getBoundingClientRect())}
    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
   >
    <MessageSquareIcon size={13} className="shrink-0 text-muted-foreground" /> Comment
   </button>
   <button
    onClick={() => {
     if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/app/${workspaceSlug}/${menu.shortId}`).catch(() => {});
     }
     toast.success("Link copied to clipboard", { duration: 2000 });
     onClose();
    }}
    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
   >
    <Link2Icon size={13} className="shrink-0 text-muted-foreground" /> Copy link
   </button>
   {onDuplicate && (
    <button
     onClick={onDuplicate}
     className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    >
     <CopyIcon size={13} className="shrink-0 text-muted-foreground" /> Duplicate
    </button>
   )}
   <div className="my-1 h-px bg-border/60" />
   <button
    onClick={onDeleteRequest}
    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-destructive transition-colors duration-150 hover:bg-destructive/5"
   >
    <Trash size={13} /> Delete entry
   </button>
  </div>,
  document.body
 );
}

// ── PropHeaderMenu ────────────────────────────────────────────────────────────

interface PropHeaderMenuProps {
 menu: PropMenuState;
 prop: DbProperty | undefined;
 onRename: (id: string) => void;
 onHide: (id: string) => void;
 onDelete: (id: string) => Promise<void>;
 onSort: (id: string, dir: "asc" | "desc") => void;
 onUpdateProperty: (id: string, patch: Record<string, unknown>) => Promise<void>;
 onDuplicateProperty: (prop: DbProperty) => Promise<void>;
 onClose: () => void;
 activeView: SharedViewProps["activeView"];
 onUpdateView: (patch: Record<string, unknown>) => Promise<void>;
}

function PropHeaderMenu({ menu, prop, onRename, onHide, onDelete, onSort, onUpdateProperty, onDuplicateProperty, onClose, activeView, onUpdateView }: PropHeaderMenuProps) {
 const ref = useRef<HTMLDivElement>(null);
 const [confirmDelete, setConfirmDelete] = useState(false);
 // "Edit property" replaces this same menu's content in place, at the same anchor.
 const [editingProperty, setEditingProperty] = useState(false);
 useEffect(() => {
  function h(e: MouseEvent) {
   const target = e.target as HTMLElement;
   if (target.closest?.('[role="alertdialog"], [data-edit-property-exempt]')) return;
   if (ref.current && !ref.current.contains(target) && !confirmDelete) onClose();
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [onClose, confirmDelete]);

 // `menu.rect` is a one-time snapshot of the column header's "⋯" button, and
 // `getAnchorRect={() => menu.rect}` below always returns that same frozen value —
 // so EditPropertySidePanel's own live-reposition-on-scroll effect has nothing
 // fresh to reposition to. Lock scroll for this whole menu (both the list view and
 // the nested edit-property view) instead, so the frozen anchor never goes stale.
 useScrollLockWhileOpen(true, (target) =>
  !!ref.current?.contains(target) || !!target.closest?.('[role="alertdialog"], [data-edit-property-exempt]'));

 const sortable = prop && ["text", "number", "select", "status", "date", "checkbox"].includes(prop.type);
 const isSelectType = prop && (prop.type === "select" || prop.type === "status" || prop.type === "multi_select");

 if (editingProperty && prop) {
  return (
   <EditPropertySidePanel
    property={prop}
    getAnchorRect={() => menu.rect}
    canDelete={!prop.isSystem}
    onUpdateProperty={(patch) => onUpdateProperty(menu.propId, patch)}
    onDeleteProperty={() => onDelete(menu.propId)}
    onDuplicateProperty={() => onDuplicateProperty(prop)}
    onBack={() => setEditingProperty(false)}
    onClose={onClose}
    viewContext={activeView ? {
     override: activeView.propertyOverrides?.[prop.id] ?? {},
     onUpdateOverride: (patch) => onUpdateView({
      propertyOverrides: { ...activeView.propertyOverrides, [prop.id]: { ...(activeView.propertyOverrides?.[prop.id] ?? {}), ...patch } },
     }),
    } : undefined}
   />
  );
 }

 const itemCount = 3 + (sortable ? 2 : 0) + (isSelectType ? 1 : 0);
 const dividerCount = 1 + (sortable ? 1 : 0);
 const menuHeight = itemCount * 32 + dividerCount * 9 + 8;
 const menuWidth = 192;

 return createPortal(
  <>
   <div
    ref={ref}
    style={{
     position: "fixed",
     top: getClampedTop(menu.rect, menuHeight),
     left: getClampedLeft(menu.rect, menuWidth),
     zIndex: 300,
    }}
    className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background p-1.5"
   >
    {sortable && (
     <>
      <button onClick={() => onSort(menu.propId, "asc")} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-foreground hover:bg-accent"><SortAscending size={13} /> Sort A → Z</button>
      <button onClick={() => onSort(menu.propId, "desc")} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-foreground hover:bg-accent"><SortDescending size={13} /> Sort Z → A</button>
      <div className="my-1 h-px bg-border/60" />
     </>
    )}
    <button onClick={() => onRename(menu.propId)} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-foreground hover:bg-accent"><PencilIcon size={13} /> Rename</button>
    {isSelectType && (
     <button onClick={() => setEditingProperty(true)} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-foreground hover:bg-accent"><GearIcon size={13} /> Edit property</button>
    )}
    <button onClick={() => onHide(menu.propId)} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-foreground hover:bg-accent"><EyeSlash size={13} /> Hide column</button>
    <div className="my-1 h-px bg-border/60" />
    <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-normal text-destructive transition-colors duration-150 hover:bg-destructive/5"><Trash size={13} /> Delete column</button>
   </div>
   <ConfirmDialog
    open={confirmDelete}
    onOpenChange={(o) => { setConfirmDelete(o); if (!o) onClose(); }}
    title="Delete column?"
    description={`"${prop?.name ?? "This column"}" and all its data will be permanently removed. This cannot be undone.`}
    confirmLabel="Delete column"
    onConfirm={() => { onDelete(menu.propId); onClose(); }}
   />
  </>,
  document.body
 );
}

// ── AddPropertyMenu ───────────────────────────────────────────────────────────

interface AddPropertyMenuProps {
 rect: DOMRect;
 propName: string;
 workspaceId: string;
 databaseId: string;
 properties: DbProperty[];
 onNameChange: (v: string) => void;
 onAdd: (name: string, type: string, config?: Record<string, unknown>, twoWay?: boolean) => void;
 onClose: () => void;
}

function AddPropertyMenu({ rect, propName, workspaceId, databaseId, properties, onNameChange, onAdd, onClose }: AddPropertyMenuProps) {
 const ref = useRef<HTMLDivElement>(null);
 const [pickingRelation, setPickingRelation] = useState(false);
 const [pickingRollup, setPickingRollup] = useState(false);
 const [pickingFormula, setPickingFormula] = useState(false);
 useEffect(() => {
  function h(e: MouseEvent) { if (pickingRelation || pickingRollup || pickingFormula) return; if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [onClose, pickingRelation, pickingRollup, pickingFormula]);
 useScrollLockWhileOpen(true, (target) => !!ref.current?.contains(target));

 const types = Object.values(PROPERTY_REGISTRY);
 const menuWidth = 240;
 const menuHeight = 320;

 if (pickingRelation) {
  return (
   <RelationDatabasePicker
    rect={rect}
    workspaceId={workspaceId}
    onBack={() => setPickingRelation(false)}
    onClose={onClose}
    onPick={(relatedDatabaseId, twoWay) => {
     onAdd(propName.trim() || "Relation", "relation", { relatedDatabaseId }, twoWay);
    }}
   />
  );
 }

 if (pickingRollup) {
  return (
   <RollupConfigPicker
    rect={rect}
    properties={properties}
    onBack={() => setPickingRollup(false)}
    onClose={onClose}
    onPick={(config) => onAdd(propName.trim() || "Rollup", "rollup", config)}
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
    onClose={onClose}
    onPick={(expression) => onAdd(propName.trim() || "Formula", "formula", { expression })}
   />
  );
 }

 return createPortal(
  <div
   ref={ref}
   style={{
    position: "fixed",
    top: getClampedTop(rect, menuHeight),
    left: getClampedLeft(rect, menuWidth, { align: "end" }),
    zIndex: 300,
    width: menuWidth,
   }}
   className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
  >
   <div className="border-b border-border px-3 py-2.5">
    <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground">New property</p>
    <input
     autoFocus
     value={propName}
     onChange={(e) => onNameChange(e.target.value)}
     placeholder="Property name…"
     className="w-full bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none"
     onKeyDown={(e) => e.stopPropagation()}
    />
   </div>
   <div className="max-h-60 overflow-y-auto p-1.5">
    {types.map((def) => {
     const Icon = PROPERTY_TYPE_ICON[def.type as keyof typeof PROPERTY_TYPE_ICON] ?? TextT;
     return (
      <button
       key={def.type}
       onClick={() => {
        if (def.type === "relation") setPickingRelation(true);
        else if (def.type === "rollup") setPickingRollup(true);
        else if (def.type === "formula") setPickingFormula(true);
        else onAdd(propName.trim() || def.label, def.type);
       }}
       className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-foreground hover:bg-accent"
      >
       <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/50 text-muted-foreground">
        <Icon size={12} />
       </span>
       {def.label}
      </button>
     );
    })}
   </div>
  </div>,
  document.body
 );
}
