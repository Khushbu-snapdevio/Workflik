"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, ChevronDown } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { getClampedTop, getClampedLeft } from "@/lib/ui/clamp-to-viewport";
import type { DbProperty, FilterRule } from "./types";
import type { SelectOption } from "./types";

const OPERATORS: Record<string, { value: string; label: string }[]> = {
 text:     [{ value: "contains", label: "contains" }, { value: "not_contains", label: "doesn't contain" }, { value: "is", label: "is exactly" }, { value: "is_not", label: "is not" }, { value: "starts_with", label: "starts with" }, { value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }],
 number:    [{ value: "=", label: "=" }, { value: "!=", label: "≠" }, { value: "<", label: "<" }, { value: ">", label: ">" }, { value: "<=", label: "≤" }, { value: ">=", label: "≥" }, { value: "is_empty", label: "is empty" }],
 select:    [{ value: "is", label: "is" }, { value: "is_not", label: "is not" }, { value: "is_any_of", label: "is any of" }, { value: "is_none_of", label: "is none of" }, { value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }],
 status:    [{ value: "is", label: "is" }, { value: "is_not", label: "is not" }, { value: "is_any_of", label: "is any of" }, { value: "is_none_of", label: "is none of" }, { value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }],
 multi_select: [{ value: "contains", label: "contains" }, { value: "not_contains", label: "doesn't contain" }, { value: "is_empty", label: "is empty" }],
 date:     [{ value: "is", label: "is" }, { value: "is_before", label: "is before" }, { value: "is_after", label: "is after" }, { value: "is_empty", label: "is empty" }],
 checkbox:   [{ value: "is_checked", label: "is checked" }, { value: "is_not_checked", label: "is not checked" }],
 url:     [{ value: "contains", label: "contains" }, { value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }],
 email:    [{ value: "contains", label: "contains" }, { value: "is_empty", label: "is empty" }],
 phone:    [{ value: "contains", label: "contains" }, { value: "is_empty", label: "is empty" }],
 person:    [{ value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }],
 relation:   [{ value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }],
 files:     [{ value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }],
};

const NO_VALUE_OPS = new Set(["is_empty", "is_not_empty", "is_checked", "is_not_checked"]);
const MULTI_VAL_OPS = new Set(["is_any_of", "is_none_of"]);

// ── Multi-option picker for is_any_of / is_none_of ───────────────────────────

export function MultiOptionPicker({ options, value, onChange }: {
 options: { id: string; name: string }[];
 value:  string[];
 onChange: (ids: string[]) => void;
}) {
 const [open, setOpen] = useState(false);
 const [rect, setRect] = useState<DOMRect | null>(null);
 const ref       = useRef<HTMLDivElement>(null);
 const btnRef     = useRef<HTMLButtonElement>(null);
 const menuRef     = useRef<HTMLDivElement>(null);
 const selected    = new Set(value);

 useEffect(() => {
  if (!open) return;
  function h(e: MouseEvent) {
   if (ref.current?.contains(e.target as Node)) return;
   if (menuRef.current?.contains(e.target as Node)) return;
   setOpen(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [open]);

 function toggle(id: string) {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id); else next.add(id);
  onChange(Array.from(next));
 }

 return (
  <div ref={ref} className="relative">
   <button
    ref={btnRef}
    onClick={() => {
     if (!open) setRect(btnRef.current?.getBoundingClientRect() ?? null);
     setOpen((v) => !v);
    }}
    className="flex h-7 min-w-[80px] items-center justify-between gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none"
   >
    <span className="truncate text-left">
     {selected.size === 0 ? <span className="text-muted-foreground">Choose…</span> : `${selected.size} option${selected.size === 1 ? "" : "s"}`}
    </span>
    <ChevronDown size={10} className="shrink-0 text-muted-foreground" />
   </button>
   {open && rect && typeof document !== "undefined" && createPortal(
    <div
     ref={menuRef}
     className="fixed z-50 w-44 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
     style={{ top: getClampedTop(rect, 200, { gap: 4 }), left: getClampedLeft(rect, 176) }}
    >
     {options.length === 0 ? (
      <p className="px-3 py-2.5 text-xs text-muted-foreground">No options defined</p>
     ) : (
      options.map((o) => {
       const on = selected.has(o.id);
       return (
        <button
         key={o.id}
         onClick={() => toggle(o.id)}
         className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-foreground hover:bg-accent"
        >
         <div className={`flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border transition-colors duration-150 ${on ? "border-primary bg-primary" : "border-border"}`}>
          {on && (
           <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(0.6px, -0.2px)" }}>
            <polyline points="2 6 5 9 10 3"/>
           </svg>
          )}
         </div>
         <span className="truncate">{o.name}</span>
        </button>
       );
      })
     )}
    </div>,
    document.body,
   )}
  </div>
 );
}

interface FilterBarProps {
 properties: DbProperty[];
 filters: FilterRule[];
 filterLogic: "and" | "or";
 onChange: (filters: FilterRule[]) => void;
 onFilterLogicChange: (logic: "and" | "or") => void;
}

export function FilterBar({ properties, filters, filterLogic, onChange, onFilterLogicChange }: FilterBarProps) {
 const usable = properties.filter((p) => !p.isSystem);
 const atLimit = filters.length >= usable.length;
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 // Properties already used by OTHER rules — excluded from a row's own
 // dropdown (except its current selection) so the same property can't be
 // picked twice, and from `add`'s default pick.
 function usedElsewhere(excludeIdx?: number) {
  return new Set(filters.filter((_, i) => i !== excludeIdx).map((f) => f.propertyId));
 }

 function add() {
  if (atLimit) return;
  const used = usedElsewhere();
  const first = usable.find((p) => !used.has(p.id));
  if (!first) return;
  const ops = OPERATORS[first.type] ?? OPERATORS.text;
  onChange([...filters, { propertyId: first.id, operator: ops[0].value, value: "" }]);
 }

 function update(idx: number, patch: Partial<FilterRule>) {
  onChange(filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
 }

 function remove(idx: number) {
  onChange(filters.filter((_, i) => i !== idx));
 }

 return (
  <div className="flex shrink-0 flex-col gap-1.5 border-b border-border px-4 py-2.5 sm:px-8 lg:px-16 bg-sidebar">
   {/* Header with logic toggle */}
   <div className="flex items-center justify-between">
    <p className="text-xs font-semibold tracking-wide text-muted-foreground/60">Filters</p>
    {filters.length > 1 && (
     <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground/60">Match</span>
      <div className="flex items-center rounded-[var(--radius-sm)] border border-border bg-muted/40 p-0.5 gap-0">
       {(["and", "or"] as const).map((logic) => (
        <button
         key={logic}
         onClick={() => onFilterLogicChange(logic)}
         className={[
          filterLogic === logic
           ? "bg-primary text-white rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-semibold"
           : "text-muted-foreground px-2.5 py-1 text-xs font-medium hover:text-foreground",
         ].join(" ")}
        >
         {logic}
        </button>
       ))}
      </div>
      <span className="text-xs text-muted-foreground/60">rules</span>
     </div>
    )}
   </div>

   {filters.map((filter, idx) => {
    const prop = usable.find((p) => p.id === filter.propertyId);
    const ops = OPERATORS[prop?.type ?? "text"] ?? OPERATORS.text;
    const needsValue = !NO_VALUE_OPS.has(filter.operator);
    const used = usedElsewhere(idx);

    const isMultiVal = MULTI_VAL_OPS.has(filter.operator) && (prop?.type === "select" || prop?.type === "status");

    return (
     <div key={idx} className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 text-right">
       {idx === 0 ? (
        <span className="text-muted-foreground">Where</span>
       ) : (
        <span className={[
         "inline-flex items-center justify-center rounded-[var(--radius-xs)] px-1.5 py-0.5 text-xs font-bold tracking-wide",
         filterLogic === "or"
          ? "bg-warning/10 text-warning"
          : "bg-primary/10 text-primary",
        ].join(" ")}>
         {filterLogic}
        </span>
       )}
      </span>

      <Select
       value={filter.propertyId}
       onValueChange={(v) => {
        const np = usable.find((p) => p.id === v);
        const nops = OPERATORS[np?.type ?? "text"] ?? OPERATORS.text;
        update(idx, { propertyId: v, operator: nops[0].value, value: "" });
       }}
      >
       <SelectTrigger size="sm" className="min-w-28">
        <SelectValue />
       </SelectTrigger>
       <SelectContent>
        {usable.filter((p) => !used.has(p.id)).map((p) => (
         <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
       </SelectContent>
      </Select>

      <Select
       value={filter.operator}
       onValueChange={(v) => update(idx, { operator: v, value: MULTI_VAL_OPS.has(v) ? [] : "" })}
      >
       <SelectTrigger size="sm" className="min-w-28">
        <SelectValue />
       </SelectTrigger>
       <SelectContent>
        {ops.map((op) => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
       </SelectContent>
      </Select>

      {needsValue && isMultiVal && (
       <MultiOptionPicker
        options={(prop?.config?.options as SelectOption[]) ?? []}
        value={(filter.value as string[]) ?? []}
        onChange={(ids) => update(idx, { value: ids })}
       />
      )}

      {needsValue && !isMultiVal && prop?.type === "date" && (
       <DatePicker
        value={(filter.value as string) || null}
        onChange={(v) => update(idx, { value: v ?? "" })}
        placeholder="Value…"
        className="h-[26px] w-32 gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs"
       />
      )}

      {needsValue && !isMultiVal && prop?.type !== "date" && (
       <input
        type={prop?.type === "number" ? "number" : "text"}
        value={String(filter.value ?? "")}
        onChange={(e) => update(idx, { value: e.target.value })}
        placeholder="Value…"
        className="w-32 rounded-[var(--radius-sm)] border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary/50 focus:outline-none"
       />
      )}

      <button
       onClick={() => remove(idx)}
       className="ml-auto flex size-5 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground/70 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
      >
       <X size={11} />
      </button>
     </div>
    );
   })}

   <button
    onClick={add}
    disabled={atLimit}
    onMouseEnter={(e) => { if (atLimit) showTooltip("All properties already have a filter", e); }}
    onMouseLeave={hideTooltip}
    className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
   >
    + Add filter
   </button>
   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
  </div>
 );
}
