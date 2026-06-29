"use client";

import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, ExternalLink, Link2, Copy, MoreHorizontal } from "lucide-react";
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
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function isoToLocalDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Entry context menu (inline portal for database chips) ─────────────────────
interface ChipMenuProps {
  entry:         DbEntry;
  workspaceSlug: string;
  forcePos:      { x: number; y: number } | null;
  onClose:       () => void;
  onDelete:      (entry: DbEntry) => void;
  onDuplicate?:  (id: string) => void;
  openMode:      string;
  onOpenEntry?:  (entry: DbEntry) => void;
}

function ChipContextMenu({ entry, workspaceSlug, forcePos, onClose, onDelete, onDuplicate, openMode, onOpenEntry }: ChipMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!forcePos) return;
    function h(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    }
    function preventWheel(e: WheelEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
    }
    document.addEventListener("mousedown", h);
    window.addEventListener("wheel", preventWheel, { passive: false });
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("wheel", preventWheel);
    };
  }, [forcePos, onClose]);

  if (!forcePos || typeof document === "undefined") return null;

  const W = 224;
  const VW = typeof window !== "undefined" ? window.innerWidth : 800;
  const VH = typeof window !== "undefined" ? window.innerHeight : 600;
  const left = Math.max(8, Math.min(forcePos.x, VW - W - 8));
  const estimatedH = 320;
  const top = forcePos.y + estimatedH > VH ? Math.max(8, forcePos.y - estimatedH) : forcePos.y + 4;
  const url = `/app/${workspaceSlug}/${entry.shortId}`;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top, left, zIndex: 9999, width: W }}
      className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-1">
        <div className="px-1.5 pb-1 pt-0.5">
          <input
            className="w-full rounded-[var(--radius-sm)] bg-muted/60 px-2 py-1 text-xs outline-none placeholder:text-muted-foreground/50"
            placeholder="Search actions..."
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="my-0.5 h-px bg-border/40" />

        <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">Page</p>

        {openMode === "side_panel" && onOpenEntry ? (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); onOpenEntry(entry); }}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <ExternalLink size={13} className="shrink-0 text-muted-foreground" />
            Open page
          </button>
        ) : (
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClose()}
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <ExternalLink size={13} className="shrink-0 text-muted-foreground" />
            Open page
          </Link>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (typeof window !== "undefined" && navigator.clipboard)
              navigator.clipboard.writeText(`${window.location.origin}${url}`).catch(() => {});
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
        >
          <Link2 size={13} className="shrink-0 text-muted-foreground" />
          Copy link
        </button>

        {onDuplicate && (
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(entry.id); onClose(); }}
            className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <span className="flex items-center gap-2.5"><Copy size={13} className="shrink-0 text-muted-foreground" />Duplicate</span>
            <span className="text-[10px] text-muted-foreground/40">Ctrl+D</span>
          </button>
        )}

        <div className="my-0.5 h-px bg-border/40" />

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(entry); onClose(); }}
          className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <span className="flex items-center gap-2.5"><Trash2 size={13} className="shrink-0" />Move to Trash</span>
          <span className="text-[10px] text-destructive/40">Del</span>
        </button>
      </div>

      {entry.updatedAt && (
        <div className="border-t border-border/40 px-3 py-2">
          <p className="text-[10px] text-muted-foreground/60">Last edited {fmtRelative(entry.updatedAt)}</p>
        </div>
      )}
    </div>,
    document.body,
  );
}

// ── DraggableChip ─────────────────────────────────────────────────────────────
interface DraggableChipProps {
  entry: DbEntry;
  workspaceSlug: string;
  openMode: string;
  isEditor: boolean;
  onOpenEntry?: (entry: DbEntry) => void;
  onDeleteClick: (entry: DbEntry) => void;
  onDuplicate?: (id: string) => void;
}

function DraggableChip({ entry, workspaceSlug, openMode, isEditor, onOpenEntry, onDeleteClick, onDuplicate }: DraggableChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entry.id });
  const [rightClickPos, setRightClickPos] = useState<{ x: number; y: number } | null>(null);
  const [showDots, setShowDots] = useState(false);
  const style = transform ? { transform: CSS.Translate.toString(transform) } : {};

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ ...style, opacity: isDragging ? 0 : 1, touchAction: "none", userSelect: "none" }}
        {...attributes}
        {...listeners}
        className="group/chip relative flex items-center rounded-[var(--radius-xs)] bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/20 cursor-pointer"
        onMouseEnter={() => setShowDots(true)}
        onMouseLeave={() => setShowDots(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRightClickPos({ x: e.clientX, y: e.clientY });
        }}
      >
        {openMode === "side_panel" && onOpenEntry ? (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenEntry(entry); }}
            className="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-[3px]"
          >
            {entry.icon && <span className="shrink-0 text-xs leading-none">{entry.icon}</span>}
            <span className="truncate">{entry.title || "Untitled"}</span>
          </button>
        ) : (
          <Link
            href={`/app/${workspaceSlug}/${entry.shortId}`}
            className="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-[3px]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {entry.icon && <span className="shrink-0 text-xs leading-none">{entry.icon}</span>}
            <span className="truncate">{entry.title || "Untitled"}</span>
          </Link>
        )}

        {isEditor && showDots && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setRightClickPos({ x: e.clientX, y: e.clientY }); }}
            className="mr-0.5 flex shrink-0 items-center justify-center rounded-[var(--radius-xs)] p-0.5 text-primary/70 hover:bg-primary/20 hover:text-primary transition-colors"
          >
            <MoreHorizontal size={10} />
          </button>
        )}
      </div>

      <ChipContextMenu
        entry={entry}
        workspaceSlug={workspaceSlug}
        forcePos={rightClickPos}
        onClose={() => setRightClickPos(null)}
        onDelete={onDeleteClick}
        onDuplicate={onDuplicate}
        openMode={openMode}
        onOpenEntry={onOpenEntry}
      />
    </>
  );
}

// ── DroppableDateCell ─────────────────────────────────────────────────────────
function DroppableDateCell({ dateKey, isOver, children, className }: { dateKey: string; isOver: boolean; children: React.ReactNode; className?: string }) {
  const { setNodeRef } = useDroppable({ id: dateKey });
  return (
    <div ref={setNodeRef} className={`${className ?? ""} ${isOver ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}>
      {children}
    </div>
  );
}

// ── CalendarView ──────────────────────────────────────────────────────────────
export function CalendarView({
  workspaceSlug, entries, properties, valueMap, activeView, isEditor, onCreateEntry, onDeleteEntry, onOpenEntry, onUpdateValue,
}: SharedViewProps) {
  const now   = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [morePopup, setMorePopup] = useState<{ key: string; x: number; y: number; entries: DbEntry[] } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const calPropId = activeView?.calendarPropertyId;
  const calProp   = properties.find((p) => p.id === calPropId && p.type === "date");

  if (!calProp) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
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
  const rows = cells.length / 7;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); }

  function handleDragStart(event: DragStartEvent) { setDraggingEntryId(String(event.active.id)); }
  function handleDragOver(event: DragOverEvent) { setOverDate(event.over?.id ? String(event.over.id) : null); }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingEntryId(null);
    setOverDate(null);
    if (!over || !calPropId) return;
    const newDate = String(over.id);
    const entryId = String(active.id);
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const val = valueMap.get(entryId)?.get(calPropId) as { date?: string | null } | null;
    if (newDate === val?.date) return;
    onUpdateValue(entryId, calPropId, { date: newDate });
  }

  function openMorePopup(key: string, dayEntries: DbEntry[], e: React.MouseEvent) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setMorePopup({ key, x: e.clientX, y: e.clientY, entries: dayEntries });
  }
  function scheduleCloseMore() { hoverTimer.current = setTimeout(() => setMorePopup(null), 150); }
  function cancelCloseMore() { if (hoverTimer.current) clearTimeout(hoverTimer.current); }

  const draggingEntry = draggingEntryId ? entries.find((e) => e.id === draggingEntryId) : null;
  const openMode = activeView?.entryOpenMode ?? "side_panel";

  return (
    <>
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
    <div className="flex h-full flex-col overflow-hidden bg-background">

      {/* ── Navigation header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={goToday}
            className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors ${isCurrentMonth ? "text-muted-foreground hover:bg-accent hover:text-foreground" : "text-foreground font-semibold hover:bg-accent"}`}
          >
            Today
          </button>
          <button onClick={nextMonth} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Day-of-week header ── */}
      <div className="grid shrink-0 grid-cols-7 border-b border-border/60">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground/60">{d}</div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {cells.map((day, idx) => {
          if (!day) {
            const isLastRow = Math.floor(idx / 7) === rows - 1;
            const isLastCol = (idx % 7) === 6;
            return (
              <div
                key={`empty-${idx}`}
                className={`bg-muted/5 ${!isLastRow ? "border-b border-border/60" : ""} ${!isLastCol ? "border-r border-border/60" : ""}`}
              />
            );
          }

          const key        = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = dateMap.get(key) ?? [];
          const isToday    = key === todayKey;
          const SHOW = 3;
          const shown = dayEntries.slice(0, SHOW);
          const extra = dayEntries.length - shown.length;
          const isLastRow  = Math.floor(idx / 7) === rows - 1;
          const isLastCol  = (idx % 7) === 6;
          const isSunSat   = (idx % 7) === 0 || (idx % 7) === 6;

          const cellCls = [
            "group/cell relative flex flex-col overflow-hidden transition-colors",
            isToday ? "bg-accent/30" : isSunSat ? "bg-muted/5 hover:bg-muted/10" : "bg-background hover:bg-muted/10",
            !isLastRow ? "border-b border-border/60" : "",
            !isLastCol ? "border-r border-border/60" : "",
          ].join(" ");

          return (
            <DroppableDateCell key={key} dateKey={key} isOver={overDate === key} className={cellCls}>
              <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
                <span className={[
                  "flex size-[22px] items-center justify-center rounded-full text-xs font-semibold tabular-nums select-none",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground/60",
                ].join(" ")}>
                  {day}
                </span>
                {isEditor && (
                  <button
                    onClick={() => onCreateEntry({ [calPropId!]: { date: key } })}
                    className="hidden size-5 items-center justify-center rounded text-muted-foreground/50 hover:bg-primary/10 hover:text-primary group-hover/cell:flex transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-0.5 px-1 pb-1">
                {shown.map((entry) => (
                  <DraggableChip
                    key={entry.id}
                    entry={entry}
                    workspaceSlug={workspaceSlug}
                    openMode={openMode}
                    isEditor={isEditor}
                    onOpenEntry={onOpenEntry}
                    onDeleteClick={(e) => setDeleteTarget({ id: e.id, title: e.title ?? "" })}
                  />
                ))}
                {extra > 0 && (
                  <button
                    onMouseEnter={(e) => openMorePopup(key, dayEntries, e)}
                    onMouseLeave={scheduleCloseMore}
                    className="px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    +{extra} more
                  </button>
                )}
              </div>
            </DroppableDateCell>
          );
        })}
      </div>

      {/* ── "+N more" hover popup ── */}
      {morePopup && typeof window !== "undefined" && createPortal(
        (() => {
          const POPUP_W = 220;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const showAbove = morePopup.y > vh * 0.62;
          const left = Math.min(morePopup.x + 4, vw - POPUP_W - 8);
          const posStyle: React.CSSProperties = showAbove
            ? { position: "fixed", bottom: vh - morePopup.y + 8, left, zIndex: 9999, width: POPUP_W }
            : { position: "fixed", top: morePopup.y + 16, left, zIndex: 9999, width: POPUP_W };
          const [ey, em, ed] = morePopup.key.split("-").map(Number);
          return (
            <div
              style={posStyle}
              onMouseEnter={cancelCloseMore}
              onMouseLeave={scheduleCloseMore}
              className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover"
            >
              <div className="border-b border-border/40 px-3 py-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {MONTHS_SHORT[em - 1]} {ed}, {ey}
                </span>
              </div>
              <div className="max-h-[220px] overflow-y-auto p-1">
                {morePopup.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group/pe flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => { if (openMode === "side_panel" && onOpenEntry) onOpenEntry(entry); setMorePopup(null); }}
                  >
                    {entry.icon && <span className="shrink-0 text-xs">{entry.icon}</span>}
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{entry.title || "Untitled"}</span>
                    {isEditor && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: entry.id, title: entry.title ?? "" }); setMorePopup(null); }}
                        className="hidden size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover/pe:flex transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })(),
        document.body,
      )}
    </div>

    <DragOverlay dropAnimation={null}>
      {draggingEntry && (
        <div className="flex items-center gap-1 rounded-[var(--radius-xs)] bg-primary px-1.5 py-[3px] text-xs font-medium text-primary-foreground cursor-grabbing">
          {draggingEntry.icon && <span className="shrink-0 text-xs leading-none">{draggingEntry.icon}</span>}
          <span className="max-w-[120px] truncate">{draggingEntry.title || "Untitled"}</span>
        </div>
      )}
    </DragOverlay>
    </DndContext>

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
