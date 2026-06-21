"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, Plus, X } from "@phosphor-icons/react";
import type { SharedViewProps } from "@/components/database/types";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isoToLocalDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// Entry chip colour palette — cycles by entry index
const CHIP_COLORS = [
  "bg-primary/12 text-primary hover:bg-primary/20",
  "bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950/40 dark:text-violet-300",
  "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
];

export function CalendarView({
  workspaceSlug, entries, properties, valueMap, activeView, isEditor, onCreateEntry, onDeleteEntry, onOpenEntry,
}: SharedViewProps) {
  const now   = new Date();
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [hoveredDay, setHoveredDay]   = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [confirmId, setConfirmId]     = useState<string | null>(null);

  const calPropId = activeView?.calendarPropertyId;
  const calProp   = properties.find((p) => p.id === calPropId && p.type === "date");

  if (!calProp) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-8">
        <div className="flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-muted/40">
          <svg className="size-7 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
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
    <div className="flex h-full flex-col overflow-hidden bg-background">

      {/* ── Month navigation ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-5 py-2.5">
        <button
          onClick={prevMonth}
          className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <CaretLeft size={14} weight="bold" />
        </button>

        <h2 className="min-w-[152px] text-center text-sm font-bold tracking-tight text-foreground">
          {MONTHS[month]} {year}
        </h2>

        <button
          onClick={nextMonth}
          className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <CaretRight size={14} weight="bold" />
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
          <span className="tabular-nums font-semibold text-foreground/50">
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
            className="py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40"
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
                "group/cell relative flex min-h-[100px] flex-col border-b border-r border-border/30 p-2 transition-colors",
                isToday   ? "bg-primary/[0.04]" : "",
                isHovered && !isToday ? "bg-muted/30" : "",
                isSunday || isSaturday ? "bg-muted/[0.03]" : "",
              ].filter(Boolean).join(" ")}
            >
              {/* Day number + add button row */}
              <div className="mb-1.5 flex items-center justify-between">
                <span className={[
                  "flex size-[22px] items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/50 group-hover/cell:text-foreground/80",
                ].join(" ")}>
                  {day}
                </span>

                {/* Add entry — visible on hover OR when cell is empty and it's today */}
                {isEditor && (
                  <button
                    onClick={() => onCreateEntry({ [calPropId!]: { date: key } })}
                    title={`Add entry on ${MONTHS[month]} ${day}`}
                    className={[
                      "flex size-[18px] items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/40 transition-all hover:bg-primary/10 hover:text-primary",
                      isHovered ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                  >
                    <Plus size={11} weight="bold" />
                  </button>
                )}
              </div>

              {/* Entry chips */}
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEntries.slice(0, 3).map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`group/chip relative flex items-center rounded-md text-xs font-medium transition-colors ${CHIP_COLORS[i % CHIP_COLORS.length]}`}
                  >
                    {(activeView?.entryOpenMode ?? "side_panel") === "side_panel" && onOpenEntry ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenEntry(entry); }}
                        title={entry.title || "Untitled"}
                        className="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-[3px]"
                      >
                        {entry.icon && (
                          <span className="shrink-0 text-[10px] leading-none">{entry.icon}</span>
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
                          <span className="shrink-0 text-[10px] leading-none">{entry.icon}</span>
                        )}
                        <span className="truncate">{entry.title || "Untitled"}</span>
                      </Link>
                    )}

                    {/* Delete button — shown on chip hover */}
                    {isEditor && confirmId !== entry.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmId(entry.id); }}
                        title="Delete entry"
                        className="mr-0.5 hidden shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100 group-hover/chip:flex"
                      >
                        <X size={9} weight="bold" />
                      </button>
                    )}

                    {/* Confirm pill */}
                    {confirmId === entry.id && (
                      <div className="absolute inset-0 z-10 flex items-center justify-between gap-1 rounded-[var(--radius-sm)] bg-destructive/10 px-1.5">
                        <span className="truncate text-[10px] font-semibold text-destructive">
                          Delete?
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <button
                            disabled={deletingId === entry.id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDeletingId(entry.id);
                              await onDeleteEntry(entry.id);
                              setDeletingId(null);
                              setConfirmId(null);
                            }}
                            className="rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[10px] font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                          >
                            {deletingId === entry.id ? "…" : "Yes"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmId(null); }}
                            className="rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {dayEntries.length > 3 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/50">
                    +{dayEntries.length - 3} more
                  </span>
                )}
              </div>

              {/* "Click to add" hint for empty cells on hover */}
              {isEditor && dayEntries.length === 0 && isHovered && (
                <button
                  onClick={() => onCreateEntry({ [calPropId!]: { date: key } })}
                  className="mt-auto flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 text-[10px] text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
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
  );
}
