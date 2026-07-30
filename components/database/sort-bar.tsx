"use client";

import { ArrowUp, ArrowDown, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DbProperty, SortRule } from "./types";

const SORTABLE = new Set(["text", "number", "select", "status", "date", "checkbox", "url", "email", "phone"]);
const MAX_SORTS = 5;

interface SortBarProps {
 properties: DbProperty[];
 sorts: SortRule[];
 onChange: (sorts: SortRule[]) => void;
}

export function SortBar({ properties, sorts, onChange }: SortBarProps) {
 const usable = properties.filter((p) => !p.isSystem && SORTABLE.has(p.type));
 const atLimit = sorts.length >= MAX_SORTS || sorts.length >= usable.length;
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 // Properties already used by OTHER rules — excluded from a row's own
 // dropdown (except its current selection) so the same property can't be
 // picked twice, and from `add`'s default pick.
 function usedElsewhere(excludeIdx?: number) {
  return new Set(sorts.filter((_, i) => i !== excludeIdx).map((s) => s.propertyId));
 }

 function add() {
  if (atLimit) return;
  const used = usedElsewhere();
  const first = usable.find((p) => !used.has(p.id));
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
  <div className="flex shrink-0 flex-col gap-1.5 border-b border-border px-4 py-2.5 sm:px-8 lg:px-16 bg-sidebar">
   <div className="flex items-center justify-between">
    <p className="text-xs font-semibold tracking-wide text-muted-foreground">Sort</p>
    {atLimit && (
     <span className="text-xs text-muted-foreground">
      {sorts.length >= MAX_SORTS ? `Max ${MAX_SORTS} sort rules` : "All properties sorted"}
     </span>
    )}
   </div>

   {sorts.map((sort, idx) => {
    const used = usedElsewhere(idx);
    return (
    <div key={idx} className="flex items-center gap-2 text-xs">
     <span className="w-14 shrink-0 text-right text-muted-foreground">
      {idx === 0 ? "Sort by" : "Then by"}
     </span>

     <Select value={sort.propertyId} onValueChange={(v) => update(idx, { propertyId: v })}>
      <SelectTrigger size="sm" className="min-w-32">
       <SelectValue />
      </SelectTrigger>
      <SelectContent>
       {usable.filter((p) => !used.has(p.id)).map((p) => (
        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
       ))}
      </SelectContent>
     </Select>

     <div className="flex items-center rounded-[var(--radius-sm)] border border-border bg-muted/40 p-0.5">
      {(["asc", "desc"] as const).map((dir) => (
       <button
        key={dir}
        onClick={() => update(idx, { direction: dir })}
        className={`flex items-center gap-1 transition-colors ${
         sort.direction === dir
          ? "bg-primary text-primary-foreground rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-semibold"
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
      className="ml-auto flex size-5 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
     >
      <X size={11} />
     </button>
    </div>
    );
   })}

   <button
    onClick={add}
    disabled={atLimit || usable.length === 0}
    onMouseEnter={(e) => {
     if (sorts.length >= MAX_SORTS) showTooltip(`Maximum ${MAX_SORTS} sort rules`, e);
     else if (atLimit) showTooltip("All sortable properties are already used", e);
    }}
    onMouseLeave={hideTooltip}
    className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
   >
    + Add sort
   </button>
   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
  </div>
 );
}
