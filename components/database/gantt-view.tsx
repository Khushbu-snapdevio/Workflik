"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, FileText, MoreHorizontal, GanttChartSquare } from "lucide-react";
import type { SharedViewProps, DbEntry } from "@/components/database/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntryContextMenu } from "@/components/database/entry-context-menu";
import { PageIcon } from "@/components/pages/page-icon";

// ── Date helpers (plain local-midnight dates, yyyy-MM-dd strings — same
//    convention `DateValue`/calendar-view.tsx use) ──────────────────────────

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

// ── GanttBar ──────────────────────────────────────────────────────────────────
// Raw pointer-drag (not dnd-kit) — a Gantt bar moves continuously along a
// pixel axis rather than snapping to discrete droppable targets the way a
// calendar day-cell does, so a free-form drag is the simpler fit here.
interface GanttBarProps {
  entry: DbEntry;
  startDate: Date;
  endDate: Date;
  rangeStart: Date;
  dayWidth: number;
  openMode: string;
  workspaceSlug: string;
  onOpenEntry?: (entry: DbEntry) => void;
  onShift: (deltaDays: number) => void;
  onResizeStart: (deltaDays: number) => void;
  onResizeEnd: (deltaDays: number) => void;
}

function GanttBar({ entry, startDate, endDate, rangeStart, dayWidth, openMode, workspaceSlug, onOpenEntry, onShift, onResizeStart, onResizeEnd }: GanttBarProps) {
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
      } else if (dragMode === "move" && !movedRef.current && onOpenEntry && openMode === "side_panel") {
        onOpenEntry(entry);
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
    dragOriginX.current = e.clientX;
    movedRef.current = false;
    setPreviewDelta(0);
    setDragMode(mode);
  }

  const previewStart = dragMode === "move" || dragMode === "resize-start" ? addDays(startDate, previewDelta) : startDate;
  const previewEnd = dragMode === "move" || dragMode === "resize-end" ? addDays(endDate, previewDelta) : endDate;
  const left = daysBetween(rangeStart, previewStart) * dayWidth;
  const width = Math.max(dayWidth, (daysBetween(previewStart, previewEnd) + 1) * dayWidth - 3);

  const inner = (
    <>
      {entry.icon ? (
        <PageIcon icon={entry.icon} size={12} className="shrink-0" />
      ) : (
        <FileText size={10} className="shrink-0 text-primary-foreground/70" />
      )}
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-primary-foreground">{entry.title || "Untitled"}</span>
    </>
  );

  return (
    <div
      className="group/bar absolute top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-[var(--radius-xs)] bg-primary px-1.5 shadow-sm"
      style={{ left, width, height: 24, cursor: dragMode === "move" ? "grabbing" : "grab" }}
      onPointerDown={(e) => startDrag("move", e)}
    >
      {openMode === "side_panel" || !onOpenEntry ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">{inner}</div>
      ) : (
        <Link href={`/app/${workspaceSlug}/${entry.shortId}`} className="flex min-w-0 flex-1 items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          {inner}
        </Link>
      )}
      <div
        className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100"
        onPointerDown={(e) => startDrag("resize-start", e)}
      />
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100"
        onPointerDown={(e) => startDrag("resize-end", e)}
      />
    </div>
  );
}

// ── GanttView ─────────────────────────────────────────────────────────────────
export function GanttView({
  databaseId, workspaceId, workspaceSlug, entries, properties, valueMap, activeView, isEditor,
  onCreateEntry, onDeleteEntry, onDuplicateEntry, onOpenEntry, onUpdateValue, onUpdateEntryIcon, onUpdateProperty, onUpdateView,
}: SharedViewProps) {
  const [scale, setScale] = useState<Scale>("week");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ entry: DbEntry; rect: DOMRect } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayWidth = DAY_WIDTH[scale];

  const startPropId = activeView?.ganttStartPropertyId;
  const endPropId = activeView?.ganttEndPropertyId;
  const startProp = properties.find((p) => p.id === startPropId && p.type === "date");
  const endProp = properties.find((p) => p.id === endPropId && p.type === "date");

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!startProp || !endProp) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-muted/40">
          <GanttChartSquare size={28} className="text-muted-foreground/70" />
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

  // Bar dates, keyed by entry id — entries missing either date are excluded
  // from the timeline body (still visible via every other view).
  const bars = new Map<string, { start: Date; end: Date }>();
  for (const entry of entries) {
    const startVal = valueMap.get(entry.id)?.get(startProp.id) as { date?: string | null } | null;
    const endVal = valueMap.get(entry.id)?.get(endProp.id) as { date?: string | null } | null;
    const start = parseISODate(startVal?.date);
    const end = parseISODate(endVal?.date) ?? start;
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

  // Center the viewport on today on first mount / scale change.
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

  function commitShift(entry: DbEntry, start: Date, end: Date, deltaDays: number) {
    onUpdateValue(entry.id, startProp!.id, { date: toISODate(addDays(start, deltaDays)) });
    onUpdateValue(entry.id, endProp!.id, { date: toISODate(addDays(end, deltaDays)) });
  }
  function commitResizeStart(entry: DbEntry, start: Date, end: Date, deltaDays: number) {
    const next = addDays(start, deltaDays);
    onUpdateValue(entry.id, startProp!.id, { date: toISODate(next <= end ? next : end) });
  }
  function commitResizeEnd(entry: DbEntry, start: Date, end: Date, deltaDays: number) {
    const next = addDays(end, deltaDays);
    onUpdateValue(entry.id, endProp!.id, { date: toISODate(next >= start ? next : start) });
  }

  // Month bands + day ticks for the sticky header, computed once per range/scale.
  const dayTicks = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
  const monthBands: { label: string; days: number }[] = [];
  for (const d of dayTicks) {
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const last = monthBands[monthBands.length - 1];
    if (last && last.label === label) last.days += 1;
    else monthBands.push({ label, days: 1 });
  }

  const openMode = activeView?.entryOpenMode ?? "side_panel";
  const todayLeft = daysBetween(rangeStart, todayMidnight) * dayWidth;

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden bg-card">
        {/* ── Navigation header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2">
          <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
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
            <button onClick={goToday} className="rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              Today
            </button>
            <button onClick={() => scrollBy(7)} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body: sticky sidebar column + sticky header row ── */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
          <div style={{ width: SIDEBAR_W + timelineWidth, position: "relative" }}>
            {/* Header */}
            <div className="sticky top-0 z-20 flex bg-background">
              <div className="sticky left-0 z-30 shrink-0 border-b border-r border-border/60 bg-background" style={{ width: SIDEBAR_W, height: HEADER_H }} />
              <div style={{ width: timelineWidth }}>
                <div className="flex border-b border-border/40" style={{ height: HEADER_H / 2 }}>
                  {monthBands.map((band, i) => (
                    <div key={i} className="shrink-0 truncate border-r border-border/40 px-2 text-xs font-medium text-muted-foreground/70" style={{ width: band.days * dayWidth, lineHeight: `${HEADER_H / 2}px` }}>
                      {band.label}
                    </div>
                  ))}
                </div>
                <div className="flex border-b border-border/60" style={{ height: HEADER_H / 2 }}>
                  {dayTicks.map((d, i) => {
                    const isToday = daysBetween(todayMidnight, d) === 0;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={`shrink-0 text-center text-[10px] tabular-nums leading-[26px] ${isToday ? "font-bold text-primary" : isWeekend ? "text-muted-foreground/40" : "text-muted-foreground/70"}`}
                        style={{ width: dayWidth }}
                      >
                        {scale !== "month" ? d.getDate() : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rows */}
            {entries.map((entry) => {
              const bar = bars.get(entry.id);
              return (
                <div key={entry.id} className="group/row flex border-b border-border/40 hover:bg-muted/10" style={{ height: ROW_H }}>
                  <div className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-border/60 bg-background px-2.5" style={{ width: SIDEBAR_W }}>
                    {openMode === "side_panel" && onOpenEntry ? (
                      <button onClick={() => onOpenEntry(entry)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left">
                        {entry.icon ? <PageIcon icon={entry.icon} size={13} className="shrink-0" /> : <FileText size={12} className="shrink-0 text-muted-foreground/60" />}
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{entry.title || "Untitled"}</span>
                      </button>
                    ) : (
                      <Link href={`/app/${workspaceSlug}/${entry.shortId}`} className="flex min-w-0 flex-1 items-center gap-1.5 py-1">
                        {entry.icon ? <PageIcon icon={entry.icon} size={13} className="shrink-0" /> : <FileText size={12} className="shrink-0 text-muted-foreground/60" />}
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{entry.title || "Untitled"}</span>
                      </Link>
                    )}
                    {isEditor && (
                      <button
                        onClick={(e) => setRowMenu({ entry, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                        className="hidden size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground group-hover/row:flex transition-colors"
                      >
                        <MoreHorizontal size={12} />
                      </button>
                    )}
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
                        openMode={openMode}
                        workspaceSlug={workspaceSlug}
                        onOpenEntry={onOpenEntry}
                        onShift={(d) => commitShift(entry, bar.start, bar.end, d)}
                        onResizeStart={(d) => commitResizeStart(entry, bar.start, bar.end, d)}
                        onResizeEnd={(d) => commitResizeEnd(entry, bar.start, bar.end, d)}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* "+ New" row */}
            {isEditor && (
              <div className="flex" style={{ height: ROW_H }}>
                <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border/60 bg-background px-2.5" style={{ width: SIDEBAR_W }}>
                  <button
                    onClick={() => onCreateEntry({
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
          onIconChange={(icon) => onUpdateEntryIcon?.(rowMenu.entry.id, icon)}
          onDelete={() => setDeleteTarget({ id: rowMenu.entry.id, title: rowMenu.entry.title ?? "" })}
          onDuplicate={onDuplicateEntry ? () => onDuplicateEntry(rowMenu.entry.id) : undefined}
          onOpenEntry={openMode === "side_panel" && onOpenEntry ? () => onOpenEntry(rowMenu.entry) : undefined}
          onValueChange={(propId, value) => onUpdateValue(rowMenu.entry.id, propId, value)}
          onPropertyConfigChange={onUpdateProperty}
          activeView={activeView}
          onUpdateView={onUpdateView}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete entry?"
        description={<><span className="font-medium">&ldquo;{deleteTarget?.title || "Untitled"}&rdquo;</span> will be permanently deleted. This cannot be undone.</>}
        confirmLabel="Delete"
        confirmLoadingLabel="Deleting…"
        loading={deletingEntry}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeletingEntry(true);
          await onDeleteEntry(deleteTarget.id);
          setDeletingEntry(false);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
