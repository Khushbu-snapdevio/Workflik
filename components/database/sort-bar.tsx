"use client";

import { ArrowUp, ArrowDown, X } from "lucide-react";
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
  <div className="flex shrink-0 flex-col gap-1.5 border-b border-border px-4 py-2.5 bg-sidebar">
   <div className="flex items-center justify-between">
    <p className="text-xs font-semibold tracking-wide text-muted-foreground/60">Sort</p>
    {atLimit && (
     <span className="text-xs text-muted-foreground">Max {MAX_SORTS} sort rules</span>
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
      className="rounded-[var(--radius-sm)] border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary/50 focus:outline-none"
     >
      {usable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
     </select>

     <div className="flex items-center rounded-[var(--radius-sm)] border border-border bg-muted/40 p-0.5">
      {(["asc", "desc"] as const).map((dir) => (
       <button
        key={dir}
        onClick={() => update(idx, { direction: dir })}
        className={`flex items-center gap-1 transition-colors ${
         sort.direction === dir
          ? "bg-primary text-white rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-semibold"
          : "text-muted-foreground px-2.5 py-1 text-xs font-medium hover:text-foreground"
        }`}
       >
        {dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
        {dir === "asc" ? "Asc" : "Desc"}
       </button>
      ))}
     </div>

     <button
      onClick={() => remove(idx)}
      className="ml-auto flex size-5 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground/70 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
     >
      <X size={11} />
     </button>
    </div>
   ))}

   <button
    onClick={add}
    disabled={atLimit || usable.length === 0}
    title={atLimit ? `Maximum ${MAX_SORTS} sort rules` : undefined}
    className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
   >
    + Add sort
   </button>
  </div>
 );
}
