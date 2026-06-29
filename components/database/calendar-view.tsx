"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from "lucide-react";
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
import type { SharedViewProps, DbEntry } from "@/components/database/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isoToLocalDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// Entry chip colour palette — design system tokens, cycles by entry index
const CHIP_COLORS = [
  "bg-primary/10 text-primary hover:bg-primary/15",
  "bg-success/10 text-success hover:bg-success/15",
  "bg-warning/10 text-warning hover:bg-warning/15",
  "bg-muted text-muted-foreground hover:bg-accent",
];

// ── DraggableChip ─────────────────────────────────────────────────────────────
interface DraggableChipProps {
  entry: DbEntry;
  colorClass: string;
  workspaceSlug: string;
  openMode: string;
  hoveredChipId: string | null;
  isEditor: boolean;
  onOpenEntry?: (entry: DbEntry) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
  onDeleteClick: (entry: DbEntry) => void;
}

function DraggableChip({
  entry, colorClass, workspaceSlug, openMode, hoveredChipId, isEditor,
  onOpenEntry, onHoverEnter, onHoverLeave, onDeleteClick,
}: DraggableChipProps) {
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
      className={`relative flex items-center rounded-[var(--radius-xs)] text-xs font-medium transition-colors ${colorClass}`}
      onMouseEnter={() => onHoverEnter(entry.id)}
      onMouseLeave={onHoverLeave}
    >
      {openMode === "side_panel" && onOpenEntry ? (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenEntry(entry); }}
          title={entry.title || "Untitled"}
          className="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-[3px]"
        >
          {entry.icon && (
            <span className="shrink-0 text-xs leading-none">{entry.icon}</span>
          )}
          <span className="truncate">{entry.title || "Untitled"}</span>
        </button>
      ) : (
        <Link
          href={`/app/${workspaceSlug}/${entry.shortId}`}
          title={entry.title || "Untitled"}
          className="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-[3px]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {entry.icon && (
            <span className="shrink-0 text-xs leading-none">{entry.icon}</span>
          )}
          <span className="truncate">{entry.title || "Untitled"}</span>
        </Link>
      )}

      {/* Delete button — shown on chip hover */}
      {isEditor && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDeleteClick(entry); }}
          title="Delete entry"
          className="mr-0.5 shrink-0 rounded-[var(--radius-xs)] p-0.5 transition-opacity duration-150 hover:opacity-100"
          style={{ display: hoveredChipId === entry.id ? "flex" : "none" }}
        >
          <X size={9} />
        </button>
      )}
    </div>
  );
}

// ── DroppableDateCell ─────────────────────────────────────────────────────────
interface DroppableDateCellProps {
  dateKey: string;
  isOver: boolean;
  children: React.ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function DroppableDateCell({ dateKey, isOver, children, className, onMouseEnter, onMouseLeave }: DroppableDateCellProps) {
  const { setNodeRef } = useDroppable({ id: dateKey });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

export function CalendarView({
  workspaceSlug, entries, properties, valueMap, activeView, isEditor, onCreateEntry, onDeleteEntry, onOpenEntry, onUpdateValue,
}: SharedViewProps) {
  const now   = new Date();
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [hoveredDay, setHoveredDay]   = useState<string | null>(null);
  const [hoveredChipId, setHoveredChipId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const calPropId = activeView?.calendarPropertyId;
  const calProp   = properties.find((p) => p.id === calPropId && p.type === "date");

  if (!calProp) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-8">
        <div className="flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-muted/40">
          <Calendar size={28} className="text-muted-foreground/70" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No date property selected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open the <strong>Date</strong> dropdown in the toolbar and pick a Date property to show entries on the calendar.
          </p>
        </div>
      </div>
    );
  }

  // date string (yyyy-mm-dd) → entries
  const dateMap = new Map<string, typeof entries>();
  for (const entry of entries) {
    const val = valueMap.get(entry.id)?.get(calPropId!) as { date?: string | null } | null;
    const iso = val?.date;
    if (!iso) continue;
    const d = isoToLocalDate(iso);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dateMap.has(key)) dateMap.set(key, []);
    dateMap.get(key)!.push(entry);
  }

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); }

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

    if (!over || !calPropId) return;
    const newDate = String(over.id);

    const entryId = String(active.id);
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    // Find current date to avoid redundant updates
    const val = valueMap.get(entryId)?.get(calPropId) as { date?: string | null } | null;
    const currentDate = val?.date;
    if (newDate === currentDate) return;

    onUpdateValue(entryId, calPropId, { date: newDate });
  }

  const draggingEntry = draggingEntryId ? entries.find((e) => e.id === draggingEntryId) : null;
  const openMode = activeView?.entryOpenMode ?? "side_panel";

  return (
    <>
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
    <div className="flex h-full flex-col overflow-hidden bg-background">

      {/* ── Month navigation ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-5 py-2.5">
        <button
          onClick={prevMonth}
          className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft size={14} />
        </button>

        <h2 className="min-w-[152px] text-center text-sm font-bold tracking-tight text-foreground">
          {MONTHS[month]} {year}
        </h2>

        <button
          onClick={nextMonth}
          className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight size={14} />
        </button>

        {!isCurrentMonth && (
          <button
            onClick={goToday}
            className="ml-2 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Today
          </button>
        )}

        {/* Total entries this month */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <span className="tabular-nums font-semibold text-foreground/70">
            {[...dateMap.values()].flat().length}
          </span>
          <span>entries this month</span>
        </div>
      </div>

      {/* ── Day-of-week header ── */}
      <div className="grid shrink-0 grid-cols-7 border-b border-border/60">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground/70"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div
        className="grid flex-1 grid-cols-7 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${cells.length / 7}, 1fr)` }}
      >
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="border-b border-r border-border/60 bg-muted/5"
              />
            );
          }

          const key        = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = dateMap.get(key) ?? [];
          const isToday    = key === todayKey;
          const isHovered  = hoveredDay === key && !draggingEntryId;
          const isSunday   = (idx % 7) === 0;
          const isSaturday = (idx % 7) === 6;

          const baseCellClass = [
            "relative flex flex-col border-b border-r border-border/60 p-2 transition-colors",
            isToday && overDate !== key ? "bg-accent" : "",
            isHovered && !isToday ? "bg-muted/20" : "",
            isSunday || isSaturday ? "" : "",
          ].filter(Boolean).join(" ");

          return (
            <DroppableDateCell
              key={key}
              dateKey={key}
              isOver={overDate === key}
              className={baseCellClass}
              onMouseEnter={() => setHoveredDay(key)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Day number + add button row */}
              <div className="mb-1.5 flex items-center justify-between">
                <span className={[
                  "flex size-[22px] items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold tabular-nums transition-colors",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : isHovered ? "text-foreground/80" : "text-foreground/70",
                ].join(" ")}>
                  {day}
                </span>

                {/* Add entry — visible on hover OR when cell is empty and it's today */}
                {isEditor && (
                  <button
                    onClick={() => onCreateEntry({ [calPropId!]: { date: key } })}
                    title={`Add entry on ${MONTHS[month]} ${day}`}
                    className={[
                      "flex size-[18px] items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/70 transition-colors duration-150 hover:bg-accent hover:text-foreground",
                      isHovered ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                  >
                    <Plus size={11} />
                  </button>
                )}
              </div>

              {/* Entry chips */}
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEntries.slice(0, 3).map((entry, i) => (
                  <DraggableChip
                    key={entry.id}
                    entry={entry}
                    colorClass={CHIP_COLORS[i % CHIP_COLORS.length]}
                    workspaceSlug={workspaceSlug}
                    openMode={openMode}
                    hoveredChipId={hoveredChipId}
                    isEditor={isEditor}
                    onOpenEntry={onOpenEntry}
                    onHoverEnter={(id) => setHoveredChipId(id)}
                    onHoverLeave={() => setHoveredChipId(null)}
                    onDeleteClick={(e) => { setHoveredChipId(null); setDeleteTarget({ id: e.id, title: e.title ?? "" }); }}
                  />
                ))}

                {dayEntries.length > 3 && (
                  <span className="px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    +{dayEntries.length - 3} more
                  </span>
                )}
              </div>

              {/* "Click to add" hint for empty cells on hover */}
              {isEditor && dayEntries.length === 0 && isHovered && (
                <button
                  onClick={() => onCreateEntry({ [calPropId!]: { date: key } })}
                  className="mt-auto flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 text-xs text-muted-foreground/70 transition-colors hover:bg-accent hover:text-muted-foreground"
                >
                  <Plus size={9} />
                  <span>Add entry</span>
                </button>
              )}
            </DroppableDateCell>
          );
        })}
      </div>
    </div>

    {/* ── DragOverlay ────────────────────────────────────────────────────────── */}
    <DragOverlay dropAnimation={null}>
      {draggingEntry && (
        <div className="flex items-center gap-1 rounded-[var(--radius-xs)] bg-primary px-1.5 py-[3px] text-xs font-medium text-primary-foreground shadow-md cursor-grabbing">
          {draggingEntry.icon && (
            <span className="shrink-0 text-xs leading-none">{draggingEntry.icon}</span>
          )}
          <span className="max-w-[120px] truncate">{draggingEntry.title || "Untitled"}</span>
        </div>
      )}
    </DragOverlay>
    </DndContext>

    <ConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(o) => !o && setDeleteTarget(null)}
      title="Delete entry?"
      description={<><span className="font-medium">&ldquo;{deleteTarget?.title || "Untitled"}&rdquo;</span> and all its content will be permanently deleted. This action cannot be undone.</>}
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
