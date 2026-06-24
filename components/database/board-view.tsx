"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
 DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
 type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, ExternalLink, LayoutGrid, X, Trash2, FileText, PanelLeft } from "lucide-react";
import { OPTION_COLORS, getOptionColor } from "@/components/database/property-registry";
import { CellDisplay } from "@/components/database/cells/cell-display";
import type { SharedViewProps, DbEntry, DbProperty, SelectOption } from "@/components/database/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── helpers ───────────────────────────────────────────────────────────────────

function hasDisplayValue(prop: DbProperty, raw: unknown): boolean {
 const v = raw as Record<string, unknown> | null;
 switch (prop.type) {
  case "text":     return !!(v as { text?: string } | null)?.text;
  case "number":    return (v as { number?: number | null } | null)?.number != null;
  case "select":    return !!(v as { optionId?: string } | null)?.optionId;
  case "multi_select": return ((v as { optionIds?: string[] } | null)?.optionIds ?? []).length > 0;
  case "date":     return !!(v as { date?: string } | null)?.date;
  case "checkbox":   return !!(v as { checked?: boolean } | null)?.checked;
  case "url":     return !!(v as { url?: string } | null)?.url;
  case "email":    return !!(v as { email?: string } | null)?.email;
  case "phone":    return !!(v as { phone?: string } | null)?.phone;
  case "person":    return ((v as { userIds?: string[] } | null)?.userIds ?? []).length > 0;
  case "relation":   return ((v as { entryIds?: string[] } | null)?.entryIds ?? []).length > 0;
  default:       return false;
 }
}

// ── BoardView ─────────────────────────────────────────────────────────────────

export function BoardView({
 workspaceSlug, entries, properties, valueMap, activeView, isEditor,
 onUpdateValue, onCreateEntry, onUpdateProperty, onDeleteEntry, onOpenEntry,
}: SharedViewProps) {
 const [draggingId, setDraggingId]   = useState<string | null>(null);
 const [collapsed, setCollapsed]    = useState<Set<string>>(new Set());
 const [addingOption, setAddingOption] = useState(false);
 const [newOptName, setNewOptName]   = useState("");
 const [newOptColor, setNewOptColor]  = useState("blue");
 const [deleteTarget, setDeleteTarget] = useState<DbEntry | null>(null);
 const [deletingEntry, setDeletingEntry] = useState(false);
 const addOptRef            = useRef<HTMLDivElement>(null);
 const addOptInputRef         = useRef<HTMLInputElement>(null);

 const groupPropId = activeView?.groupByPropertyId;
 const groupProp  = properties.find((p) => p.id === groupPropId && p.type === "select");

 const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

 useEffect(() => {
  function h(e: MouseEvent) {
   if (addOptRef.current && !addOptRef.current.contains(e.target as Node)) {
    setAddingOption(false);
    setNewOptName("");
   }
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, []);

 if (!groupProp) {
  return (
   <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
    <div className="flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-muted/40">
     <LayoutGrid size={28} className="text-muted-foreground/40" />
    </div>
    <div>
     <p className="text-sm font-semibold text-foreground">No group-by property</p>
     <p className="mt-1 text-xs text-muted-foreground">
      Open the <strong>Group</strong> dropdown in the toolbar and pick a Select property to organise cards into columns.
     </p>
    </div>
   </div>
  );
 }

 const options: SelectOption[] = (groupProp.config?.options ?? []) as SelectOption[];

 const columns: { id: string | null; label: string; color: string; entries: DbEntry[] }[] = [
  { id: null, label: "No " + groupProp.name, color: "gray", entries: [] },
  ...options.map((o) => ({ id: o.id, label: o.name, color: o.color, entries: [] as DbEntry[] })),
 ];

 for (const entry of entries) {
  const val = valueMap.get(entry.id)?.get(groupPropId!) as { optionId?: string } | null;
  const col = columns.find((c) => c.id === (val?.optionId ?? null)) ?? columns[0];
  col.entries.push(entry);
 }

 const configuredCardPropIds = (activeView?.cardDisplayProps as string[] | undefined) ?? [];
 const cardProps = configuredCardPropIds.length > 0
  ? configuredCardPropIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as typeof properties
  : properties.filter((p) => !p.isSystem && p.id !== groupPropId).slice(0, 4);
 const draggingEntry = draggingId ? entries.find((e) => e.id === draggingId) : null;

 function onDragStart({ active }: DragStartEvent) { setDraggingId(String(active.id)); }
 function onDragEnd({ active, over }: DragEndEvent) {
  setDraggingId(null);
  if (!over || active.id === over.id) return;
  const targetCol = columns.find((c) => (c.id ?? "no-group") === String(over.id))
   ?? columns.find((c) => c.entries.some((e) => e.id === String(over.id)));
  if (!targetCol) return;
  onUpdateValue(String(active.id), groupPropId!, targetCol.id === null ? { optionId: null } : { optionId: targetCol.id });
 }

 function handleAddOption() {
  const name = newOptName.trim();
  if (!name) return;
  const newOpt: SelectOption = { id: crypto.randomUUID(), name, color: newOptColor };
  const updated = [...options, newOpt];
  onUpdateProperty(groupProp!.id, { config: { ...groupProp!.config, options: updated } });
  setNewOptName("");
  setNewOptColor(OPTION_COLORS[(updated.length) % OPTION_COLORS.length].id);
  setTimeout(() => addOptInputRef.current?.focus(), 0);
 }

 const previewColor = getOptionColor(newOptColor);

 return (
  <>
  <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
   <div className="grid items-start gap-3 px-6 py-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>

    {/* ── Columns ── */}
    {columns.map((col) => {
     const color   = getOptionColor(col.color);
     const colKey  = col.id ?? "no-group";
     const isCollapsed = collapsed.has(colKey);

     function toggleCollapse() {
      setCollapsed((prev) => {
       const next = new Set(prev);
       if (next.has(colKey)) next.delete(colKey); else next.add(colKey);
       return next;
      });
     }

     return (
      <SortableContext
       key={colKey}
       id={colKey}
       items={col.entries.map((e) => e.id)}
       strategy={verticalListSortingStrategy}
      >
       <div
        className={`flex flex-col rounded-[var(--radius-lg)] border border-border/50 bg-muted/40 ${isCollapsed ? "w-12" : ""}`}
        data-col-id={colKey}
       >
        {/* Column header */}
        {isCollapsed ? (
         /* Collapsed: vertical pill showing label + count */
         <button
          onClick={toggleCollapse}
          title={`Expand ${col.label}`}
          className="flex h-full flex-col items-center gap-2 py-3"
         >
          {col.id ? (
           <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[10px] font-bold" style={{ backgroundColor: color.bg, color: color.text }}>
            {col.entries.length}
           </span>
          ) : (
           <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted text-[10px] font-bold text-muted-foreground/60">
            {col.entries.length}
           </span>
          )}
          <span
           className="text-xs font-semibold text-muted-foreground/60"
           style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
          >
           {col.label}
          </span>
         </button>
        ) : (
         <>
          <div className="flex items-center justify-between px-3 py-2.5">
           <div className="flex items-center gap-2">
           {col.id ? (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-1 text-[13px] font-semibold" style={{ backgroundColor: color.bg, color: color.text }}>
             <span className="size-1.5 rounded-full" style={{ backgroundColor: color.dot }} />
             {col.label}
            </span>
           ) : (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-muted px-2.5 py-1 text-[13px] font-semibold text-muted-foreground/70">
             <span className="size-1.5 rounded-full bg-muted-foreground/30" />
             {col.label}
            </span>
           )}
           <span className="ml-1.5 rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {col.entries.length}
           </span>
           </div>
           <button
            onClick={toggleCollapse}
            title="Collapse column"
            className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/30 transition-colors duration-150 hover:bg-accent hover:text-muted-foreground"
           >
            <PanelLeft size={13} />
           </button>
          </div>


          {/* Cards */}
          <div className="flex flex-col gap-2 px-2 pb-1">
           {col.entries.map((entry) => (
            <SortableCard
             key={entry.id}
             entry={entry}
             cardProps={cardProps}
             valueMap={valueMap}
             workspaceSlug={workspaceSlug}
             isDragging={draggingId === entry.id}
             isEditor={isEditor}
             onDeleteEntry={onDeleteEntry}
             onDeleteRequest={setDeleteTarget}
             onOpenEntry={onOpenEntry}
             entryOpenMode={activeView?.entryOpenMode ?? "side_panel"}
            />
           ))}

           {col.entries.length === 0 && (
            <div className="flex h-16 items-center justify-center rounded-[var(--radius-md)] border border-border/40 bg-muted/20">
             <span className="text-[12px] text-muted-foreground/40">Drop cards here</span>
            </div>
           )}
          </div>

          {/* Add entry button */}
          {isEditor && (
           <button
            onClick={() => {
             const dv = col.id ? { [groupPropId!]: { optionId: col.id } } : {};
             onCreateEntry(dv);
            }}
            className="mx-2 mb-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-[12px] font-medium text-muted-foreground/50 transition-colors duration-150 hover:bg-accent hover:text-foreground"
           >
            <Plus size={13} />
            Add entry
           </button>
          )}
         </>
        )}
       </div>
      </SortableContext>
     );
    })}

    {/* ── Add option column ── */}
    {isEditor && (
     <div ref={addOptRef}>
      {!addingOption ? (
       <button
        onClick={() => {
         setAddingOption(true);
         setTimeout(() => addOptInputRef.current?.focus(), 50);
        }}
        className="flex h-10 w-full items-center gap-2 rounded-[var(--radius-lg)] border border-border px-3 text-xs text-muted-foreground/50 transition-colors duration-150 hover:bg-accent hover:text-foreground"
       >
        <Plus size={13} />
        Add option to &ldquo;{groupProp.name}&rdquo;
       </button>
      ) : (
       <div className="rounded-[var(--radius-lg)] border border-border bg-background p-3.5">
        <div className="mb-3 flex items-center justify-between">
         <p className="text-xs font-semibold tracking-[0.125px] text-muted-foreground/50">
          New option
         </p>
         <button
          onClick={() => { setAddingOption(false); setNewOptName(""); }}
          className="flex size-5 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/40 transition-colors duration-150 hover:bg-accent hover:text-muted-foreground"
         >
          <X size={11} />
         </button>
        </div>

        <input
         ref={addOptInputRef}
         value={newOptName}
         onChange={(e) => setNewOptName(e.target.value)}
         onKeyDown={(e) => {
          if (e.key === "Enter") handleAddOption();
          if (e.key === "Escape") { setAddingOption(false); setNewOptName(""); }
         }}
         placeholder="Option name…"
         className="w-full rounded-[var(--radius-sm)] border border-border bg-muted/20 px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />

        <p className="mb-1.5 mt-3 text-[10px] font-semibold tracking-[0.125px] text-muted-foreground/40">
         Colour
        </p>
        <div className="flex flex-wrap gap-2">
         {OPTION_COLORS.map((c) => (
          <button
           key={c.id}
           onClick={() => setNewOptColor(c.id)}
           title={c.id}
           style={{ backgroundColor: c.dot }}
           className={[
            "size-5 rounded-full transition-colors duration-150",
            newOptColor === c.id
             ? "scale-110 outline outline-2 outline-foreground/60"
             : "opacity-50 hover:opacity-90",
           ].join(" ")}
          />
         ))}
        </div>

        <div className="mt-3 flex min-h-[26px] items-center">
         {newOptName.trim() ? (
          <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-1 text-xs font-semibold ${previewColor.bg} ${previewColor.text}`}>
           <span className={`size-1.5 rounded-full ${previewColor.dot}`} />
           {newOptName.trim()}
          </span>
         ) : (
          <span className="text-xs text-muted-foreground/30">Preview will appear here</span>
         )}
        </div>

        <div className="mt-3 flex gap-2">
         <button
          onClick={handleAddOption}
          disabled={!newOptName.trim()}
          className="flex-1 rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
         >
          Add option
         </button>
         <button
          onClick={() => { setAddingOption(false); setNewOptName(""); }}
          className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
         >
          Cancel
         </button>
        </div>

        {options.length > 0 && (
         <div className="mt-3 border-t border-border/50 pt-3">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.125px] text-muted-foreground/40">
           Existing options
          </p>
          <div className="flex flex-col gap-1">
           {options.map((opt) => {
            const c = getOptionColor(opt.color);
            return (
             <span
              key={opt.id}
              className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: c.bg, color: c.text }}
             >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
              {opt.name}
             </span>
            );
           })}
          </div>
         </div>
        )}
       </div>
      )}
     </div>
    )}
   </div>

   <DragOverlay>
    {draggingEntry && (
     <CardShell
      entry={draggingEntry}
      cardProps={cardProps}
      valueMap={valueMap}
      workspaceSlug={workspaceSlug}
      dragging
      isEditor={false}
      onDeleteEntry={onDeleteEntry}
      onDeleteRequest={() => {}}
      entryOpenMode={activeView?.entryOpenMode ?? "side_panel"}
     />
    )}
   </DragOverlay>
  </DndContext>

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

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
 entry: DbEntry;
 cardProps: SharedViewProps["properties"];
 valueMap: Map<string, Map<string, unknown>>;
 workspaceSlug: string;
 isEditor: boolean;
 onDeleteEntry: SharedViewProps["onDeleteEntry"];
 onDeleteRequest: (entry: DbEntry) => void;
 onOpenEntry?: SharedViewProps["onOpenEntry"];
 entryOpenMode?: "side_panel" | "full_page";
 isDragging?: boolean;
 dragging?: boolean;
}

function SortableCard(props: CardProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.entry.id });
 const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
 return (
  <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-no-dnd={props.entryOpenMode === "side_panel" ? "true" : undefined}>
   <CardShell {...props} />
  </div>
 );
}

function CardShell({ entry, cardProps, valueMap, workspaceSlug, dragging, isEditor, onDeleteRequest, onOpenEntry, entryOpenMode }: CardProps) {
 const [hovered, setHovered] = useState(false);
 const filledProps = cardProps.filter((prop) =>
  hasDisplayValue(prop, valueMap.get(entry.id)?.get(prop.id) ?? null)
 );

 return (
  <div
   className={[
    "rounded-[var(--radius-md)] border bg-card transition-colors duration-150",
    dragging ? "border-primary/40 opacity-50" : "border-border/60",
   ].join(" ")}
   onMouseEnter={() => setHovered(true)}
   onMouseLeave={() => setHovered(false)}
  >
   <>
    {entry.coverUrl && (
      <div
       className="h-20 w-full rounded-t-[var(--radius-md)] bg-cover bg-center"
       style={{ backgroundImage: `url(${entry.coverUrl})` }}
      />
     )}

     <div className="p-3.5">
      {/* Title row */}
      <div className="flex items-start gap-2">
       {entry.icon ? (
        <span className="mt-0.5 shrink-0 text-base leading-none">{entry.icon}</span>
       ) : (
        <FileText size={12} className="mt-0.5 shrink-0 text-muted-foreground/25" />
       )}
       <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => entryOpenMode === "side_panel" && onOpenEntry ? onOpenEntry(entry) : undefined}
        className={`min-w-0 flex-1 text-left text-sm font-semibold leading-snug text-foreground transition-colors duration-150 ${
         entryOpenMode === "side_panel" && onOpenEntry ? "cursor-pointer hover:text-muted-foreground" : "cursor-default"
        }`}
       >
        {entry.title || <span className="font-normal text-muted-foreground/35">Untitled</span>}
       </button>

       {/* Action buttons — visible on hover */}
       <div className="flex shrink-0 items-center gap-0.5 transition-opacity"
        style={{ opacity: hovered ? 1 : 0 }}>
        <Link
         href={`/app/${workspaceSlug}/${entry.shortId}`}
         onClick={(e) => e.stopPropagation()}
         onPointerDown={(e) => e.stopPropagation()}
         title="Open full page"
         className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
        >
         <ExternalLink size={12} />
        </Link>
        {isEditor && (
         <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setHovered(false); onDeleteRequest(entry); }}
          title="Delete entry"
          className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
         >
          <Trash2 size={12} />
         </button>
        )}
       </div>
      </div>

      {/* Non-empty properties */}
      {filledProps.length > 0 && (
       <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
        {filledProps.map((prop) => {
         const raw = valueMap.get(entry.id)?.get(prop.id) ?? null;
         return (
          <div key={prop.id} className="min-w-0 shrink-0">
           <CellDisplay property={prop} value={raw} compact />
          </div>
         );
        })}
       </div>
      )}
     </div>
   </>
  </div>
 );
}
