"use client";

import { ArrowUp, ArrowDown, X } from "@phosphor-icons/react";
import type { DbProperty, SortRule } from "./types";

const SORTABLE = new Set(["text", "number", "select", "date", "checkbox", "url", "email", "phone"]);
const MAX_SORTS = 5;

interface SortBarProps {
  properties: DbProperty[];
  sorts: SortRule[];
  onChange: (sorts: SortRule[]) => void;
}

export function SortBar({ properties, sorts, onChange }: SortBarProps) {
  const usable = properties.filter((p) => !p.isSystem && SORTABLE.has(p.type));
  const atLimit = sorts.length >= MAX_SORTS;

  function add() {
    if (atLimit) return;
    const first = usable[0];
    if (!first) return;
    onChange([...sorts, { propertyId: first.id, direction: "asc" }]);
  }

  function update(idx: number, patch: Partial<SortRule>) {
    onChange(sorts.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function remove(idx: number) {
    onChange(sorts.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-b border-border/60 bg-primary/[0.03] px-4 py-2.5 dark:bg-primary/[0.06]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/60">Sort</p>
        {atLimit && (
          <span className="text-[10px] text-muted-foreground/50">Max {MAX_SORTS} sort rules</span>
        )}
      </div>

      {sorts.map((sort, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0 text-right text-muted-foreground">
            {idx === 0 ? "Sort by" : "Then by"}
          </span>

          <select
            value={sort.propertyId}
            onChange={(e) => update(idx, { propertyId: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {usable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <div className="flex overflow-hidden rounded-lg border border-border">
            {(["asc", "desc"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => update(idx, { direction: dir })}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
                  sort.direction === dir
                    ? "bg-primary/10 text-primary dark:bg-primary/20"
                    : "text-muted-foreground hover:bg-accent"
                } ${dir === "desc" ? "border-l border-border" : ""}`}
              >
                {dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {dir === "asc" ? "Asc" : "Desc"}
              </button>
            ))}
          </div>

          <button
            onClick={() => remove(idx)}
            className="ml-auto flex size-5 items-center justify-center rounded text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
          >
            <X size={11} />
          </button>
        </div>
      ))}

      <button
        onClick={add}
        disabled={atLimit || usable.length === 0}
        title={atLimit ? `Maximum ${MAX_SORTS} sort rules` : undefined}
        className="w-fit rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add sort
      </button>
    </div>
  );
}
