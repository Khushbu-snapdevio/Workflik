"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretLeftIcon, CaretRightIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const SHOW_MAX = 2;

type DateVal = { date?: string };

interface Props {
  entries:       TemplateEntry[];
  properties:    DatabaseProperty[];
  activeView:    DatabaseView;
  entryValueMap: Map<string, Map<string, unknown>>;
  year:          number;
  month:         number;
  onYearChange:  (y: number) => void;
  onMonthChange: (m: number) => void;
  onAddEntry:    (defaultValues?: Record<string, unknown>) => void;
  onDeleteEntry: (entryId: string) => void;
  onClickEntry:  (entryId: string) => void;
}

export function TemplateCalendarView({
  entries, properties, activeView, entryValueMap,
  year, month, onYearChange, onMonthChange,
  onAddEntry, onDeleteEntry, onClickEntry,
}: Props) {
  const today = new Date();

  // Fall back to first date property if the view doesn't have one pinned yet
  const calProp = properties.find((p) => p.id === activeView.calendarPropertyId)
    ?? properties.find((p) => p.type === "date");

  function pad(n: number) { return String(n).padStart(2, "0"); }
  function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const dateMap = new Map<string, TemplateEntry[]>();
  for (const entry of entries) {
    const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
    const raw    = calProp ? valMap.get(calProp.id) : undefined;
    if (raw && typeof raw === "object") {
      const dv = raw as DateVal;
      if (dv.date) {
        if (!dateMap.has(dv.date)) dateMap.set(dv.date, []);
        dateMap.get(dv.date)!.push(entry);
      }
    }
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();

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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-6 py-4">
        <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <CaretLeftIcon size={14} />
          </button>
          <button onClick={goToday} className="rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            Today
          </button>
          <button onClick={goNext} className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <CaretRightIcon size={14} />
          </button>
        </div>
      </div>

      {/* ── Day-of-week headers ───────────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-7 border-b border-border/40 bg-muted/20">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            {d.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows:    `repeat(${rows}, 1fr)`,
        }}
      >
        {cells.map((day, i) => {
          const key       = day !== null ? dateKey(year, month, day) : null;
          const isToday   = key === todayKey;
          const events    = key ? (dateMap.get(key) ?? []) : [];
          const shown     = events.slice(0, SHOW_MAX);
          const extra     = events.length - shown.length;
          const isLastRow = Math.floor(i / 7) === rows - 1;
          const isLastCol = (i % 7) === 6;

          return (
            <div
              key={i}
              className={[
                "group relative flex flex-col p-1.5 transition-colors",
                day === null ? "bg-muted/10" : "bg-background hover:bg-accent/20",
                !isLastRow ? "border-b border-border/30" : "",
                !isLastCol ? "border-r border-border/30" : "",
              ].join(" ")}
            >
              {day !== null && (
                <>
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
                      <PlusIcon size={11} weight="bold" />
                    </button>
                  </div>

                  {/* Events */}
                  <div className="flex flex-col gap-0.5">
                    {shown.map((e) => (
                      <div
                        key={e.id}
                        className="group/event flex items-center gap-1 rounded-[5px] bg-primary/10 px-1.5 py-[3px] text-xs font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                        onClick={(ev) => { ev.stopPropagation(); onClickEntry(e.id); }}
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span className="flex-1 truncate">{e.title || "Untitled"}</span>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); onDeleteEntry(e.id); }}
                          className="flex shrink-0 size-3.5 items-center justify-center rounded opacity-0 group-hover/event:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                        >
                          <XIcon size={8} weight="bold" />
                        </button>
                      </div>
                    ))}

                    {/* "+N more" hover trigger */}
                    {extra > 0 && (
                      <button
                        onMouseEnter={(e) => openPopup(key!, e)}
                        onMouseLeave={scheduleClose}
                        className="px-1.5 py-0.5 text-left text-[10px] font-medium text-primary/70 hover:text-primary transition-colors"
                      >
                        +{extra} more
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
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
            : { position: "fixed", top: morePopup.y + 16,        left, zIndex: 9999, width: POPUP_W };

          return (
            <div style={posStyle}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover shadow-[var(--shadow-float)]"
            >
              {/* Date label */}
              <div className="border-b border-border/40 px-3 py-2">
                {(() => {
                  const [ey, em, ed] = morePopup.key.split("-").map(Number);
                  return (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                    className="group/pe flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => { onClickEntry(e.id); setMorePopup(null); }}
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span className="flex-1 truncate text-[13px] font-medium text-foreground">
                      {e.title || "Untitled"}
                    </span>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); onDeleteEntry(e.id); setMorePopup(null); }}
                      className="hidden size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover/pe:flex transition-colors"
                    >
                      <TrashIcon size={11} />
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
  );
}
