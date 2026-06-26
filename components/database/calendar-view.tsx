"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from "lucide-react";
import type { SharedViewProps } from "@/components/database/types";
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

export function CalendarView({
  workspaceSlug, entries, properties, valueMap, activeView, isEditor, onCreateEntry, onDeleteEntry, onOpenEntry,
}: SharedViewProps) {
  const now   = new Date();
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [hoveredDay, setHoveredDay]   = useState<string | null>(null);
  const [hoveredChipId, setHoveredChipId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

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

  return (
    <>
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
      <div className="grid shrink-0 grid-cols-7 border-b border-border/50">
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
      <div className="grid flex-1 grid-cols-7 overflow-auto">
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="border-b border-r border-border/30 bg-muted/5"
              />
            );
          }

          const key        = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = dateMap.get(key) ?? [];
          const isToday    = key === todayKey;
          const isHovered  = hoveredDay === key;
          const isSunday   = (idx % 7) === 0;
          const isSaturday = (idx % 7) === 6;

          return (
            <div
              key={key}
              onMouseEnter={() => setHoveredDay(key)}
              onMouseLeave={() => setHoveredDay(null)}
              className={[
                "relative flex min-h-[100px] flex-col border-b border-r border-border/30 p-2 transition-colors",
                isToday   ? "bg-accent" : "",
                isHovered && !isToday ? "bg-muted/20" : "",
                isSunday || isSaturday ? "" : "",
              ].filter(Boolean).join(" ")}
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
                  <div
                    key={entry.id}
                    className={`relative flex items-center rounded-[var(--radius-xs)] text-xs font-medium transition-colors ${CHIP_COLORS[i % CHIP_COLORS.length]}`}
                    onMouseEnter={() => setHoveredChipId(entry.id)}
                    onMouseLeave={() => setHoveredChipId(null)}
                  >
                    {(activeView?.entryOpenMode ?? "side_panel") === "side_panel" && onOpenEntry ? (
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
                        onClick={(e) => { e.stopPropagation(); setHoveredChipId(null); setDeleteTarget({ id: entry.id, title: entry.title ?? "" }); }}
                        title="Delete entry"
                        className="mr-0.5 shrink-0 rounded-[var(--radius-xs)] p-0.5 transition-opacity duration-150 hover:opacity-100"
                        style={{ display: hoveredChipId === entry.id ? "flex" : "none" }}
                      >
                        <X size={9} />
                      </button>
                    )}
                  </div>
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
            </div>
          );
        })}
      </div>
    </div>

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
