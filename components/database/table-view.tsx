"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
 Plus, ExternalLink as ArrowSquareOut, Trash2 as Trash, EyeOff as EyeSlash, Type as TextT, Hash, CircleDashed,
 Tag, Calendar as CalendarBlank, CheckSquare, Link as LinkIcon, Mail as Envelope, Phone,
 User, ArrowLeftRight as ArrowsLeftRight, ArrowUp as SortAscending, ArrowDown as SortDescending, MoreHorizontal as DotsThree,
 Check, FileText, Table2, GripVertical,
} from "lucide-react";
import {
 DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
 type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
 SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PROPERTY_REGISTRY } from "@/components/database/property-registry";
import { getOptionColor } from "@/components/database/property-registry";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import type { SharedViewProps, DbProperty, DbEntry, SelectOption } from "@/components/database/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── Constants ────────────────────────────────────────────────────────────────

const PROP_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
 text: TextT, number: Hash, select: CircleDashed, multi_select: Tag,
 date: CalendarBlank, checkbox: CheckSquare, url: LinkIcon, email: Envelope,
 phone: Phone, person: User, relation: ArrowsLeftRight,
};

const TEXT_TYPES = new Set(["text", "number", "url", "email", "phone"]);
const POPUP_TYPES = new Set(["select", "multi_select", "date", "person", "relation"]);

const DRAG_COL_W  = 24;
const IDX_COL_W   = 48;
const TITLE_COL_W  = 300;
const DEFAULT_COL_W = 180;
const MIN_COL_W   = 80;
const ROW_H     = 40;

// ── Types ────────────────────────────────────────────────────────────────────

interface ActiveCell  { entryId: string; propId: string }
interface EditPop    { entryId: string; propId: string; rect: DOMRect }
interface PropMenuState { propId: string; rect: DOMRect }
interface AddPropState { rect: DOMRect }
interface RowMenuState { entryId: string; shortId: string; rect: DOMRect }

// ── SortableTableRow ─────────────────────────────────────────────────────────

interface SortableTableRowProps {
 entry:       DbEntry;
 rowIdx:      number;
 visible:     DbProperty[];
 activeCell:    ActiveCell | null;
 editValue:    string;
 cellInputRef:   React.RefObject<HTMLInputElement | null>;
 selectedEntryIds: Set<string>;
 hoveredRowId:   string | null;
 deleteConfirm:  { entryId: string } | null;
 isEditor:     boolean;
 rowMenu:     RowMenuState | null;
 workspaceSlug:  string;
 addBtnW:     number;
 activeView:    SharedViewProps["activeView"];
 colW:       (id: string) => number;
 onMouseEnter:   () => void;
 onMouseLeave:   () => void;
 onSelectEntry:  (id: string, selected: boolean) => void;
 onUpdateTitle:  (id: string, title: string) => void;
 onOpenEntry:   ((entry: DbEntry) => void) | undefined;
 setActiveCell:  (cell: ActiveCell | null) => void;
 setEditValue:   (val: string) => void;
 setRowMenu:    (menu: RowMenuState | null) => void;
 activateCell:   (entryId: string, propId: string, e: React.MouseEvent) => void;
 commitText:    (entryId: string, propId: string, val: string) => void;
 getRaw:      (entryId: string, propId: string) => unknown;
}

function SortableTableRow({
 entry, rowIdx, visible, activeCell, editValue, cellInputRef, selectedEntryIds,
 hoveredRowId, deleteConfirm, isEditor, rowMenu, workspaceSlug, addBtnW, activeView, colW,
 onMouseEnter, onMouseLeave, onSelectEntry, onUpdateTitle, onOpenEntry,
 setActiveCell, setEditValue, setRowMenu, activateCell, commitText, getRaw,
}: SortableTableRowProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
  useSortable({ id: entry.id });

 const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
 };

 const isSelected  = selectedEntryIds.has(entry.id);
 const isRowHovered = hoveredRowId === entry.id && !deleteConfirm;

 return (
  <div
   ref={setNodeRef}
   style={style}
   {...attributes}
   className={[
    "flex items-stretch db-border-b transition-colors duration-100",
    isSelected ? "bg-primary/5" : !deleteConfirm ? "hover:bg-muted/40" : "",
   ].join(" ")}
   onMouseEnter={onMouseEnter}
   onMouseLeave={onMouseLeave}
  >
   {/* Drag handle */}
   <div
    className="flex shrink-0 items-center justify-center"
    style={{ width: DRAG_COL_W, minWidth: DRAG_COL_W, height: ROW_H, touchAction: "none", userSelect: "none" }}
   >
    {isEditor && (
     <div
      {...listeners}
      className="flex size-5 cursor-grab items-center justify-center rounded text-muted-foreground/0 hover:text-muted-foreground/40 transition-colors active:cursor-grabbing"
      style={{ opacity: isRowHovered ? 1 : 0, transition: "opacity 150ms" }}
      title="Drag to reorder"
     >
      <GripVertical size={13} />
     </div>
    )}
   </div>

   {/* Checkbox / index */}
   <div
    className="flex shrink-0 items-center justify-center"
    style={{ width: IDX_COL_W, minWidth: IDX_COL_W, height: ROW_H }}
   >
    {isEditor ? (
     <label className="relative flex size-5 cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <input
       type="checkbox"
       checked={isSelected}
       onChange={(e) => onSelectEntry(entry.id, e.target.checked)}
       className="sr-only"
      />
      {/* Row number — fades out on hover/select */}
      <span className="absolute select-none text-xs tabular-nums text-muted-foreground/60 transition-opacity duration-150"
       style={{ opacity: isSelected || isRowHovered ? 0 : 1 }}>
       {rowIdx + 1}
      </span>
      {/* Checkbox — fades in on hover/select */}
      <span className={`flex size-[15px] items-center justify-center rounded border transition-colors duration-150 ${
       isSelected ? "border-primary bg-primary" : "border-border/50 bg-background"
      }`} style={{ opacity: isSelected || isRowHovered ? 1 : 0 }}>
       {isSelected && <Check size={10} className="text-white" />}
      </span>
     </label>
    ) : (
     <span className="select-none text-xs tabular-nums text-muted-foreground/60">{rowIdx + 1}</span>
    )}
   </div>

   {/* Title cell */}
   <div
    className="flex shrink-0 items-center gap-2.5 px-3"
    style={{ width: TITLE_COL_W, minWidth: TITLE_COL_W, height: ROW_H, borderRight: "1px solid var(--color-border)" }}
   >
    {entry.icon ? (
     <span className="shrink-0 text-base leading-none">{entry.icon}</span>
    ) : (
     <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-border/40 bg-muted/20">
      <FileText size={11} className="text-muted-foreground/60" />
     </span>
    )}

    {activeCell?.entryId === entry.id && activeCell.propId === "__title__" ? (
     <input
      ref={cellInputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => { onUpdateTitle(entry.id, editValue); setActiveCell(null); }}
      onKeyDown={(e) => {
       if (e.key === "Enter" || e.key === "Tab") { onUpdateTitle(entry.id, editValue); setActiveCell(null); e.preventDefault(); }
       if (e.key === "Escape") setActiveCell(null);
      }}
      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none"
      placeholder="Untitled"
     />
    ) : (
     <span
      onClick={() => {
       const inPanelMode = (activeView?.entryOpenMode ?? "side_panel") === "side_panel";
       if (inPanelMode && onOpenEntry) {
        onOpenEntry(entry);
       } else if (isEditor) {
        setActiveCell({ entryId: entry.id, propId: "__title__" });
        setEditValue(entry.title ?? "");
       }
      }}
      className={`min-w-0 flex-1 truncate text-sm font-medium cursor-pointer ${
       entry.title ? "text-foreground" : "text-muted-foreground/60"
      }`}
     >
      {entry.title || "Untitled"}
     </span>
    )}

    {/* Row actions: open full page + more */}
    <div className="ml-auto flex shrink-0 items-center gap-0.5 transition-opacity duration-150"
     style={{ opacity: isRowHovered ? 1 : 0 }}>
     <Link
      href={`/app/${workspaceSlug}/${entry.shortId}`}
      className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/70 transition-colors hover:bg-accent hover:text-muted-foreground"
      title="Open full page"
      onClick={(e) => e.stopPropagation()}
     >
      <ArrowSquareOut size={12} />
     </Link>
     {isEditor && (
      <button
       onClick={(e) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setRowMenu(rowMenu?.entryId === entry.id ? null : { entryId: entry.id, shortId: entry.shortId, rect });
       }}
       className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/70 transition-colors hover:bg-accent hover:text-muted-foreground"
      >
       <DotsThree size={13} />
      </button>
     )}
    </div>
   </div>

   {/* Property cells */}
   {visible.map((prop) => {
    const rawVal  = getRaw(entry.id, prop.id);
    const isActive = activeCell?.entryId === entry.id && activeCell.propId === prop.id;
    return (
     <div
      key={prop.id}
      className={[
       "group relative flex shrink-0 cursor-pointer items-center overflow-hidden px-3 transition-colors duration-100",
       isActive
        ? "bg-primary/5 border-l border-primary/30"
        : "hover:bg-muted/40",
      ].join(" ")}
      style={{ width: colW(prop.id), minWidth: colW(prop.id), height: ROW_H }}
      onClick={(e) => activateCell(entry.id, prop.id, e)}
     >
      {isActive && TEXT_TYPES.has(prop.type) ? (
       <input
        ref={cellInputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => commitText(entry.id, prop.id, editValue)}
        onKeyDown={(e) => {
         if (e.key === "Enter" || e.key === "Tab") { commitText(entry.id, prop.id, editValue); e.preventDefault(); }
         if (e.key === "Escape") setActiveCell(null);
        }}
        type={prop.type === "number" ? "number" : "text"}
        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
       />
      ) : rawVal ? (
       <CellDisplay property={prop} value={rawVal} compact />
      ) : (
       <>
        <CellDisplay property={prop} value={rawVal} compact />
        {isEditor && TEXT_TYPES.has(prop.type) && (
         <span className="pointer-events-none select-none text-sm text-muted-foreground/60 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
          Type…
         </span>
        )}
       </>
      )}
     </div>
    );
   })}

   {isEditor && <div className="shrink-0" style={{ width: addBtnW, height: ROW_H }} />}
  </div>
 );
}

// ── TableView ────────────────────────────────────────────────────────────────

export function TableView({
 workspaceId, workspaceSlug, entries, properties, valueMap, activeView, isEditor,
 onUpdateValue, onUpdateTitle, onCreateEntry, onAddProperty, onUpdateProperty,
 onDeleteProperty, onUpdateView, onDeleteEntry, selectedEntryIds, onSelectEntry, onOpenEntry,
}: SharedViewProps) {
 const [activeCell, setActiveCell]   = useState<ActiveCell | null>(null);
 const [editValue, setEditValue]    = useState("");
 const [editPop, setEditPop]      = useState<EditPop | null>(null);
 const [propMenu, setPropMenu]     = useState<PropMenuState | null>(null);
 const [addPropMenu, setAddPropMenu]  = useState<AddPropState | null>(null);
 const [propName, setPropName]     = useState("");
 const [renamingProp, setRenamingProp] = useState<string | null>(null);
 const [renameVal, setRenameVal]    = useState("");
 const [rowMenu, setRowMenu]      = useState<RowMenuState | null>(null);
 const [deleteConfirm, setDeleteConfirm] = useState<{ entryId: string } | null>(null);
 const [deletingEntry, setDeletingEntry] = useState(false);
 const [hoveredRowId, setHoveredRowId]   = useState<string | null>(null);
 const [colWidths, setColWidths]    = useState<Record<string, number>>({});
 const cellInputRef          = useRef<HTMLInputElement>(null);
 // DnD state: when grouped, keyed by group id; when ungrouped, keyed by "__flat__"
 const [localEntryOrder, setLocalEntryOrder] = useState<Map<string, string[]>>(new Map());
 const [draggingId, setDraggingId]      = useState<string | null>(null);

 const hiddenIds = new Set((activeView?.hiddenPropertyIds ?? []) as string[]);
 const visible  = properties.filter((p) => !p.isSystem && !hiddenIds.has(p.id));

 const allSelected = entries.length > 0 && entries.every((e) => selectedEntryIds.has(e.id));
 const someSelected = entries.some((e) => selectedEntryIds.has(e.id));

 function getRaw(entryId: string, propId: string) {
  return valueMap.get(entryId)?.get(propId) ?? null;
 }
 function getTextVal(entryId: string, propId: string): string {
  const v  = getRaw(entryId, propId) as Record<string, unknown> | null;
  const prop = visible.find((p) => p.id === propId);
  if (!prop) return "";
  return String(v?.[prop.type as keyof typeof v] ?? "");
 }
 function colW(id: string) { return colWidths[id] ?? DEFAULT_COL_W; }

 function activateCell(entryId: string, propId: string, e: React.MouseEvent) {
  if (!isEditor) return;
  const prop = visible.find((p) => p.id === propId);
  if (!prop) return;
  if (prop.type === "checkbox") {
   const cur = getRaw(entryId, propId) as { checked?: boolean } | null;
   onUpdateValue(entryId, propId, { checked: !(cur?.checked ?? false) });
   return;
  }
  if (TEXT_TYPES.has(prop.type)) {
   setActiveCell({ entryId, propId });
   setEditValue(getTextVal(entryId, propId));
   setTimeout(() => cellInputRef.current?.focus(), 0);
   return;
  }
  if (POPUP_TYPES.has(prop.type)) {
   const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
   setEditPop({ entryId, propId, rect });
  }
 }

 function commitText(entryId: string, propId: string, raw: string) {
  const prop = visible.find((p) => p.id === propId);
  if (!prop) return;
  const val = prop.type === "number"
   ? { number: raw === "" ? null : Number(raw) }
   : { [prop.type]: raw };
  onUpdateValue(entryId, propId, val);
  setActiveCell(null);
 }

 // Column resize
 function startResize(propId: string, startX: number, startW: number) {
  function onMove(e: MouseEvent) {
   const newW = Math.max(MIN_COL_W, startW + (e.clientX - startX));
   setColWidths((prev) => ({ ...prev, [propId]: newW }));
  }
  function onUp() {
   document.removeEventListener("mousemove", onMove);
   document.removeEventListener("mouseup", onUp);
   document.body.style.cursor = "";
   document.body.style.userSelect = "";
  }
  document.body.style.cursor  = "col-resize";
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
 }

 const propsW  = visible.reduce((s, p) => s + colW(p.id), 0);
 const addBtnW  = isEditor ? 52 : 0;
 const totalW  = DRAG_COL_W + IDX_COL_W + TITLE_COL_W + propsW + addBtnW;

 // Grouping
 const groupPropId = activeView?.groupByPropertyId;
 const groupProp  = groupPropId ? properties.find((p) => p.id === groupPropId && p.type === "select") : null;

 type RowGroup = { id: string | null; label: string; color: string | null; entries: DbEntry[] };
 let rowGroups: RowGroup[] | null = null;
 if (groupProp) {
  const opts = (groupProp.config?.options ?? []) as SelectOption[];
  const gMap = new Map<string | null, RowGroup>();
  gMap.set(null, { id: null, label: `No ${groupProp.name}`, color: null, entries: [] });
  opts.forEach((o) => gMap.set(o.id, { id: o.id, label: o.name, color: o.color, entries: [] }));
  for (const e of entries) {
   const val = valueMap.get(e.id)?.get(groupPropId!) as { optionId?: string } | null;
   const key = val?.optionId ?? null;
   (gMap.get(key) ?? gMap.get(null)!).entries.push(e);
  }
  rowGroups = [...gMap.values()].filter((g) => g.entries.length > 0 || g.id === null);
 }

 // DnD sensors
 const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
 );

 // Reset local order when entries change
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(() => { setLocalEntryOrder(new Map()); }, [entries.map((e) => e.id).join(",")]);

 const draggingEntry = draggingId ? entries.find((e) => e.id === draggingId) : null;

 function getOrderedEntries(groupKey: string, groupEntries: DbEntry[]): DbEntry[] {
  const order = localEntryOrder.get(groupKey);
  if (!order || order.length === 0) return groupEntries;
  return order.map((id) => groupEntries.find((e) => e.id === id)).filter(Boolean) as DbEntry[];
 }

 function handleDragStart(event: DragStartEvent) {
  setDraggingId(String(event.active.id));
 }

 function handleDragEnd(groupKey: string, groupEntries: DbEntry[], event: DragEndEvent) {
  const { active, over } = event;
  setDraggingId(null);
  if (!over || active.id === over.id) return;
  const currentOrder = localEntryOrder.get(groupKey);
  const base = currentOrder && currentOrder.length > 0
   ? currentOrder
   : groupEntries.map((e) => e.id);
  const oldIdx = base.indexOf(String(active.id));
  const newIdx = base.indexOf(String(over.id));
  if (oldIdx === -1 || newIdx === -1) return;
  setLocalEntryOrder((prev) => {
   const next = new Map(prev);
   next.set(groupKey, arrayMove(base, oldIdx, newIdx));
   return next;
  });
 }

 return (
  <div className="h-full overflow-auto bg-background pb-20 isolate">
   <div style={{ minWidth: totalW, paddingRight: 32 }}>

    {/* ═══════════ HEADER ═══════════ */}
    <div className="sticky top-0 z-20 flex items-stretch db-header-b bg-card border-b border-border/60">
     {/* Drag handle header (empty) */}
     <div
      className="shrink-0 bg-muted/30"
      style={{ width: DRAG_COL_W, minWidth: DRAG_COL_W }}
     />

     {/* Checkbox / select-all */}
     <div
      className="flex shrink-0 items-center justify-center bg-muted/30"
      style={{ width: IDX_COL_W, minWidth: IDX_COL_W }}
     >
      {isEditor && (
       <label className="flex cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <input
         type="checkbox"
         checked={allSelected}
         ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
         onChange={(e) => {
          entries.forEach((entry) => onSelectEntry(entry.id, e.target.checked));
         }}
         className="sr-only"
        />
        <span className={`flex size-[15px] items-center justify-center rounded border transition-colors duration-150 ${
         allSelected
          ? "border-primary bg-primary"
          : someSelected
           ? "border-primary bg-primary/20"
           : "border-border/60 bg-background hover:border-primary/50"
        }`}>
         {allSelected && (
          <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
           <polyline points="2 6 5 9 10 3"/>
          </svg>
         )}
         {someSelected && !allSelected && (
          <span className="block h-0.5 w-2 rounded-full bg-primary" />
         )}
        </span>
       </label>
      )}
     </div>

     {/* Name header */}
     <div
      className="flex shrink-0 items-center gap-2 bg-muted/30 px-3 py-0"
      style={{ width: TITLE_COL_W, minWidth: TITLE_COL_W, height: 34, borderRight: "1px solid var(--color-border)" }}
     >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/60">
       <TextT size={10} className="text-muted-foreground/60" />
      </span>
      <span className="text-xs font-semibold text-muted-foreground tracking-wide">Name</span>
     </div>

     {/* Property headers */}
     {visible.map((prop) => {
      const Icon = PROP_ICONS[prop.type] ?? TextT;
      return (
       <div
        key={prop.id}
        className="group relative shrink-0"
        style={{ width: colW(prop.id), minWidth: colW(prop.id), height: 34 }}
       >
        {renamingProp === prop.id ? (
         <input
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onBlur={() => { if (renameVal.trim()) onUpdateProperty(prop.id, { name: renameVal.trim() }); setRenamingProp(null); }}
          onKeyDown={(e) => {
           if (e.key === "Enter") { if (renameVal.trim()) onUpdateProperty(prop.id, { name: renameVal.trim() }); setRenamingProp(null); }
           if (e.key === "Escape") setRenamingProp(null);
          }}
          autoFocus
          className="h-full w-full bg-transparent px-3 text-xs font-semibold text-foreground/70 focus:outline-none"
         />
        ) : (
         <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
           if (!isEditor) return;
           const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
           setPropMenu(propMenu?.propId === prop.id ? null : { propId: prop.id, rect });
          }}
          className="flex h-full w-full items-center gap-2 bg-muted/30 px-3 transition-colors hover:bg-accent/60"
         >
          <span className="flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/50">
           <Icon size={10} />
          </span>
          <span className="truncate text-xs font-semibold text-muted-foreground tracking-wide">{prop.name}</span>
         </button>
        )}
        {/* Resize handle */}
        {isEditor && (
         <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/40"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startResize(prop.id, e.clientX, colW(prop.id)); }}
         />
        )}
       </div>
      );
     })}

     {/* Add property */}
     {isEditor && (
      <div className="shrink-0" style={{ width: addBtnW, minWidth: addBtnW, height: 34 }}>
       <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
         const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
         setAddPropMenu(addPropMenu ? null : { rect });
        }}
        className="flex size-full items-center justify-center text-muted-foreground/60 transition-colors hover:bg-accent/60 hover:text-muted-foreground"
        title="Add property"
       >
        <Plus size={13} />
       </button>
      </div>
     )}
    </div>

    {/* ═══════════ ROWS ═══════════ */}
    {(rowGroups ?? [{ id: null, label: "", color: null, entries }] as RowGroup[]).flatMap((group, gIdx) => {
     const groupKey = group.id ?? "__flat__";
     const orderedGroupEntries = getOrderedEntries(groupKey, group.entries);

     const groupHeader = rowGroups && (
      <div
       key={`gh-${gIdx}`}
       className="flex items-center gap-2.5 border-b border-border/40 bg-muted/20 px-3 py-2"
      >
       {group.id && group.color ? (() => {
        const c = getOptionColor(group.color);
        return (
         <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
          {group.label}
         </span>
        );
       })() : (
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground/70">
         <span className="size-1.5 rounded-full bg-muted-foreground/30" />
         {group.label}
        </span>
       )}
       <span className="text-xs text-muted-foreground/70">{group.entries.length}</span>
      </div>
     );

     const dndRows = (
      <DndContext
       key={`dnd-${groupKey}`}
       sensors={sensors}
       onDragStart={handleDragStart}
       onDragEnd={(event) => handleDragEnd(groupKey, group.entries, event)}
      >
       <SortableContext items={orderedGroupEntries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        {orderedGroupEntries.map((entry, rowIdx) => (
         <SortableTableRow
          key={entry.id}
          entry={entry}
          rowIdx={rowIdx}
          visible={visible}
          activeCell={activeCell}
          editValue={editValue}
          cellInputRef={cellInputRef}
          selectedEntryIds={selectedEntryIds}
          hoveredRowId={hoveredRowId}
          deleteConfirm={deleteConfirm}
          isEditor={isEditor}
          rowMenu={rowMenu}
          workspaceSlug={workspaceSlug}
          addBtnW={addBtnW}
          activeView={activeView}
          colW={colW}
          onMouseEnter={() => { if (!deleteConfirm) setHoveredRowId(entry.id); }}
          onMouseLeave={() => setHoveredRowId(null)}
          onSelectEntry={onSelectEntry}
          onUpdateTitle={onUpdateTitle}
          onOpenEntry={onOpenEntry}
          setActiveCell={setActiveCell}
          setEditValue={setEditValue}
          setRowMenu={setRowMenu}
          activateCell={activateCell}
          commitText={commitText}
          getRaw={getRaw}
         />
        ))}
       </SortableContext>
       <DragOverlay>
        {draggingEntry && (
         <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 shadow-lg text-sm font-medium text-foreground">
          <GripVertical size={13} className="text-muted-foreground/40" />
          {draggingEntry.title || "Untitled"}
         </div>
        )}
       </DragOverlay>
      </DndContext>
     );

     return groupHeader ? [groupHeader, dndRows] : [dndRows];
    })}

    {/* ═══════════ EMPTY STATE ═══════════ */}
    {entries.length === 0 && (
     <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-muted/50">
       <Table2 size={24} className="text-muted-foreground/70" />
      </div>
      <div className="text-center">
       <p className="text-base font-semibold text-foreground">No entries yet</p>
       <p className="mt-1.5 text-sm text-muted-foreground/60">
        Add your first entry to start building your database
       </p>
      </div>
      {isEditor && (
       <button
        onClick={() => onCreateEntry()}
        className="flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150"
       >
        <Plus size={14} />
        Add first entry
       </button>
      )}
     </div>
    )}

    {/* ═══════════ ADD ROW ═══════════ */}
    {isEditor && entries.length > 0 && (
     <div>
      <button
       onClick={() => onCreateEntry()}
       className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground cursor-pointer w-full"
      >
       <Plus size={13} />
       <span>New entry</span>
      </button>
     </div>
    )}

   </div>

   {/* ═══════════ PORTALS ═══════════ */}

   {rowMenu && isEditor && (
    <RowContextMenu
     menu={rowMenu}
     workspaceSlug={workspaceSlug}
     onDeleteRequest={() => { setDeleteConfirm({ entryId: rowMenu.entryId }); setRowMenu(null); setHoveredRowId(null); }}
     onClose={() => setRowMenu(null)}
    />
   )}

   <ConfirmDialog
    open={!!deleteConfirm}
    onOpenChange={(o) => !o && setDeleteConfirm(null)}
    title="Delete entry?"
    description="This entry and all its content will be permanently deleted. This action cannot be undone."
    confirmLabel="Delete"
    confirmLoadingLabel="Deleting…"
    loading={deletingEntry}
    onConfirm={async () => {
     if (!deleteConfirm) return;
     setDeletingEntry(true);
     await onDeleteEntry(deleteConfirm.entryId);
     setDeletingEntry(false);
     setDeleteConfirm(null);
    }}
   />

   {propMenu && isEditor && (
    <PropHeaderMenu
     menu={propMenu}
     prop={visible.find((p) => p.id === propMenu.propId)}
     onRename={(id) => { const p = visible.find((x) => x.id === id); if (p) { setRenamingProp(id); setRenameVal(p.name); } setPropMenu(null); }}
     onHide={(id) => { onUpdateView({ hiddenPropertyIds: [...((activeView?.hiddenPropertyIds ?? []) as string[]), id] }); setPropMenu(null); }}
     onDelete={async (id) => { await onDeleteProperty(id); setPropMenu(null); }}
     onSort={(id, dir) => { onUpdateView({ sorts: [{ propertyId: id, direction: dir }] }); setPropMenu(null); }}
     onClose={() => setPropMenu(null)}
    />
   )}

   {addPropMenu && isEditor && (
    <AddPropertyMenu
     rect={addPropMenu.rect}
     propName={propName}
     onNameChange={setPropName}
     onAdd={async (name, type) => { await onAddProperty(name, type); setAddPropMenu(null); setPropName(""); }}
     onClose={() => { setAddPropMenu(null); setPropName(""); }}
    />
   )}

   {editPop && (
    <CellEditorPopover
     property={visible.find((p) => p.id === editPop.propId)!}
     value={getRaw(editPop.entryId, editPop.propId)}
     cellRect={editPop.rect}
     workspaceId={workspaceId}
     onSave={(val) => onUpdateValue(editPop.entryId, editPop.propId, val)}
     onClose={() => setEditPop(null)}
     onPropertyConfigChange={(propId, config) => onUpdateProperty(propId, { config })}
    />
   )}
  </div>
 );
}

// ── RowContextMenu ────────────────────────────────────────────────────────────

interface RowContextMenuProps {
 menu: RowMenuState;
 workspaceSlug: string;
 onDeleteRequest: () => void;
 onClose: () => void;
}

function RowContextMenu({ menu, workspaceSlug, onDeleteRequest, onClose }: RowContextMenuProps) {
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => {
  function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [onClose]);

 return createPortal(
  <div
   ref={ref}
   style={{ position: "fixed", top: menu.rect.bottom + 6, left: menu.rect.left, zIndex: 300 }}
   className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background p-1.5"
  >
   <Link
    href={`/app/${workspaceSlug}/${menu.shortId}`}
    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    onClick={onClose}
   >
    <ArrowSquareOut size={13} /> Open full page
   </Link>
   <div className="my-1 h-px bg-border/60" />
   <button
    onClick={onDeleteRequest}
    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-destructive transition-colors duration-150 hover:bg-destructive/5"
   >
    <Trash size={13} /> Delete entry
   </button>
  </div>,
  document.body
 );
}

// ── PropHeaderMenu ────────────────────────────────────────────────────────────

interface PropHeaderMenuProps {
 menu: PropMenuState;
 prop: DbProperty | undefined;
 onRename: (id: string) => void;
 onHide: (id: string) => void;
 onDelete: (id: string) => Promise<void>;
 onSort: (id: string, dir: "asc" | "desc") => void;
 onClose: () => void;
}

function PropHeaderMenu({ menu, prop, onRename, onHide, onDelete, onSort, onClose }: PropHeaderMenuProps) {
 const ref = useRef<HTMLDivElement>(null);
 const [confirmDelete, setConfirmDelete] = useState(false);
 useEffect(() => {
  function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node) && !confirmDelete) onClose(); }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [onClose, confirmDelete]);

 const sortable = prop && ["text", "number", "select", "date", "checkbox"].includes(prop.type);

 return createPortal(
  <>
   <div
    ref={ref}
    style={{ position: "fixed", top: menu.rect.bottom + 4, left: menu.rect.left, zIndex: 300 }}
    className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background p-1.5"
   >
    {sortable && (
     <>
      <button onClick={() => onSort(menu.propId, "asc")} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground hover:bg-accent"><SortAscending size={13} /> Sort A → Z</button>
      <button onClick={() => onSort(menu.propId, "desc")} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground hover:bg-accent"><SortDescending size={13} /> Sort Z → A</button>
      <div className="my-1 h-px bg-border/60" />
     </>
    )}
    <button onClick={() => onRename(menu.propId)} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground hover:bg-accent"><TextT size={13} /> Rename</button>
    <button onClick={() => onHide(menu.propId)} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground hover:bg-accent"><EyeSlash size={13} /> Hide column</button>
    <div className="my-1 h-px bg-border/60" />
    <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-destructive transition-colors duration-150 hover:bg-destructive/5"><Trash size={13} /> Delete column</button>
   </div>
   <ConfirmDialog
    open={confirmDelete}
    onOpenChange={(o) => { setConfirmDelete(o); if (!o) onClose(); }}
    title="Delete column?"
    description={`"${prop?.name ?? "This column"}" and all its data will be permanently removed. This cannot be undone.`}
    confirmLabel="Delete column"
    onConfirm={() => { onDelete(menu.propId); onClose(); }}
   />
  </>,
  document.body
 );
}

// ── AddPropertyMenu ───────────────────────────────────────────────────────────

interface AddPropertyMenuProps {
 rect: DOMRect;
 propName: string;
 onNameChange: (v: string) => void;
 onAdd: (name: string, type: string) => void;
 onClose: () => void;
}

function AddPropertyMenu({ rect, propName, onNameChange, onAdd, onClose }: AddPropertyMenuProps) {
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => {
  function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [onClose]);

 const types = Object.values(PROPERTY_REGISTRY).filter((t) => t.type !== "relation");

 return createPortal(
  <div
   ref={ref}
   style={{ position: "fixed", top: rect.bottom + 6, left: Math.max(8, rect.right - 240), zIndex: 300, width: 240 }}
   className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
  >
   <div className="border-b border-border px-3 py-2.5">
    <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground">New property</p>
    <input
     autoFocus
     value={propName}
     onChange={(e) => onNameChange(e.target.value)}
     placeholder="Property name…"
     className="w-full bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none"
     onKeyDown={(e) => e.stopPropagation()}
    />
   </div>
   <div className="max-h-60 overflow-y-auto p-1.5">
    {types.map((def) => {
     const Icon = PROP_ICONS[def.type] ?? TextT;
     return (
      <button
       key={def.type}
       onClick={() => onAdd(propName.trim() || def.label, def.type)}
       className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-foreground hover:bg-accent"
      >
       <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted/50 text-muted-foreground">
        <Icon size={12} />
       </span>
       {def.label}
      </button>
     );
    })}
   </div>
  </div>,
  document.body
 );
}
