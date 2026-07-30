"use client";

import { useEffect, useRef, useState } from "react";
import { PageIcon } from "@/components/pages/page-icon";
import { ChevronLeft, ChevronRight, Plus, FileText, MoreHorizontal, GanttChartSquare } from "lucide-react";
import { EntryContextMenu } from "@/components/database/entry-context-menu";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { DbView } from "@/components/database/types";
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Same plain local-midnight date helpers as components/database/gantt-view.tsx
// (the live counterpart) — kept file-local rather than shared, matching every
// other template-preview view's convention of not importing from the live
// components/database/*-view.tsx files.
function toISODate(d: Date): string {
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseISODate(iso: string | null | undefined): Date | null {
 if (!iso) return null;
 const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
 return Number.isNaN(d.getTime()) ? null : d;
}
function addDays(d: Date, n: number): Date {
 const next = new Date(d);
 next.setDate(next.getDate() + n);
 return next;
}
function daysBetween(a: Date, b: Date): number {
 return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const MONTHS = [
 "January", "February", "March", "April", "May", "June",
 "July", "August", "September", "October", "November", "December",
];

type Scale = "day" | "week" | "month";
const DAY_WIDTH: Record<Scale, number> = { day: 32, week: 14, month: 5 };
const SIDEBAR_W = 220;
const ROW_H = 36;
const HEADER_H = 52;

interface Props {
 entries: TemplateEntry[];
 properties: DatabaseProperty[];
 activeView: DatabaseView;
 entryValueMap: Map<string, Map<string, unknown>>;
 databaseId: string;
 workspaceId: string;
 workspaceSlug: string;
 locked?: boolean;
 onAddEntry: (defaultValues?: Record<string, unknown>) => void;
 onDeleteEntry: (entryId: string) => void;
 onDuplicateEntry?: (entryId: string) => void;
 onUpdateEntryIcon?: (entryId: string, icon: string) => void;
 onClickEntry: (entryId: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
 onUpdateProperty?: (propId: string, patch: Record<string, unknown>) => void;
 onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
}

// ── GanttBar (raw pointer-drag, same as the live view) ───────────────────────
interface GanttBarProps {
 entry: TemplateEntry;
 startDate: Date;
 endDate: Date;
 rangeStart: Date;
 dayWidth: number;
 onClick: () => void;
 onShift: (deltaDays: number) => void;
 onResizeStart: (deltaDays: number) => void;
 onResizeEnd: (deltaDays: number) => void;
 locked?: boolean;
}

function GanttBar({ entry, startDate, endDate, rangeStart, dayWidth, onClick, onShift, onResizeStart, onResizeEnd, locked }: GanttBarProps) {
 const [dragMode, setDragMode] = useState<"move" | "resize-start" | "resize-end" | null>(null);
 const [previewDelta, setPreviewDelta] = useState(0);
 const dragOriginX = useRef(0);
 const movedRef = useRef(false);

 useEffect(() => {
  if (!dragMode) return;
  function handleMove(e: PointerEvent) {
   const deltaPx = e.clientX - dragOriginX.current;
   if (Math.abs(deltaPx) > 3) movedRef.current = true;
   setPreviewDelta(Math.round(deltaPx / dayWidth));
  }
  function handleUp() {
   if (movedRef.current && previewDelta !== 0) {
    if (dragMode === "move") onShift(previewDelta);
    if (dragMode === "resize-start") onResizeStart(previewDelta);
    if (dragMode === "resize-end") onResizeEnd(previewDelta);
   } else if (dragMode === "move" && !movedRef.current) {
    onClick();
   }
   setDragMode(null);
   setPreviewDelta(0);
  }
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp, { once: true });
  return () => window.removeEventListener("pointermove", handleMove);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [dragMode, dayWidth, previewDelta]);

 function startDrag(mode: "move" | "resize-start" | "resize-end", e: React.PointerEvent) {
  e.stopPropagation();
  if (locked) return;
  dragOriginX.current = e.clientX;
  movedRef.current = false;
  setPreviewDelta(0);
  setDragMode(mode);
 }

 const previewStart = dragMode === "move" || dragMode === "resize-start" ? addDays(startDate, previewDelta) : startDate;
 const previewEnd = dragMode === "move" || dragMode === "resize-end" ? addDays(endDate, previewDelta) : endDate;
 const left = daysBetween(rangeStart, previewStart) * dayWidth;
 const width = Math.max(dayWidth, (daysBetween(previewStart, previewEnd) + 1) * dayWidth - 3);

 return (
  <div
   className="group/bar absolute top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-[var(--radius-xs)] bg-primary px-1.5 shadow-sm"
   style={{ left, width, height: 24, cursor: locked ? "pointer" : dragMode === "move" ? "grabbing" : "grab" }}
   onPointerDown={(e) => { if (locked) { onClick(); return; } startDrag("move", e); }}
  >
   {entry.icon ? (
    <PageIcon icon={entry.icon} size={11} className="shrink-0" />
   ) : (
    <FileText size={10} className="shrink-0 text-primary-foreground/70" />
   )}
   <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-primary-foreground">{entry.title || "Untitled"}</span>
   {!locked && (
    <div
     className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100"
     onPointerDown={(e) => startDrag("resize-start", e)}
    />
   )}
   {!locked && (
    <div
     className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100"
     onPointerDown={(e) => startDrag("resize-end", e)}
    />
   )}
  </div>
 );
}

export function TemplateGanttView({
 entries, properties, activeView, entryValueMap, databaseId, workspaceId, workspaceSlug, locked,
 onAddEntry, onDeleteEntry, onDuplicateEntry, onUpdateEntryIcon, onClickEntry, onUpdatePropValue, onUpdateProperty, onUpdateView,
}: Props) {
 const [scale, setScale] = useState<Scale>("week");
 const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
 const [rowMenu, setRowMenu] = useState<{ entry: TemplateEntry; rect: DOMRect } | null>(null);
 const scrollRef = useRef<HTMLDivElement>(null);
 const dayWidth = DAY_WIDTH[scale];

 const view = activeView as unknown as { ganttStartPropertyId?: string | null; ganttEndPropertyId?: string | null };
 const startProp = properties.find((p) => p.id === view.ganttStartPropertyId && p.type === "date");
 const endProp = properties.find((p) => p.id === view.ganttEndPropertyId && p.type === "date");

 const now = new Date();
 const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

 if (!startProp || !endProp) {
  return (
   <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
    <div className="flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-muted/40">
     <GanttChartSquare size={28} className="text-muted-foreground" />
    </div>
    <div>
     <p className="text-sm font-semibold text-foreground">No start/end date properties selected</p>
     <p className="mt-1 text-xs text-muted-foreground">
      Open the <strong>Start</strong> and <strong>End</strong> dropdowns in the toolbar and pick two Date properties to show entries on the Gantt timeline.
     </p>
    </div>
   </div>
  );
 }

 const bars = new Map<string, { start: Date; end: Date }>();
 for (const entry of entries) {
  const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
  const start = parseISODate((valMap.get(startProp.id) as { date?: string } | null)?.date);
  const end = parseISODate((valMap.get(endProp.id) as { date?: string } | null)?.date) ?? start;
  if (!start || !end) continue;
  bars.set(entry.id, start <= end ? { start, end } : { start: end, end: start });
 }

 const barDates = [...bars.values()];
 const earliest = barDates.length ? new Date(Math.min(...barDates.map((b) => b.start.getTime()))) : addDays(todayMidnight, -14);
 const latest = barDates.length ? new Date(Math.max(...barDates.map((b) => b.end.getTime()))) : addDays(todayMidnight, 60);
 const rangeStart = addDays(earliest < todayMidnight ? earliest : todayMidnight, -14);
 const rangeEnd = addDays(latest > todayMidnight ? latest : todayMidnight, 30);
 const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd));
 const timelineWidth = totalDays * dayWidth;

 useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  const todayOffset = daysBetween(rangeStart, todayMidnight) * dayWidth;
  el.scrollLeft = Math.max(0, todayOffset - el.clientWidth / 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [scale]);

 function goToday() {
  const el = scrollRef.current;
  if (!el) return;
  const todayOffset = daysBetween(rangeStart, todayMidnight) * dayWidth;
  el.scrollTo({ left: Math.max(0, todayOffset - el.clientWidth / 2), behavior: "smooth" });
 }
 function scrollBy(days: number) {
  scrollRef.current?.scrollBy({ left: days * dayWidth, behavior: "smooth" });
 }

 function commitShift(entryId: string, start: Date, end: Date, deltaDays: number) {
  if (locked) return;
  onUpdatePropValue(entryId, startProp!.id, { date: toISODate(addDays(start, deltaDays)) });
  onUpdatePropValue(entryId, endProp!.id, { date: toISODate(addDays(end, deltaDays)) });
 }
 function commitResizeStart(entryId: string, start: Date, end: Date, deltaDays: number) {
  if (locked) return;
  const next = addDays(start, deltaDays);
  onUpdatePropValue(entryId, startProp!.id, { date: toISODate(next <= end ? next : end) });
 }
 function commitResizeEnd(entryId: string, start: Date, end: Date, deltaDays: number) {
  if (locked) return;
  const next = addDays(end, deltaDays);
  onUpdatePropValue(entryId, endProp!.id, { date: toISODate(next >= start ? next : start) });
 }

 const dayTicks = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
 const monthBands: { label: string; days: number }[] = [];
 for (const d of dayTicks) {
  const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const last = monthBands[monthBands.length - 1];
  if (last && last.label === label) last.days += 1;
  else monthBands.push({ label, days: 1 });
 }

 const todayLeft = daysBetween(rangeStart, todayMidnight) * dayWidth;

 return (
  <>
   <div className="flex h-full flex-col overflow-hidden">
    {/* ── Header ── */}
    <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
     <h2 className="text-lg font-semibold tracking-tight text-foreground">Timeline</h2>
     <div className="flex items-center gap-1">
      <div className="mr-2 flex items-center rounded-[var(--radius-sm)] border border-border p-0.5">
       {(["day", "week", "month"] as Scale[]).map((s) => (
        <button
         key={s}
         onClick={() => setScale(s)}
         className={`rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium capitalize transition-colors ${scale === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
         {s}
        </button>
       ))}
      </div>
      <button onClick={() => scrollBy(-7)} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
       <ChevronLeft size={14} />
      </button>
      <button onClick={goToday} className="rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
       Today
      </button>
      <button onClick={() => scrollBy(7)} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
       <ChevronRight size={14} />
      </button>
     </div>
    </div>

    {/* ── Scrollable body ── */}
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
     <div style={{ width: SIDEBAR_W + timelineWidth, position: "relative" }}>
      <div className="sticky top-0 z-20 flex bg-background">
       <div className="sticky left-0 z-30 shrink-0 border-b border-r border-border bg-background" style={{ width: SIDEBAR_W, height: HEADER_H }} />
       <div style={{ width: timelineWidth }}>
        <div className="flex border-b border-border" style={{ height: HEADER_H / 2 }}>
         {monthBands.map((band, i) => (
          <div key={i} className="shrink-0 truncate border-r border-border px-2 text-xs font-medium text-muted-foreground" style={{ width: band.days * dayWidth, lineHeight: `${HEADER_H / 2}px` }}>
           {band.label}
          </div>
         ))}
        </div>
        <div className="flex border-b border-border" style={{ height: HEADER_H / 2 }}>
         {dayTicks.map((d, i) => {
          const isToday = daysBetween(todayMidnight, d) === 0;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
           <div
            key={i}
            className={`shrink-0 text-center text-[10px] tabular-nums leading-[26px] ${isToday ? "font-bold text-primary" : isWeekend ? "text-muted-foreground-subtle" : "text-muted-foreground"}`}
            style={{ width: dayWidth }}
           >
            {scale !== "month" ? d.getDate() : ""}
           </div>
          );
         })}
        </div>
       </div>
      </div>

      {entries.map((entry) => {
       const bar = bars.get(entry.id);
       return (
        <div key={entry.id} className="group/row flex border-b border-border hover:bg-muted/10" style={{ height: ROW_H }}>
         <div className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-border bg-background px-2.5" style={{ width: SIDEBAR_W }}>
          <button onClick={() => onClickEntry(entry.id)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left">
           {entry.icon ? <PageIcon icon={entry.icon} size={13} className="shrink-0" /> : <FileText size={12} className="shrink-0 text-muted-foreground" />}
           <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{entry.title || "Untitled"}</span>
          </button>
          <button
           onClick={(e) => setRowMenu({ entry, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
           className="hidden size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground group-hover/row:flex transition-colors"
          >
           <MoreHorizontal size={12} />
          </button>
         </div>
         <div className="relative shrink-0" style={{ width: timelineWidth }}>
          <div className="absolute inset-y-0 w-px bg-primary/40" style={{ left: todayLeft }} />
          {bar && (
           <GanttBar
            entry={entry}
            startDate={bar.start}
            endDate={bar.end}
            rangeStart={rangeStart}
            dayWidth={dayWidth}
            locked={locked}
            onClick={() => onClickEntry(entry.id)}
            onShift={(d) => commitShift(entry.id, bar.start, bar.end, d)}
            onResizeStart={(d) => commitResizeStart(entry.id, bar.start, bar.end, d)}
            onResizeEnd={(d) => commitResizeEnd(entry.id, bar.start, bar.end, d)}
           />
          )}
         </div>
        </div>
       );
      })}

      {!locked && (
       <div className="flex" style={{ height: ROW_H }}>
        <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border bg-background px-2.5" style={{ width: SIDEBAR_W }}>
         <button
          onClick={() => onAddEntry({
           [startProp.id]: { date: toISODate(todayMidnight) },
           [endProp.id]: { date: toISODate(todayMidnight) },
          })}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
         >
          <Plus size={12} />
          New
         </button>
        </div>
        <div style={{ width: timelineWidth }} />
       </div>
      )}
     </div>
    </div>
   </div>

   {rowMenu && (
    <EntryContextMenu
     entryId={rowMenu.entry.id}
     entryShortId={rowMenu.entry.shortId}
     entryIcon={rowMenu.entry.icon ?? null}
     updatedAt={rowMenu.entry.updatedAt ?? null}
     databaseId={databaseId}
     workspaceId={workspaceId}
     workspaceSlug={workspaceSlug}
     forcePos={{ x: rowMenu.rect.left, y: rowMenu.rect.bottom }}
     entryRect={rowMenu.rect}
     onClose={() => setRowMenu(null)}
     onIconChange={locked ? () => {} : (icon) => onUpdateEntryIcon?.(rowMenu.entry.id, icon)}
     onDelete={locked ? () => {} : () => setDeleteTarget(rowMenu.entry.id)}
     onDuplicate={!locked && onDuplicateEntry ? () => onDuplicateEntry(rowMenu.entry.id) : undefined}
     onValueChange={locked ? () => {} : (propId, value) => onUpdatePropValue(rowMenu.entry.id, propId, value)}
     onPropertyConfigChange={locked ? () => {} : onUpdateProperty}
     activeView={activeView as unknown as DbView | null}
     onUpdateView={locked ? undefined : onUpdateView}
    />
   )}

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
