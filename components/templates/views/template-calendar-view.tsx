"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Plus, Trash2, FileText, MessageSquare, MoreHorizontal } from "lucide-react";
import { PageIcon } from "@/components/pages/page-icon";
import { EntryContextMenu } from "@/components/database/entry-context-menu";
import { CellCommentPopover } from "@/components/database/cell-comment-popover";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { resolveDisplayAs, resolveWrapContent } from "@/components/database/view-property-resolver";
import {
 DndContext,
 useDraggable,
 useDroppable,
 DragOverlay,
 PointerSensor,
 useSensor,
 useSensors,
 type DragEndEvent,
 type DragOverEvent,
 type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { DbProperty, DbView } from "@/components/database/types";
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const MONTH_NAMES = [
 "January","February","March","April","May","June",
 "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
// Floor for a day cell: the date number row plus the entries a cell shows
// before collapsing the rest into "+N more". Below this the cell clips its own
// contents, so rows stop shrinking here and the page grows instead.
const MIN_ROW_HEIGHT = 110;

const SHOW_MAX = 2;

type DateVal = { date?: string };

// Same rule board-view.tsx uses to decide whether a property has a
// display-worthy value — kept in sync so calendar cards and board cards
// agree on what counts as "filled".
function hasDisplayValue(prop: DatabaseProperty, raw: unknown, displayAs?: "select" | "checkbox"): boolean {
 const v = raw as Record<string, unknown> | null;
 switch (prop.type) {
  case "text":      return !!(v as { text?: string } | null)?.text;
  case "number":     return (v as { number?: number | null } | null)?.number != null;
  // Checkbox-display is meaningful even unset (an empty checkbox is still a
  // real state to show, unlike an empty pill, which has nothing to render).
  case "select":     return displayAs === "checkbox" || !!(v as { optionId?: string } | null)?.optionId;
  case "multi_select": return displayAs === "checkbox" || ((v as { optionIds?: string[] } | null)?.optionIds ?? []).length > 0;
  case "date":      return !!(v as { date?: string } | null)?.date;
  case "checkbox":    return !!(v as { checked?: boolean } | null)?.checked;
  case "url":      return !!(v as { url?: string } | null)?.url;
  case "email":     return !!(v as { email?: string } | null)?.email;
  case "phone":     return !!(v as { phone?: string } | null)?.phone;
  case "person":     return ((v as { userIds?: string[] } | null)?.userIds ?? []).length > 0;
  case "relation":    return ((v as { entryIds?: string[] } | null)?.entryIds ?? []).length > 0;
  default:        return false;
 }
}

// Toggling a checkbox-display select on a card: unchecking always clears the
// value; checking picks the first "complete"-group option if the property is
// grouped (marking it "done", matching what the checkbox visually implies),
// falling back to the first option at all for an ungrouped select.
function nextCheckboxSelectValue(prop: DatabaseProperty, raw: unknown): { optionId: string | null } {
 const optionId = (raw as { optionId?: string | null } | null)?.optionId ?? null;
 if (optionId) return { optionId: null };
 const options = ((prop.config as { options?: { id: string; group?: string }[] } | null)?.options ?? []);
 const target = options.find((o) => o.group === "complete") ?? options[0];
 return { optionId: target?.id ?? null };
}

// Same idea for multi-select: unchecking clears every selected option;
// checking sets just the first "complete"-group (or first overall) option,
// same single-value semantic a checkbox implies even for a multi-select field.
function nextCheckboxMultiSelectValue(prop: DatabaseProperty, raw: unknown): { optionIds: string[] } {
 const optionIds = (raw as { optionIds?: string[] } | null)?.optionIds ?? [];
 if (optionIds.length > 0) return { optionIds: [] };
 const options = ((prop.config as { options?: { id: string; group?: string }[] } | null)?.options ?? []);
 const target = options.find((o) => o.group === "complete") ?? options[0];
 return { optionIds: target ? [target.id] : [] };
}

interface Props {
 entries:    TemplateEntry[];
 properties:  DatabaseProperty[];
 activeView:  DatabaseView;
 entryValueMap: Map<string, Map<string, unknown>>;
 databaseId:  string;
 workspaceId: string;
 workspaceSlug: string;
 locked?:    boolean;
 year:     number;
 month:     number;
 onYearChange: (y: number) => void;
 onMonthChange: (m: number) => void;
 onAddEntry:  (defaultValues?: Record<string, unknown>) => void;
 onDeleteEntry: (entryId: string) => void;
 onDuplicateEntry?: (entryId: string) => void;
 onUpdateEntryIcon?: (entryId: string, icon: string) => void;
 onClickEntry: (entryId: string) => void;
 onUpdateEntryDate?: (entryId: string, calPropId: string, newDate: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
 onUpdateProperty?: (propId: string, patch: Record<string, unknown>) => void;
 onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
}

// ── MorePopupEntryRow ─────────────────────────────────────────────────────────
// Simpler, non-draggable row used inside the "+N more" overflow popup — mirrors
// DraggableChip's icon + comment-badge treatment so entries look consistent
// whether shown in the grid or the overflow list.
interface MorePopupEntryRowProps {
 entry: TemplateEntry;
 onClick: () => void;
 onDelete: () => void;
 locked?: boolean;
}

function MorePopupEntryRow({ entry, onClick, onDelete, locked }: MorePopupEntryRowProps) {
 // entry.commentCount is batch-computed server-side (open, page-level
 // threads only) — see components/database/board-view.tsx's CardShell for
 // the same change.
 const commentCount = entry.commentCount ?? 0;

 return (
  <div
   className="group/pe flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent transition-colors cursor-pointer"
   onClick={onClick}
  >
   {entry.icon ? (
    <PageIcon icon={entry.icon} size={13} className="shrink-0" />
   ) : (
    <FileText size={12} className="shrink-0 text-muted-foreground" />
   )}
   <span className="flex-1 truncate text-sm font-medium text-foreground">
    {entry.title || "Untitled"}
   </span>
   {!!commentCount && (
    <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
     <MessageSquare size={10} />
     {commentCount}
    </span>
   )}
   {!locked && (
    <button
     onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
     className="hidden size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover/pe:flex transition-colors"
    >
     <Trash2 size={11} />
    </button>
   )}
  </div>
 );
}

// ── DraggableChip ─────────────────────────────────────────────────────────────
interface DraggableChipProps {
 entry: TemplateEntry;
 databaseId: string;
 workspaceId: string;
 workspaceSlug: string;
 locked?: boolean;
 cardProps: DatabaseProperty[];
 valueMap: Map<string, Map<string, unknown>>;
 onClickEntry: (id: string) => void;
 onDeleteEntry: (id: string) => void;
 onDuplicateEntry?: (entryId: string) => void;
 onUpdateEntryIcon?: (entryId: string, icon: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
 onUpdateProperty?: (propId: string, patch: Record<string, unknown>) => void;
 activeView?: DatabaseView | null;
 onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
}

function DraggableChip({
 entry, databaseId, workspaceId, workspaceSlug, locked, cardProps, valueMap, onClickEntry, onDeleteEntry, onDuplicateEntry, onUpdateEntryIcon, onUpdatePropValue, onUpdateProperty,
 activeView, onUpdateView,
}: DraggableChipProps) {
 const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: entry.id,
  disabled: locked,
 });
 const style = transform ? { transform: CSS.Translate.toString(transform) } : {};
 const [commentCount, setCommentCount] = useState<number | null>(entry.commentCount ?? null);
 const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
 const [showComment, setShowComment] = useState(false);
 const chipRef = useRef<HTMLDivElement | null>(null);
 const filledProps = cardProps.filter((prop) => hasDisplayValue(
  prop, valueMap.get(entry.id)?.get(prop.id) ?? null,
  resolveDisplayAs(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined),
 ));

 // entry.commentCount is batch-computed server-side (open, page-level
 // threads only) — see components/database/board-view.tsx's CardShell for
 // the same change. `onCommentAdded` below still bumps this instantly
 // between fetches.
 useEffect(() => { setCommentCount(entry.commentCount ?? 0); }, [entry.commentCount]);

 return (
  <>
  <div
   ref={(el) => { setNodeRef(el); chipRef.current = el; }}
   style={{ ...style, opacity: isDragging ? 0 : 1, touchAction: "none", userSelect: "none", cursor: locked ? "pointer" : "grab" }}
   {...attributes}
   {...listeners}
   className="group/event flex flex-col rounded-[var(--radius-sm)] border border-border bg-background hover:border-border hover:bg-accent/30 transition-colors cursor-pointer"
   onClick={(e) => { e.stopPropagation(); onClickEntry(entry.id); }}
   onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuPos({ x: e.clientX, y: e.clientY }); }}
  >
   <div className="flex items-center gap-1.5 px-1.5 py-1">
    {entry.icon ? (
     <PageIcon icon={entry.icon} size={13} className="shrink-0" />
    ) : (
     <FileText size={12} className="shrink-0 text-muted-foreground" />
    )}
    <span className="flex-1 truncate text-xs font-semibold text-foreground">{entry.title || "Untitled"}</span>
    {!!commentCount && (
     <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); setShowComment(true); }}
      className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
     >
      <MessageSquare size={10} />
      {commentCount}
     </button>
    )}
    <button
     onPointerDown={(e) => e.stopPropagation()}
     onClick={(e) => { e.stopPropagation(); setMenuPos({ x: e.clientX, y: e.clientY }); }}
     className="flex shrink-0 size-3.5 items-center justify-center rounded opacity-0 group-hover/event:opacity-100 hover:bg-accent hover:text-foreground transition-all"
    >
     <MoreHorizontal size={10} />
    </button>
   </div>

   {filledProps.length > 0 && (
    <div className="flex flex-wrap items-center gap-1 px-1.5 pb-1.5">
     {filledProps.map((prop) => (
      <div key={prop.id} className="min-w-0 shrink-0">
       <CellDisplay
        property={prop as unknown as DbProperty}
        value={valueMap.get(entry.id)?.get(prop.id) ?? null}
        compact
        resolvedDisplayAs={resolveDisplayAs(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined)}
        resolvedWrapContent={resolveWrapContent(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined)}
        workspaceId={workspaceId}
        onToggleCheckbox={() => {
         if (locked) return;
         const raw = valueMap.get(entry.id)?.get(prop.id) ?? null;
         const next = prop.type === "multi_select" ? nextCheckboxMultiSelectValue(prop, raw) : nextCheckboxSelectValue(prop, raw);
         onUpdatePropValue(entry.id, prop.id, next);
        }}
       />
      </div>
     ))}
    </div>
   )}
  </div>

  {showComment && chipRef.current && (
   <CellCommentPopover
    pageId={entry.id}
    workspaceId={workspaceId}
    workspaceSlug={workspaceSlug}
    entryShortId={entry.shortId}
    anchorRect={chipRef.current.getBoundingClientRect()}
    onClose={() => setShowComment(false)}
    onCommentAdded={() => setCommentCount((c) => (c ?? 0) + 1)}
   />
  )}

  <EntryContextMenu
   entryId={entry.id}
   entryShortId={entry.shortId}
   entryIcon={entry.icon ?? null}
   updatedAt={entry.updatedAt ?? null}
   databaseId={databaseId}
   workspaceId={workspaceId}
   workspaceSlug={workspaceSlug}
   forcePos={menuPos}
   entryRect={chipRef.current?.getBoundingClientRect() ?? null}
   onClose={() => setMenuPos(null)}
   onIconChange={(icon) => { if (locked) return; onUpdateEntryIcon?.(entry.id, icon); }}
   onDelete={() => { if (locked) return; onDeleteEntry(entry.id); }}
   onDuplicate={!locked && onDuplicateEntry ? () => onDuplicateEntry(entry.id) : undefined}
   onCommentAdded={() => setCommentCount((c) => (c ?? 0) + 1)}
   onValueChange={(propId, value) => { if (locked) return; onUpdatePropValue(entry.id, propId, value); }}
   onPropertyConfigChange={locked ? () => {} : onUpdateProperty}
   activeView={activeView as unknown as DbView | null}
   onUpdateView={locked ? undefined : onUpdateView}
  />
  </>
 );
}

// ── DroppableDateCell ─────────────────────────────────────────────────────────
interface DroppableDateCellProps {
 dateKey: string;
 isOver: boolean;
 children: React.ReactNode;
 className?: string;
 [key: string]: unknown;
}

function DroppableDateCell({ dateKey, isOver, children, className, ...props }: DroppableDateCellProps) {
 const { setNodeRef } = useDroppable({ id: dateKey });
 return (
  <div
   ref={setNodeRef}
   className={`${className ?? ""} ${isOver ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""}`}
   {...props}
  >
   {children}
  </div>
 );
}

export function TemplateCalendarView({
 entries, properties, activeView, entryValueMap, databaseId, workspaceId, workspaceSlug, locked,
 year, month, onYearChange, onMonthChange,
 onAddEntry, onDeleteEntry, onDuplicateEntry, onUpdateEntryIcon, onClickEntry, onUpdateEntryDate, onUpdatePropValue, onUpdateProperty,
 onUpdateView,
}: Props) {
 const today = new Date();
 const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
 const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
 const [overDate, setOverDate] = useState<string | null>(null);

 const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
 const sensors = useSensors(...(locked ? [] : [pointerSensor]));

 // Fall back to first date property if the view doesn't have one pinned yet
 const calProp = properties.find((p) => p.id === activeView.calendarPropertyId)
  ?? properties.find((p) => p.type === "date");
 // Matches Notion: a card shows only its title by default. The one
 // exception is Status, and only once the user explicitly turns on "Show on
 // card" from Status's own Edit Property panel — every other property stays
 // fully editable via the entry's popup but is never rendered on the card.
 const cardProps = properties.filter((p) => {
  const config = p.config as { groupedByStatus?: boolean; showOnCard?: boolean } | null;
  return p.id !== calProp?.id && !!config?.groupedByStatus && !!config?.showOnCard;
 });

 function pad(n: number) { return String(n).padStart(2, "0"); }
 function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

 const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

 const dateMap = new Map<string, TemplateEntry[]>();
 for (const entry of entries) {
  const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
  const raw  = calProp ? valMap.get(calProp.id) : undefined;
  if (raw && typeof raw === "object") {
   const dv = raw as DateVal;
   if (dv.date) {
    if (!dateMap.has(dv.date)) dateMap.set(dv.date, []);
    dateMap.get(dv.date)!.push(entry);
   }
  }
 }

 const firstWeekday = new Date(year, month, 1).getDay();
 const daysInMonth = new Date(year, month + 1, 0).getDate();

 const cells: (number | null)[] = [
  ...Array<null>(firstWeekday).fill(null),
  ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
 ];
 while (cells.length % 7 !== 0) cells.push(null);

 function goPrev() {
  if (month === 0) { onMonthChange(11); onYearChange(year - 1); }
  else onMonthChange(month - 1);
 }
 function goNext() {
  if (month === 11) { onMonthChange(0); onYearChange(year + 1); }
  else onMonthChange(month + 1);
 }
 function goToday() { onYearChange(today.getFullYear()); onMonthChange(today.getMonth()); }

 function handleAddOnDate(day: number) {
  if (locked) return;
  if (!calProp) { onAddEntry(); return; }
  onAddEntry({ [calProp.id]: { date: dateKey(year, month, day) } });
 }

 // ── DnD handlers ─────────────────────────────────────────────────────────────
 function handleDragStart(event: DragStartEvent) {
  setDraggingEntryId(String(event.active.id));
 }

 function handleDragOver(event: DragOverEvent) {
  setOverDate(event.over?.id ? String(event.over.id) : null);
 }

 function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setDraggingEntryId(null);
  setOverDate(null);

  if (locked || !over || !calProp) return;
  const newDate = String(over.id);

  // Find the entry's current date
  const entryId = String(active.id);
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return;

  const valMap = entryValueMap.get(entryId) ?? new Map<string, unknown>();
  const raw = valMap.get(calProp.id);
  const currentDate = raw && typeof raw === "object" ? (raw as DateVal).date : undefined;

  // Don't update if dropped on the same date
  if (newDate === currentDate) return;

  onUpdateEntryDate?.(entryId, calProp.id, newDate);
 }

 // ── Hover-popup for "+N more" ──────────────────────────────────────────────
 const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const [morePopup, setMorePopup] = useState<{ key: string; x: number; y: number } | null>(null);

 function openPopup(key: string, e: React.MouseEvent<HTMLButtonElement>) {
  if (hoverTimer.current) clearTimeout(hoverTimer.current);
  setMorePopup({ key, x: e.clientX, y: e.clientY });
 }
 function scheduleClose() {
  hoverTimer.current = setTimeout(() => setMorePopup(null), 150);
 }
 function cancelClose() {
  if (hoverTimer.current) clearTimeout(hoverTimer.current);
 }

 // morePopup is a `position: fixed` portal anchored to a clientX/clientY
 // snapshotted once on hover — dismiss it on scroll instead of
 // repositioning, since locking scroll on every hover would hurt the
 // calendar grid's own scrolling.
 const morePopupRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (!morePopup) return;
  function handleScroll(e: Event) {
   // Capture phase, so this sees scrolls from every element — including the
   // popup's own max-height entry list. Scrolling that list must not dismiss
   // the popup, or a date with more entries than fit becomes unreadable: the
   // first wheel tick over it closed the very thing being scrolled.
   const target = e.target as Node | null;
   if (target && morePopupRef.current?.contains(target)) return;
   if (hoverTimer.current) clearTimeout(hoverTimer.current);
   setMorePopup(null);
  }
  document.addEventListener("scroll", handleScroll, true);
  return () => document.removeEventListener("scroll", handleScroll, true);
 }, [morePopup]);

 const rows = cells.length / 7;

 // The dragging entry (for DragOverlay)
 const draggingEntry = draggingEntryId ? entries.find((e) => e.id === draggingEntryId) : null;

 return (
  <>
  <DndContext
   sensors={sensors}
   onDragStart={handleDragStart}
   onDragOver={handleDragOver}
   onDragEnd={handleDragEnd}
  >
  {/* min-h-full, not h-full: fills the pane when there's room, but is free to
      grow past it when the month's rows need more height than is available
      (short window, zoomed in, or a cover banner eating vertical space) — the
      page scrolls to the rest rather than the rows compressing. */}
  <div className="flex min-h-full flex-1 flex-col">
   {/* ── Header ───────────────────────────────────────────────────────────── */}
   <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
    <h2 className="text-lg font-semibold tracking-tight text-foreground">
     {MONTH_NAMES[month]} {year}
    </h2>
    <div className="flex items-center gap-1">
     <button onClick={goPrev} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      <ChevronLeft size={14} />
     </button>
     <button onClick={goToday} className="rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      Today
     </button>
     <button onClick={goNext} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      <ChevronRight size={14} />
     </button>
    </div>
   </div>

   {/* ── Day-of-week headers ───────────────────────────────────────────────── */}
   <div className="grid shrink-0 grid-cols-7 border-b border-border bg-muted/20">
    {DAY_NAMES.map((d) => (
     <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {d.slice(0, 3)}
     </div>
    ))}
   </div>

   {/* ── Calendar grid ─────────────────────────────────────────────────────── */}
   {/* Rows are minmax(MIN_ROW_HEIGHT, 1fr), not a bare 1fr: 1fr still wins when
       there's room, but a bare 1fr let every row shrink without limit until the
       day cells — themselves overflow-hidden — silently swallowed their own
       entries, with nothing in the stack able to scroll to them. No `min-h-0`
       here: that would re-enable shrinking below the rows' own minimum. */}
   <div
    className="flex-1"
    style={{
     display:       "grid",
     gridTemplateColumns: "repeat(7, 1fr)",
     gridTemplateRows:  `repeat(${rows}, minmax(${MIN_ROW_HEIGHT}px, 1fr))`,
    }}
   >
    {cells.map((day, i) => {
     const key    = day !== null ? dateKey(year, month, day) : null;
     const isToday  = key === todayKey;
     const events  = key ? (dateMap.get(key) ?? []) : [];
     const shown   = events.slice(0, SHOW_MAX);
     const extra   = events.length - shown.length;
     const isLastRow = Math.floor(i / 7) === rows - 1;
     const isLastCol = (i % 7) === 6;

     const baseCellClass = [
      "group relative flex flex-col p-1 transition-colors",
      day === null ? "bg-muted/10" : "bg-background hover:bg-accent/20",
      !isLastRow ? "border-b border-border" : "",
      !isLastCol ? "border-r border-border" : "",
     ].join(" ");

     if (day === null) {
      return <div key={i} className={baseCellClass} />;
     }

     return (
      <DroppableDateCell
       key={i}
       dateKey={key!}
       isOver={overDate === key}
       className={baseCellClass}
      >
       {/* Day number row */}
       <div className="mb-1 flex items-center justify-between">
        <span className={[
         "flex size-[22px] items-center justify-center rounded-full text-xs font-medium leading-none",
         isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground/70",
        ].join(" ")}>
         {day}
        </span>
        {!locked && (
         <button
          onClick={(e) => { e.stopPropagation(); handleAddOnDate(day); }}
          className="hidden size-5 items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary group-hover:flex transition-colors"
         >
          <Plus size={11} />
         </button>
        )}
       </div>

       {/* Events */}
       <div className="flex flex-col gap-0.5">
        {shown.map((e) => (
         <DraggableChip
          key={e.id}
          entry={e}
          databaseId={databaseId}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          locked={locked}
          cardProps={cardProps}
          valueMap={entryValueMap}
          onClickEntry={onClickEntry}
          onDeleteEntry={(id) => setDeleteTarget(id)}
          onDuplicateEntry={onDuplicateEntry}
          onUpdateEntryIcon={onUpdateEntryIcon}
          onUpdatePropValue={onUpdatePropValue}
          onUpdateProperty={onUpdateProperty}
          activeView={activeView}
          onUpdateView={onUpdateView}
         />
        ))}

        {/* "+N more" hover trigger */}
        {extra > 0 && (
         <button
          onMouseEnter={(e) => openPopup(key!, e)}
          onMouseLeave={scheduleClose}
          className="px-1.5 py-0.5 text-left text-xs font-medium text-primary/70 hover:text-primary transition-colors"
         >
          +{extra} more
         </button>
        )}
       </div>
      </DroppableDateCell>
     );
    })}
   </div>

   {/* ── Hover popup (portal — escapes overflow-hidden grid) ───────────────── */}
   {morePopup && typeof window !== "undefined" && createPortal(
    (() => {
     const POPUP_W = 220;
     const vw = window.innerWidth;
     const vh = window.innerHeight;

     // If cursor is in the bottom 38% of the viewport, anchor from bottom
     // so the popup grows upward — no height estimate needed.
     const showAbove = morePopup.y > vh * 0.62;
     const left = Math.min(morePopup.x + 4, vw - POPUP_W - 8);

     const posStyle: React.CSSProperties = showAbove
      ? { position: "fixed", bottom: vh - morePopup.y + 8, left, zIndex: 9999, width: POPUP_W }
      : { position: "fixed", top: morePopup.y + 16,    left, zIndex: 9999, width: POPUP_W };

     return (
      <div style={posStyle}
       ref={morePopupRef}
       onMouseEnter={cancelClose}
       onMouseLeave={scheduleClose}
       className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover"
      >
       {/* Date label */}
       <div className="border-b border-border px-3 py-2">
        {(() => {
         const [ey, em, ed] = morePopup.key.split("-").map(Number);
         return (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
           {MONTH_NAMES[em - 1]} {ed}, {ey}
          </span>
         );
        })()}
       </div>

       {/* All entries for this date */}
       <div className="max-h-[220px] overflow-y-auto p-1">
        {(dateMap.get(morePopup.key) ?? []).map((e) => (
         <MorePopupEntryRow
          key={e.id}
          entry={e}
          locked={locked}
          onClick={() => { onClickEntry(e.id); setMorePopup(null); }}
          onDelete={() => { setDeleteTarget(e.id); setMorePopup(null); }}
         />
        ))}
       </div>
      </div>
     );
    })(),
    document.body
   )}
  </div>

  {/* ── DragOverlay ────────────────────────────────────────────────────────── */}
  <DragOverlay dropAnimation={null}>
   {draggingEntry && (
    <div className="flex items-center gap-1 rounded-[var(--radius-xs)] bg-primary px-1.5 py-[3px] text-xs font-medium text-primary-foreground cursor-grabbing">
     <span className="size-1.5 shrink-0 rounded-full bg-primary-foreground/60" />
     <span className="max-w-[120px] truncate">{draggingEntry.title || "Untitled"}</span>
    </div>
   )}
  </DragOverlay>
  </DndContext>

  <ConfirmDialog
   open={deleteTarget !== null}
   onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
   title="Delete entry?"
   description="This entry will be permanently deleted. This cannot be undone."
   confirmLabel="Delete"
   onConfirm={() => { if (locked || !deleteTarget) return; onDeleteEntry(deleteTarget); setDeleteTarget(null); }}
  />
  </>
 );
}
