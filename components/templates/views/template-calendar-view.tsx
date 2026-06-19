"use client";

import { useState } from "react";
import { CaretLeftIcon, CaretRightIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

type DateVal = { date?: string };

interface Props {
  entries:       TemplateEntry[];
  properties:    DatabaseProperty[];
  activeView:    DatabaseView;
  entryValueMap: Map<string, Map<string, unknown>>;
  onAddEntry:    (defaultValues?: Record<string, unknown>) => void;
  onDeleteEntry: (entryId: string) => void;
  onClickEntry:  (entryId: string) => void;
}

export function TemplateCalendarView({
  entries, properties, activeView, entryValueMap, onAddEntry, onDeleteEntry, onClickEntry,
}: Props) {
  const today = new Date();
  const [year,      setYear]      = useState(today.getFullYear());
  const [month,     setMonth]     = useState(today.getMonth());
  const [expandDay, setExpandDay] = useState<string | null>(null);

  const calProp = properties.find((p) => p.id === activeView.calendarPropertyId);

  function pad(n: number) { return String(n).padStart(2, "0"); }
  function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const dateMap = new Map<string, TemplateEntry[]>();
  for (const entry of entries) {
    const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
    const raw    = calProp ? valMap.get(calProp.id) : undefined;
    if (raw && typeof raw === "object") {
      const dv   = raw as DateVal;
      const date = dv.date;
      if (date) {
        if (!dateMap.has(date)) dateMap.set(date, []);
        dateMap.get(date)!.push(entry);
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
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function goNext() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  function handleAddOnDate(day: number) {
    if (!calProp) { onAddEntry(); return; }
    onAddEntry({ [calProp.id]: { date: dateKey(year, month, day) } });
  }

  const SHOW_MAX = 3;
  const rows = cells.length / 7;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-6 py-4">
        <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <CaretLeftIcon size={14} />
          </button>
          <button onClick={goToday} className="rounded-md px-3 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            Today
          </button>
          <button onClick={goNext} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <CaretRightIcon size={14} />
          </button>
          <button
            onClick={() => onAddEntry()}
            className="ml-3 flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <PlusIcon size={12} weight="bold" />
            New
          </button>
        </div>
      </div>

      {/* ── Day-of-week headers ───────────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-7 border-b border-border/40 bg-muted/20">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
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
                "group relative flex flex-col overflow-hidden p-1.5 transition-colors",
                day === null ? "bg-muted/10" : "bg-background hover:bg-accent/20 cursor-pointer",
                !isLastRow ? "border-b border-border/30" : "",
                !isLastCol ? "border-r border-border/30" : "",
              ].join(" ")}
              onClick={() => day !== null && handleAddOnDate(day)}
            >
              {day !== null && (
                <>
                  {/* Day number row */}
                  <div className="mb-1 flex items-center justify-between">
                    <span className={[
                      "flex size-[22px] items-center justify-center rounded-full text-[12px] font-medium leading-none",
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
                        className="group/event flex items-center gap-1 rounded-[5px] bg-primary/10 px-1.5 py-[3px] text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                        onClick={(ev) => { ev.stopPropagation(); onClickEntry(e.id); }}
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span className="flex-1 truncate">{e.title || "Untitled"}</span>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); onDeleteEntry(e.id); }}
                          className="hidden shrink-0 size-3.5 items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive group-hover/event:flex transition-colors"
                        >
                          <XIcon size={8} weight="bold" />
                        </button>
                      </div>
                    ))}
                    {extra > 0 && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); setExpandDay(key); }}
                        className="px-1.5 py-0.5 text-left text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
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

      {/* ── Expand-day modal ──────────────────────────────────────────────────── */}
      {expandDay && (() => {
        const dayEvents = dateMap.get(expandDay) ?? [];
        const [y, m, d] = expandDay.split("-").map(Number);
        const label = `${DAY_NAMES[new Date(y, m - 1, d).getDay()]}, ${MONTH_NAMES[m - 1]} ${d}`;
        return (
          <>
            <div className="fixed inset-0 z-[590] bg-black/20 backdrop-blur-[2px]" onClick={() => setExpandDay(null)} />
            <div className="fixed left-1/2 top-1/2 z-[600] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
                <span className="text-[13px] font-semibold text-foreground">{label}</span>
                <button onClick={() => setExpandDay(null)} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={14} /></button>
              </div>
              <div className="max-h-[320px] overflow-y-auto p-2 space-y-0.5">
                {dayEvents.map((e) => (
                  <div key={e.id} className="group/de flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => { onClickEntry(e.id); setExpandDay(null); }}>
                    <span className="size-2 shrink-0 rounded-full bg-primary/60" />
                    <span className="flex-1 truncate text-[13px] font-medium text-foreground">{e.title || "Untitled"}</span>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); onDeleteEntry(e.id); setExpandDay(null); }}
                      className="hidden size-5 shrink-0 items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive group-hover/de:flex transition-colors"
                    >
                      <TrashIcon size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/40 p-3">
                <button
                  onClick={() => { handleAddOnDate(d); setExpandDay(null); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <PlusIcon size={12} weight="bold" />
                  Add entry on this day
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
