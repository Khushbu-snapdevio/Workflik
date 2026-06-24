"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── Colors ────────────────────────────────────────────────────────────────────

type ColStyle = { header: string; dot: string; badge: string };

const OPTION_STYLES: Record<string, ColStyle> = {
 gray:   { header: "bg-[#f4f4f5] border-[#d4d4d8]", dot: "bg-[#71717a]", badge: "bg-[#d4d4d8] text-[#3f3f46]" },
 red:    { header: "bg-[#fff5f5] border-[#fecaca]", dot: "bg-[#f87171]", badge: "bg-[#fee2e2] text-[#b91c1c]" },
 orange: { header: "bg-[#fff8f0] border-[#fed7aa]", dot: "bg-[#fb923c]", badge: "bg-[#ffedd5] text-[#c2410c]" },
 yellow: { header: "bg-[#fffdf0] border-[#fde68a]", dot: "bg-[#facc15]", badge: "bg-[#fef9c3] text-[#a16207]" },
 green:  { header: "bg-[#f0fdf4] border-[#bbf7d0]", dot: "bg-[#4ade80]", badge: "bg-[#dcfce7] text-[#15803d]" },
 teal:   { header: "bg-[#f0fdfa] border-[#99f6e4]", dot: "bg-[#2dd4bf]", badge: "bg-[#ccfbf1] text-[#0f766e]" },
 blue:   { header: "bg-[#f0f9ff] border-[#bae6fd]", dot: "bg-[#38bdf8]", badge: "bg-[#e0f2fe] text-[#0369a1]" },
 purple: { header: "bg-[#f5f3ff] border-[#ddd6fe]", dot: "bg-[#a78bfa]", badge: "bg-[#ede9fe] text-[#6d28d9]" },
 pink:   { header: "bg-[#fdf4ff] border-[#f5d0fe]", dot: "bg-[#f472b6]", badge: "bg-[#fce7f3] text-[#be185d]" },
};

const OPTION_COLORS: Record<string, string> = {
 gray:   "bg-[#d4d4d8] text-[#3f3f46]",
 red:    "bg-[#fee2e2] text-[#b91c1c]",
 orange: "bg-[#ffedd5] text-[#c2410c]",
 yellow: "bg-[#fef9c3] text-[#a16207]",
 green:  "bg-[#dcfce7] text-[#15803d]",
 teal:   "bg-[#ccfbf1] text-[#0f766e]",
 blue:   "bg-[#e0f2fe] text-[#0369a1]",
 purple: "bg-[#ede9fe] text-[#6d28d9]",
 pink:   "bg-[#fce7f3] text-[#be185d]",
};

function getStyle(color: string): ColStyle {
 return OPTION_STYLES[color] ?? OPTION_STYLES.gray;
}

function optionCls(color: string) {
 return OPTION_COLORS[color] ?? OPTION_COLORS.gray;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PropOption   = { id: string; name: string; color: string };
type PropConfig   = { options?: PropOption[] };
type SelectVal   = { optionId?: string };
type MultiSelectVal = { optionIds?: string[] };

type Column = { optionId: string | null; label: string; color: string; entries: TemplateEntry[] };

// ── Inline card create input ──────────────────────────────────────────────────

function InlineCardInput({
 onConfirm, onCancel,
}: {
 onConfirm: (title: string) => void;
 onCancel: () => void;
}) {
 const [val, setVal] = useState("");
 const ref      = useRef<HTMLTextAreaElement>(null);

 useEffect(() => { ref.current?.focus(); }, []);

 return (
  <div className="rounded-[var(--radius-sm)] border border-primary/50 bg-background p-3">
   <textarea
    ref={ref}
    value={val}
    onChange={(e) => setVal(e.target.value)}
    onKeyDown={(e) => {
     if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onConfirm(val.trim()); }
     if (e.key === "Escape") onCancel();
    }}
    placeholder="Card title…"
    rows={2}
    className="w-full resize-none bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
   />
   <div className="mt-2 flex items-center gap-2">
    <button
     onClick={() => onConfirm(val.trim())}
     className="rounded-[var(--radius-sm)] bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] transition-colors"
    >
     Add card
    </button>
    <button
     onClick={onCancel}
     className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
    >
     Cancel
    </button>
   </div>
  </div>
 );
}

// ── Main board view ───────────────────────────────────────────────────────────

interface Props {
 entries:     TemplateEntry[];
 properties:    DatabaseProperty[];
 activeView:    DatabaseView;
 entryValueMap:  Map<string, Map<string, unknown>>;
 workspaceSlug:  string;
 onAddEntry:    (defaultValues?: Record<string, unknown>, title?: string) => void;
 onDeleteEntry:  (entryId: string) => void;
 onClickEntry:   (entryId: string) => void;
 onUpdatePropValue:(entryId: string, propId: string, value: unknown) => void;
}

export function TemplateBoardView({
 entries, properties, activeView, entryValueMap, workspaceSlug, onAddEntry, onDeleteEntry, onClickEntry,
}: Props) {
 const [addingTo, setAddingTo] = useState<string | null>(null);
 const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

 // Try configured groupBy first; fall back to first select property in the database
 const groupProp = properties.find((p) => p.id === activeView.groupByPropertyId)
  ?? properties.find((p) => p.type === "select");
 const groupConfig = (groupProp?.config ?? {}) as PropConfig;
 const groupOptions = groupConfig.options ?? [];

 // Extra display properties (first 2 select/multi-select that aren't groupBy)
 const displayProps = properties
  .filter((p) => p.id !== groupProp?.id && (p.type === "select" || p.type === "multi_select") && !p.isHidden)
  .slice(0, 2);

 // Bucket entries by group option
 const buckets = new Map<string | null, TemplateEntry[]>();
 buckets.set(null, []);
 for (const opt of groupOptions) buckets.set(opt.id, []);

 for (const entry of entries) {
  const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
  const raw  = groupProp ? valMap.get(groupProp.id) : undefined;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
   const sv = raw as SelectVal;
   if (sv.optionId && buckets.has(sv.optionId)) {
    buckets.get(sv.optionId)!.push(entry);
    continue;
   }
  }
  buckets.get(null)!.push(entry);
 }

 const columns: Column[] = [
  ...groupOptions.map((opt) => ({
   optionId: opt.id, label: opt.name, color: opt.color, entries: buckets.get(opt.id) ?? [],
  })),
  // Always show "No Status" column for unmatched entries
  { optionId: null, label: groupProp ? "No Status" : "All Items", color: "gray", entries: buckets.get(null)! },
 ].filter((col) => {
  // Always show named option columns (valid targets for adding cards)
  if (col.optionId !== null) return true;
  // "No Status" / "All Items": show only when it has entries,
  // or when there are no defined options (single-column fallback mode)
  return col.entries.length > 0 || groupOptions.length === 0;
 });

 async function handleAddCard(optionId: string | null, title: string) {
  setAddingTo(null);
  const defaultValues: Record<string, unknown> = {};
  if (groupProp && optionId) {
   defaultValues[groupProp.id] = { optionId };
  }
  await onAddEntry(
   Object.keys(defaultValues).length ? defaultValues : undefined,
   title.trim() || undefined,
  );
 }

 return (
  <>
  <div className="grid items-start gap-3 p-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
   {columns.map((col) => {
    const style   = getStyle(col.color);
    const isAddingHere = addingTo === (col.optionId ?? "none");

    return (
     <div
      key={col.optionId ?? "none"}
      className="flex flex-col rounded-[var(--radius-md)] border border-border/40 bg-muted/10 overflow-hidden"
     >
      {/* Column header */}
      <div className={`flex items-center justify-between border-b px-3 py-2.5 ${style.header}`}>
       <div className="flex items-center gap-2">
        <span className={`size-2 flex-shrink-0 rounded-full ${style.dot}`} />
        <span className="text-sm font-semibold text-foreground">{col.label}</span>
        <span className="flex min-w-[18px] items-center justify-center rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
         {col.entries.length}
        </span>
       </div>
       <button
        onClick={() => setAddingTo(col.optionId ?? "none")}
        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors"
       >
        <Plus size={13} />
       </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2.5">
       {col.entries.map((entry) => {
        const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();

        return (
         <div
          key={entry.id}
          className="group relative rounded-[var(--radius-sm)] border border-border/50 bg-background p-3 transition-all hover:border-border hover:-translate-y-0.5 cursor-pointer"
          onClick={() => onClickEntry(entry.id)}
         >
          <p className="pr-5 text-sm font-medium leading-snug text-foreground">
           {entry.title || <span className="text-muted-foreground/40">Untitled</span>}
          </p>

          {/* Property badges */}
          {displayProps.length > 0 && (
           <div className="mt-2 flex flex-wrap gap-1">
            {displayProps.flatMap((dp) => {
             const dpConfig = (dp.config ?? {}) as PropConfig;
             const raw   = valMap.get(dp.id);
             if (!raw) return [];

             if (dp.type === "select") {
              const sv = raw as SelectVal;
              const opt = dpConfig.options?.find((o) => o.id === sv.optionId);
              if (!opt) return [];
              return [
               <span key={dp.id} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${optionCls(opt.color)}`}>
                {opt.name}
               </span>,
              ];
             }
             if (dp.type === "multi_select") {
              const msv = raw as MultiSelectVal;
              const opts = (msv.optionIds ?? [])
               .map((id) => dpConfig.options?.find((o) => o.id === id))
               .filter(Boolean)
               .slice(0, 2) as PropOption[];
              return opts.map((opt) => (
               <span key={opt.id} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${optionCls(opt.color)}`}>
                {opt.name}
               </span>
              ));
             }
             return [];
            })}
           </div>
          )}

          {/* Card actions */}
          <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
           <Link
            href={`/app/${workspaceSlug}/${entry.shortId}`}
            onClick={(e) => e.stopPropagation()}
            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Open page"
           >
            <ExternalLink size={11} />
           </Link>
           <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry.id); }}
            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Delete"
           >
            <Trash2 size={11} />
           </button>
          </div>
         </div>
        );
       })}

       {/* Inline add card input */}
       {isAddingHere && (
        <InlineCardInput
         onConfirm={(title) => handleAddCard(col.optionId, title)}
         onCancel={() => setAddingTo(null)}
        />
       )}

       {col.entries.length === 0 && !isAddingHere && (
        <p className="py-4 text-center text-xs text-muted-foreground/40">No items</p>
       )}

       {/* Add card button at bottom of column */}
       {!isAddingHere && (
        <button
         onClick={() => setAddingTo(col.optionId ?? "none")}
         className="flex w-full items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted-foreground/50 hover:bg-muted/30 hover:text-muted-foreground transition-colors"
        >
         <Plus size={12} />
         Add card
        </button>
       )}
      </div>
     </div>
    );
   })}
  </div>

  <ConfirmDialog
   open={deleteTarget !== null}
   onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
   title="Delete entry?"
   description="This entry will be permanently deleted. This cannot be undone."
   confirmLabel="Delete"
   onConfirm={() => { if (deleteTarget) { onDeleteEntry(deleteTarget); setDeleteTarget(null); } }}
  />
  </>
 );
}
