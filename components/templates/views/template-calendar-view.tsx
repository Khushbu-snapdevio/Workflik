"use client";

import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
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
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const MONTH_NAMES = [
 "January","February","March","April","May","June",
 "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const SHOW_MAX = 2;

type DateVal = { date?: string };

interface Props {
 entries:    TemplateEntry[];
 properties:  DatabaseProperty[];
 activeView:  DatabaseView;
 entryValueMap: Map<string, Map<string, unknown>>;
 year:     number;
 month:     number;
 onYearChange: (y: number) => void;
 onMonthChange: (m: number) => void;
 onAddEntry:  (defaultValues?: Record<string, unknown>) => void;
 onDeleteEntry: (entryId: string) => void;
 onClickEntry: (entryId: string) => void;
 onUpdateEntryDate?: (entryId: string, calPropId: string, newDate: string) => void;
}

// ── DraggableChip ─────────────────────────────────────────────────────────────
interface DraggableChipProps {
 entry: TemplateEntry;
 onClickEntry: (id: string) => void;
 onDeleteEntry: (id: string) => void;
}

function DraggableChip({ entry, onClickEntry, onDeleteEntry }: DraggableChipProps) {
 const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: entry.id,
 });
 const style = transform ? { transform: CSS.Translate.toString(transform) } : {};

 return (
  <div
   ref={setNodeRef}
   style={{ ...style, opacity: isDragging ? 0 : 1, touchAction: "none", userSelect: "none", cursor: "grab" }}
   {...attributes}
   {...listeners}
   className="group/event flex items-center gap-1 rounded-[var(--radius-xs)] bg-primary/10 px-1.5 py-[3px] text-xs font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
   onClick={(e) => { e.stopPropagation(); onClickEntry(entry.id); }}
  >
   <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
   <span className="flex-1 truncate">{entry.title || "Untitled"}</span>
   <button
    onPointerDown={(e) => e.stopPropagation()}
    onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
    className="flex shrink-0 size-3.5 items-center justify-center rounded opacity-0 group-hover/event:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
   >
    <X size={8} />
   </button>
  </div>
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
 entries, properties, activeView, entryValueMap,
 year, month, onYearChange, onMonthChange,
 onAddEntry, onDeleteEntry, onClickEntry, onUpdateEntryDate,
}: Props) {
 const today = new Date();
 const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
 const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
 const [overDate, setOverDate] = useState<string | null>(null);

 const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
 );

 // Fall back to first date property if the view doesn't have one pinned yet
 const calProp = properties.find((p) => p.id === activeView.calendarPropertyId)
  ?? properties.find((p) => p.type === "date");

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

  if (!over || !calProp) return;
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
  <div className="flex h-full flex-col overflow-hidden">
   {/* ── Header ───────────────────────────────────────────────────────────── */}
   <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-6 py-3">
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
   <div className="grid shrink-0 grid-cols-7 border-b border-border/60 bg-muted/20">
    {DAY_NAMES.map((d) => (
     <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
      {d.slice(0, 3)}
     </div>
    ))}
   </div>

   {/* ── Calendar grid ─────────────────────────────────────────────────────── */}
   <div
    className="flex-1 overflow-hidden"
    style={{
     display:       "grid",
     gridTemplateColumns: "repeat(7, 1fr)",
     gridTemplateRows:  `repeat(${rows}, 1fr)`,
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
      !isLastRow ? "border-b border-border/60" : "",
      !isLastCol ? "border-r border-border/60" : "",
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
        <button
         onClick={(e) => { e.stopPropagation(); handleAddOnDate(day); }}
         className="hidden size-5 items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary group-hover:flex transition-colors"
        >
         <Plus size={11} />
        </button>
       </div>

       {/* Events */}
       <div className="flex flex-col gap-0.5">
        {shown.map((e) => (
         <DraggableChip
          key={e.id}
          entry={e}
          onClickEntry={onClickEntry}
          onDeleteEntry={(id) => setDeleteTarget(id)}
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
       onMouseEnter={cancelClose}
       onMouseLeave={scheduleClose}
       className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover"
      >
       {/* Date label */}
       <div className="border-b border-border/40 px-3 py-2">
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
         <div
          key={e.id}
          className="group/pe flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent transition-colors cursor-pointer"
          onClick={() => { onClickEntry(e.id); setMorePopup(null); }}
         >
          <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
          <span className="flex-1 truncate text-sm font-medium text-foreground">
           {e.title || "Untitled"}
          </span>
          <button
           onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e.id); setMorePopup(null); }}
           className="hidden size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover/pe:flex transition-colors"
          >
           <Trash2 size={11} />
          </button>
         </div>
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
    <div className="flex items-center gap-1 rounded-[var(--radius-xs)] bg-primary px-1.5 py-[3px] text-xs font-medium text-primary-foreground shadow-md cursor-grabbing">
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
   onConfirm={() => { if (deleteTarget) { onDeleteEntry(deleteTarget); setDeleteTarget(null); } }}
  />
  </>
 );
}
