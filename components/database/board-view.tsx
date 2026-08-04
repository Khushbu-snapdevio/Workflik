"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
 DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable,
 type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Popover, PopoverButton, PopoverPanel, Radio, RadioGroup, useClose } from "@headlessui/react";
import { Plus, LayoutGrid, X, FileText, PanelLeft, PanelRight, Pencil, GripVertical, MoreHorizontal, MessageSquare, Pin, Settings2, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { toggleSelfVote } from "@/lib/databases/vote";
import { OPTION_COLORS, getOptionColor, PROPERTY_TYPE_ICON } from "@/components/database/property-registry";
import { PageIcon } from "@/components/pages/page-icon";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { resolveDisplayAs, resolveWrapContent } from "@/components/database/view-property-resolver";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import { EditPropertySidePanel } from "@/components/database/edit-property-panel";
import { isGroupableType, areGroupsEditable, deriveGroups, getEntryGroupIds, defaultValueForGroup, valueAfterGroupMove } from "@/components/database/grouping";
import type { SharedViewProps, DbEntry, DbProperty, SelectOption } from "@/components/database/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GroupHeaderMenu } from "@/components/database/group-header-menu";
import { GroupSettingsPanel, type BoardSettings } from "@/components/database/group-settings-panel";
import { EntryContextMenu } from "@/components/database/entry-context-menu";
import { CellCommentPopover } from "@/components/database/cell-comment-popover";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";

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

// Tag drag ids with their column ("card\0<colKey>\0<entryId>") since a Person-grouped board can
// show the same entry in multiple columns (multi-assignee); \0 can't appear in a real uuid/cuid2.
function cardSortId(colKey: string, entryId: string): string {
 return `card\0${colKey}\0${entryId}`;
}
function parseCardSortId(id: string): { colKey: string; entryId: string } | null {
 if (!id.startsWith("card\0")) return null;
 const rest = id.slice("card\0".length);
 const sep = rest.indexOf("\0");
 if (sep === -1) return null;
 return { colKey: rest.slice(0, sep), entryId: rest.slice(sep + 1) };
}

// ── AddOptionPanel ────────────────────────────────────────────────────────────
// Split out (rather than inlined) so it can call useClose() itself instead of BoardView threading Popover's render-prop `close` down.

function AddOptionPanel({
 newOptName, setNewOptName, newOptColor, setNewOptColor, previewColor, options, onAdd, addingOption, addOptInputRef, showTooltip, hideTooltip,
}: {
 newOptName: string;
 setNewOptName: (v: string) => void;
 newOptColor: string;
 setNewOptColor: (v: string) => void;
 previewColor: ReturnType<typeof getOptionColor>;
 options: SelectOption[];
 onAdd: () => void;
 addingOption: boolean;
 addOptInputRef: React.RefObject<HTMLInputElement | null>;
 showTooltip: (label: string, e: React.MouseEvent<HTMLElement>) => void;
 hideTooltip: () => void;
}) {
 const close = useClose();

 // Popover unmounts this panel on every close path — clearing the draft name on unmount
 // means it can never leak a half-typed option name into the next time this is opened.
 useEffect(() => () => setNewOptName(""), []); // eslint-disable-line react-hooks/exhaustive-deps

 return (
  <>
   <div className="mb-3 flex items-center justify-between">
    <p className="text-xs font-semibold tracking-wide text-muted-foreground">
     New option
    </p>
    <button
     onClick={close}
     className="flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-muted-foreground"
    >
     <X size={11} />
    </button>
   </div>

   <input
    ref={addOptInputRef}
    autoFocus
    value={newOptName}
    onChange={(e) => setNewOptName(e.target.value)}
    onKeyDown={(e) => {
     if (e.key === "Enter") onAdd();
    }}
    placeholder="Option name…"
    className="w-full rounded-sm border border-border bg-muted/20 px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground-subtle focus:outline-none"
   />

   <p className="mb-1.5 mt-3 text-xs font-semibold tracking-wide text-muted-foreground">
    Colour
   </p>
   <RadioGroup value={newOptColor} onChange={setNewOptColor} className="flex flex-wrap gap-2">
    {OPTION_COLORS.map((c) => (
     <Radio
      key={c.id}
      value={c.id}
      onMouseEnter={(e) => showTooltip(c.id, e)}
      onMouseLeave={hideTooltip}
      style={{ backgroundColor: c.dot }}
      className="size-5 cursor-pointer rounded-full opacity-50 transition-colors duration-150 hover:opacity-90 data-checked:scale-110 data-checked:opacity-100 data-checked:outline data-checked:outline-2 data-checked:outline-foreground/60"
     />
    ))}
   </RadioGroup>

   <div className="mt-3 flex min-h-6.5 items-center">
    {newOptName.trim() ? (
     <span className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-semibold ${previewColor.bg} ${previewColor.text}`}>
      <span className={`size-1.5 rounded-full ${previewColor.dot}`} />
      {newOptName.trim()}
     </span>
    ) : (
     <span className="text-xs text-muted-foreground">Preview will appear here</span>
    )}
   </div>

   <div className="mt-3 flex gap-2">
    <button
     onClick={onAdd}
     disabled={!newOptName.trim() || addingOption}
     className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
    >
     {addingOption ? <Loader2 size={12} className="animate-spin" /> : "Add option"}
    </button>
    <button
     onClick={close}
     disabled={addingOption}
     className="rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
     Cancel
    </button>
   </div>

   {options.length > 0 && (
    <div className="mt-3 border-t border-border pt-3">
     <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
      Existing options
     </p>
     <div className="flex flex-col gap-1">
      {options.map((opt) => {
       const c = getOptionColor(opt.color);
       return (
        <span
         key={opt.id}
         className="inline-flex w-fit items-center gap-1.5 rounded-xs px-2.5 py-0.5 text-xs font-semibold"
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
  </>
 );
}

// ── BoardView ─────────────────────────────────────────────────────────────────

export function BoardView({
 databaseId, workspaceId, workspaceSlug, entries, properties, valueMap, activeView, isEditor,
 onUpdateValue, onUpdateTitle, onCreateEntry, onUpdateProperty, onDeleteEntry, onDuplicateEntry, onOpenEntry,
 onAddProperty, onDeleteProperty, onUpdateView, onUpdateEntryIcon,
}: SharedViewProps) {
 const [draggingSortId, setDraggingSortId] = useState<string | null>(null);
 const [collapsed, setCollapsed]    = useState<Set<string>>(new Set());
 const [newOptName, setNewOptName]   = useState("");
 const [newOptColor, setNewOptColor]  = useState("blue");
 const [addingOption, setAddingOption] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<DbEntry | null>(null);
 const [deletingEntry, setDeletingEntry] = useState(false);
 const [localEntryOrder, setLocalEntryOrder] = useState<Map<string, string[]>>(new Map());
 const [groupMenu, setGroupMenu]     = useState<{ optionId: string; triggerEl: HTMLElement } | null>(null);
 const [editingGroupsAnchor, setEditingGroupsAnchor] = useState<HTMLElement | null>(null);
 const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ id: string; name: string } | null>(null);
 const [draggingColKey, setDraggingColKey] = useState<string | null>(null);
 const [pinTooltip, setPinTooltip] = useState<{ label: string; rect: DOMRect } | null>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();
 const addOptInputRef         = useRef<HTMLInputElement>(null);
 const editGroupsButtonRef      = useRef<HTMLButtonElement>(null);

 const groupPropId = activeView?.groupByPropertyId;
 const groupProp  = properties.find((p) => p.id === groupPropId && isGroupableType(p.type));

 const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

 // pinTooltip is a `position: fixed` portal anchored to a rect snapshotted
 // once on hover — dismiss it on scroll instead of repositioning, since
 // locking scroll on every hover would hurt the board's own scrolling.
 useEffect(() => {
  if (!pinTooltip) return;
  function handleScroll() { setPinTooltip(null); }
  document.addEventListener("scroll", handleScroll, true);
  return () => document.removeEventListener("scroll", handleScroll, true);
 }, [pinTooltip]);

 if (!groupProp) {
  return (
   <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
    <div className="flex size-16 items-center justify-center rounded-lg bg-muted/40">
     <LayoutGrid size={28} className="text-muted-foreground" />
    </div>
    <div>
     <p className="text-sm font-semibold text-foreground">No group-by property</p>
     <p className="mt-1 text-xs text-muted-foreground">
      Open the <strong>Group</strong> dropdown in the toolbar and pick a Select, Status, Checkbox, or Person property to organise cards into columns.
     </p>
    </div>
   </div>
  );
 }

 // Only select/status have a real, user-managed option list — checkbox/person's
 // groups are derived (see deriveGroups), so `options` is empty (and all the
 // option-CRUD UI below is gated off) for those two types.
 const options: SelectOption[] = (groupProp.config?.options ?? []) as SelectOption[];
 const groupsEditable = areGroupsEditable(groupProp.type);

 const boardSettings = (activeView?.boardSettings ?? {}) as BoardSettings;
 const sortDirection = boardSettings.sortDirection ?? "manual";
 const hideEmptyGroups = !!boardSettings.hideEmptyGroups;
 const colorColumns = boardSettings.colorColumns !== false;
 const baseGroups = deriveGroups(groupProp, entries, valueMap);
 // Display-only sorted copy — the underlying option array (and its index-based drag
 // math in onDragEnd) is untouched, so switching back to Manual restores drag order.
 const displayGroups = sortDirection === "manual"
  ? baseGroups
  : [...baseGroups].sort((a, b) => sortDirection === "asc" ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label));

 // Checkbox never has an "unset" state (always true/false), so a synthetic
 // "No X" bucket would just be permanently, meaninglessly empty — every other
 // groupable type keeps it, matching the original behavior exactly.
 const columns: { id: string | null; label: string; color: string; entries: DbEntry[] }[] = [
  ...(groupProp.type === "checkbox" ? [] : [{ id: null, label: "No " + groupProp.name, color: "gray", entries: [] as DbEntry[] }]),
  ...displayGroups.map((g) => ({ id: g.id, label: g.label, color: g.color ?? "gray", entries: [] as DbEntry[] })),
 ];

 for (const entry of entries) {
  const val = valueMap.get(entry.id)?.get(groupPropId!) ?? null;
  for (const key of getEntryGroupIds(groupProp, val)) {
   const col = columns.find((c) => c.id === key) ?? columns[0];
   col.entries.push(entry);
  }
 }

 // Apply local ordering overrides for within-column reordering
 const orderedColumns = columns.map((col) => {
  const colKey = col.id ?? "no-group";
  const localOrder = localEntryOrder.get(colKey);
  if (!localOrder) return col;
  const entryMap = new Map(col.entries.map((e) => [e.id, e]));
  const sorted = localOrder.map((id) => entryMap.get(id)).filter(Boolean) as DbEntry[];
  // include any entries not in localOrder at the end (safety net)
  const sortedIds = new Set(localOrder);
  const extras = col.entries.filter((e) => !sortedIds.has(e.id));
  return { ...col, entries: [...sorted, ...extras] };
 });

 // Matches Notion: a card shows only its title, plus Status if "Show on card" is enabled.
 // Same rule as Calendar/Gallery.
 const cardProps = properties.filter((p) => !!p.config?.groupedByStatus && !!p.config?.showOnCard);
 const draggingEntryId = draggingSortId ? parseCardSortId(draggingSortId)?.entryId ?? null : null;
 const draggingEntry = draggingEntryId ? entries.find((e) => e.id === draggingEntryId) : null;

 const hiddenGroupOptionIds = boardSettings.hiddenGroupOptionIds ?? [];
 const hideAggregation = !!boardSettings.hideAggregation;
 const visibleColumns = orderedColumns.filter((c) => {
  if (c.id !== null && hiddenGroupOptionIds.includes(c.id)) return false;
  if (hideEmptyGroups && c.id !== null && c.entries.length === 0) return false;
  return true;
 });
 // Whole-column reordering only makes sense for select/status, whose column
 // order is a persisted, user-owned array (`config.options`) — checkbox/person
 // columns are derived fresh every render, so there's nothing to persist a
 // reordering into.
 const draggableColumnKeys = sortDirection === "manual" && groupsEditable
  ? visibleColumns.filter((c) => c.id !== null).map((c) => "colhandle-" + c.id)
  : [];

 // Pinned groups render as a compact chip strip in addition to their normal column —
 // a quick-reference row, independent of that column's hidden/visible state.
 const pinnedGroupIds = boardSettings.pinnedGroupOptionIds ?? [];
 const pinnedColumns = orderedColumns.filter((c) => c.id !== null && pinnedGroupIds.includes(c.id));
 function unpinColumn(optionId: string) {
  onUpdateView({ boardSettings: { ...boardSettings, pinnedGroupOptionIds: pinnedGroupIds.filter((id) => id !== optionId) } });
 }
 function scrollToColumn(colKey: string) {
  document.querySelector(`[data-col-id="${colKey}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
 }

 function onDragStart({ active }: DragStartEvent) {
  const id = String(active.id);
  if (id.startsWith("colhandle-")) { setDraggingColKey(id.slice("colhandle-".length)); return; }
  setDraggingSortId(id);
 }

 function onDragEnd({ active, over }: DragEndEvent) {
  const activeRaw = String(active.id);

  // Whole-column reordering — distinct id prefix so it never collides with card ids.
  if (activeRaw.startsWith("colhandle-")) {
   setDraggingColKey(null);
   if (!over) return;
   const overId = String(over.id);
   if (!overId.startsWith("colhandle-") || activeRaw === overId) return;
   const activeOptId = activeRaw.slice("colhandle-".length);
   const overOptId  = overId.slice("colhandle-".length);
   const oldIdx = options.findIndex((o) => o.id === activeOptId);
   const newIdx = options.findIndex((o) => o.id === overOptId);
   if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
   const nextOptions = arrayMove(options, oldIdx, newIdx);
   onUpdateProperty(groupProp!.id, { config: { ...groupProp!.config, options: nextOptions } });
   return;
  }

  setDraggingSortId(null);
  if (!over || active.id === over.id) return;

  // The column-tagged id (see cardSortId) tells us which column-instance was dragged, since an
  // entry can appear in more than one column and "the" containing column would be ambiguous.
  const overRaw = String(over.id);
  const activeParsed = parseCardSortId(activeRaw);
  if (!activeParsed) return;
  const { colKey: activeColKey, entryId: activeId } = activeParsed;

  const overParsed = parseCardSortId(overRaw);
  const targetColKey = overRaw.startsWith("col-") ? overRaw.slice("col-".length) : overParsed?.colKey;
  if (targetColKey == null) return;

  const activeCol = orderedColumns.find((c) => (c.id ?? "no-group") === activeColKey);
  const targetCol = orderedColumns.find((c) => (c.id ?? "no-group") === targetColKey);
  if (!activeCol || !targetCol) return;

  if (activeColKey === targetColKey) {
   // Within-column reordering
   const currentOrder = activeCol.entries.map((e) => e.id);
   const oldIndex = currentOrder.indexOf(activeId);
   const newIndex = overParsed && overParsed.colKey === targetColKey ? currentOrder.indexOf(overParsed.entryId) : currentOrder.length - 1;
   if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
   const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
   setLocalEntryOrder((prev) => new Map(prev).set(activeColKey, newOrder));
  } else {
   // Cross-column move: call server update and clear local order for both columns
   const currentValue = valueMap.get(activeId)?.get(groupPropId!) ?? null;
   onUpdateValue(activeId, groupPropId!, valueAfterGroupMove(groupProp!, currentValue, activeCol.id, targetCol.id));
   setLocalEntryOrder((prev) => {
    const next = new Map(prev);
    next.delete(activeColKey);
    next.delete(targetColKey);
    return next;
   });
  }
 }

 function deleteGroupOption(optionId: string) {
  const next = options.filter((o) => o.id !== optionId);
  onUpdateProperty(groupProp!.id, { config: { ...groupProp!.config, options: next } });
 }

 async function handleAddOption() {
  const name = newOptName.trim();
  if (!name || addingOption) return;
  const newOpt: SelectOption = { id: crypto.randomUUID(), name, color: newOptColor };
  const updated = [...options, newOpt];
  setAddingOption(true);
  try {
   await onUpdateProperty(groupProp!.id, { config: { ...groupProp!.config, options: updated } });
   setNewOptName("");
   setNewOptColor(OPTION_COLORS[(updated.length) % OPTION_COLORS.length].id);
   setTimeout(() => addOptInputRef.current?.focus(), 0);
  } finally {
   setAddingOption(false);
  }
 }

 const previewColor = getOptionColor(newOptColor);

 return (
  <>
  {/* Always rendered when there's a groupable property — independent of any
      column being visible, unlike the per-column "⋯" menu's own "Edit
      groups" entry. Without this, hiding every group (or the last one) left
      no way back in: GroupSettingsPanel — which already lists hidden groups
      with a toggle to restore them — was only ever reachable from a visible
      column's own menu. */}
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-2">
    <div className="flex flex-wrap items-center gap-2">
     {pinnedColumns.length > 0 && (
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
       <Pin size={11} /> Pinned groups
      </span>
     )}
     {pinnedColumns.map((col) => {
     const color = getOptionColor(col.color);
     const colKey = col.id ?? "no-group";
     return (
      <div
       key={col.id}
       className="flex shrink-0 items-center gap-0.5 rounded-full border border-transparent pl-1 pr-1 py-1 text-xs font-medium"
       style={{ backgroundColor: color.bg, color: color.text }}
      >
       <button
        type="button"
        onClick={() => scrollToColumn(colKey)}
        onMouseEnter={(e) => setPinTooltip({ label: `Jump to ${col.label}`, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
        onMouseLeave={() => setPinTooltip(null)}
        className="flex items-center gap-1.5 rounded-full px-1.5 transition-colors hover:opacity-70"
       >
        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
        {col.label}
        <span className="opacity-70">{col.entries.length}</span>
       </button>
       <button
        type="button"
        onClick={() => unpinColumn(col.id!)}
        onMouseEnter={(e) => setPinTooltip({ label: "Unpin group", rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
        onMouseLeave={() => setPinTooltip(null)}
        className="flex size-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10"
       >
        <Pin size={10} className="shrink-0 opacity-70" />
       </button>
      </div>
     );
    })}
    </div>
    <button
     ref={editGroupsButtonRef}
     type="button"
     onClick={() => setEditingGroupsAnchor(editGroupsButtonRef.current)}
     className="flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
    >
     <Settings2 size={12} />
     Edit groups
     {hiddenGroupOptionIds.length > 0 && (
      <span className="rounded-xs bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
       {hiddenGroupOptionIds.length} hidden
      </span>
     )}
    </button>
   </div>
  <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
   <SortableContext items={draggableColumnKeys} strategy={horizontalListSortingStrategy}>
   {/* overflow-y-hidden is required, not decorative — per spec, `overflow-x:
       auto` with `overflow-y` left at its default `visible` gets silently
       upgraded to `overflow-y: auto` too, turning this row into a second
       vertical scroll container instead of each column scrolling on its own. */}
   <div className="flex items-start gap-3 overflow-x-auto overflow-y-hidden px-6 py-4">

    {/* ── Columns ── */}
    {visibleColumns.map((col) => {
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
      <SortableColumn key={colKey} colKey={colKey} draggable={col.id !== null && !isCollapsed && sortDirection === "manual" && groupsEditable} isDragging={draggingColKey === col.id} isCollapsed={isCollapsed}>
      {(handleProps) => (
      <SortableContext
       id={colKey}
       items={col.entries.map((e) => cardSortId(colKey, e.id))}
       strategy={verticalListSortingStrategy}
      >
       <ColumnDropTarget colKey={colKey} isCollapsed={isCollapsed}>
        <div
         className={`flex flex-col rounded-lg border border-border bg-muted/40 ${isCollapsed ? "w-12" : ""}`}
         data-col-id={colKey}
        >
         {/* Column header */}
         {isCollapsed ? (
          /* Collapsed: vertical pill showing label + count */
          <button
           onClick={toggleCollapse}
           onMouseEnter={(e) => showTooltip(`Expand ${col.label}`, e)}
           onMouseLeave={hideTooltip}
           className="flex h-full flex-col items-center gap-2 py-3"
          >
           {col.id ? (
            <span
             className={`flex size-6 shrink-0 items-center justify-center rounded-xs text-xs font-bold ${colorColumns ? "" : "bg-muted text-muted-foreground"}`}
             style={colorColumns ? { backgroundColor: color.bg, color: color.text } : undefined}
            >
             {col.entries.length}
            </span>
           ) : (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-xs bg-muted text-xs font-bold text-muted-foreground">
             {col.entries.length}
            </span>
           )}
           <span
            className="text-xs font-semibold text-muted-foreground"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
           >
            {col.label}
           </span>
          </button>
         ) : (
          <>
           <div
            {...handleProps}
            style={{ touchAction: handleProps ? "none" : undefined }}
            className={`flex items-center justify-between px-3 py-2.5 ${handleProps ? "cursor-grab" : ""}`}
           >
            <div className="flex min-w-0 items-center gap-2">
            {col.id ? (
             <span
              className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-sm font-semibold ${colorColumns ? "" : "bg-muted text-muted-foreground"}`}
              style={colorColumns ? { backgroundColor: color.bg, color: color.text } : undefined}
             >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: color.dot }} />
              {col.label}
             </span>
            ) : (
             <span className="inline-flex items-center gap-1.5 rounded-xs bg-muted px-2.5 py-1 text-sm font-semibold text-muted-foreground">
              <span className="size-1.5 rounded-full bg-muted-foreground/30" />
              {col.label}
             </span>
            )}
            {!hideAggregation && (
             <span className="ml-1.5 shrink-0 rounded-xs bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {col.entries.length}
             </span>
            )}
            {col.id !== null && pinnedGroupIds.includes(col.id) && (
             <Pin size={12} className="ml-0.5 shrink-0 text-muted-foreground" />
            )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
             {col.id && (
              <button
               onPointerDown={(e) => e.stopPropagation()}
               onClick={(e) => setGroupMenu({ optionId: col.id!, triggerEl: e.currentTarget as HTMLElement })}
               onMouseEnter={(e) => showTooltip("More options", e)}
               onMouseLeave={hideTooltip}
               className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-muted-foreground"
              >
               <MoreHorizontal size={13} />
              </button>
             )}
             <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleCollapse}
              onMouseEnter={(e) => showTooltip("Collapse column", e)}
              onMouseLeave={hideTooltip}
              className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-muted-foreground"
             >
              <PanelLeft size={13} />
             </button>
            </div>
           </div>


           {/* Cards */}
           <div className="flex flex-col gap-2 px-2 pb-2">
            {col.entries.map((entry) => (
             <SortableCard
              key={entry.id}
              sortId={cardSortId(colKey, entry.id)}
              entry={entry}
              cardProps={cardProps}
              properties={properties}
              valueMap={valueMap}
              databaseId={databaseId}
              workspaceSlug={workspaceSlug}
              workspaceId={workspaceId}
              isDragging={draggingSortId === cardSortId(colKey, entry.id)}
              isEditor={isEditor}
              onDeleteEntry={onDeleteEntry}
              onDeleteRequest={setDeleteTarget}
              onDuplicateEntry={onDuplicateEntry}
              onUpdateTitle={onUpdateTitle}
              onUpdateValue={onUpdateValue}
              onUpdateProperty={onUpdateProperty}
              onUpdateEntryIcon={onUpdateEntryIcon}
              activeView={activeView}
              onUpdateView={onUpdateView}
              onOpenEntry={onOpenEntry}
              entryOpenMode={activeView?.entryOpenMode ?? "side_panel"}
             />
            ))}

            {col.entries.length === 0 && (
             <div className="flex h-16 items-center justify-center rounded-md border border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">Drop cards here</span>
             </div>
            )}
           </div>

           {/* Add entry button */}
           {isEditor && (
            <button
             onClick={() => {
              const gv = col.id ? defaultValueForGroup(groupProp, col.id) : undefined;
              const dv = gv ? { [groupPropId!]: gv } : {};
              onCreateEntry(dv);
             }}
             className="mx-2 mb-2 mt-2 flex w-[calc(100%-1rem)] items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2.5 text-xs font-semibold text-primary transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5"
            >
             <Plus size={13} />
             Add entry
            </button>
           )}
          </>
         )}
        </div>
       </ColumnDropTarget>
      </SortableContext>
      )}
      </SortableColumn>
     );
    })}

    {/* ── Add option column — select/status only; checkbox/person's columns
        are derived, not a user-managed option list to add to. ── */}
    {isEditor && groupsEditable && (
     <Popover className="w-65 shrink-0">
      <PopoverButton className="flex h-10 w-full items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground data-open:border-primary/40 data-open:text-foreground">
       <Plus size={13} />
       Add option to &ldquo;{groupProp.name}&rdquo;
      </PopoverButton>
      <PopoverPanel
       anchor={{ to: "bottom start", gap: 4 }}
       transition
       className="z-600 w-65 rounded-lg border border-border bg-background p-3.5 transition duration-100 ease-out data-leave:opacity-0 data-leave:scale-95"
      >
       <AddOptionPanel
        newOptName={newOptName}
        setNewOptName={setNewOptName}
        newOptColor={newOptColor}
        setNewOptColor={setNewOptColor}
        previewColor={previewColor}
        options={options}
        onAdd={handleAddOption}
        addingOption={addingOption}
        addOptInputRef={addOptInputRef}
        showTooltip={showTooltip}
        hideTooltip={hideTooltip}
       />
      </PopoverPanel>
     </Popover>
    )}
   </div>
   </SortableContext>

   <DragOverlay>
    {draggingEntry && (
     <CardShell
      entry={draggingEntry}
      sortId={draggingSortId ?? ""}
      cardProps={cardProps}
      properties={properties}
      valueMap={valueMap}
      databaseId={databaseId}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      dragging
      isEditor={false}
      onDeleteEntry={onDeleteEntry}
      onDeleteRequest={() => {}}
      onUpdateTitle={onUpdateTitle}
      onUpdateValue={onUpdateValue}
      onUpdateProperty={onUpdateProperty}
      onUpdateEntryIcon={onUpdateEntryIcon}
      activeView={activeView}
      onUpdateView={onUpdateView}
      entryOpenMode={activeView?.entryOpenMode ?? "side_panel"}
     />
    )}
   </DragOverlay>
  </DndContext>

  {pinTooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={pinTooltip.rect} label={pinTooltip.label} />,
   document.body,
  )}

  {tooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
   document.body,
  )}

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

  {groupMenu && (() => {
   // Looked up from `columns` (works for every groupable type's derived
   // label), not `options` (select/status only) — `options.find` here would
   // always miss for Checkbox/Person, whose groups never live in
   // `config.options`, silently swallowing the menu for them.
   const col = columns.find((c) => c.id === groupMenu.optionId);
   if (!col) return null;
   return (
    <GroupHeaderMenu
     getAnchorRect={() => groupMenu.triggerEl.getBoundingClientRect()}
     hideAggregation={hideAggregation}
     editable={groupsEditable}
     onEditGroups={() => setEditingGroupsAnchor(groupMenu.triggerEl)}
     onToggleHideAggregation={() => onUpdateView({ boardSettings: { ...boardSettings, hideAggregation: !hideAggregation } })}
     onHideGroup={() => onUpdateView({ boardSettings: { ...boardSettings, hiddenGroupOptionIds: [...hiddenGroupOptionIds, groupMenu.optionId] } })}
     onDeleteGroup={() => setDeleteGroupTarget({ id: col.id!, name: col.label })}
     onClose={() => setGroupMenu(null)}
    />
   );
  })()}

  {editingGroupsAnchor && (
   <GroupSettingsPanel
    groupProp={groupProp}
    properties={properties}
    boardSettings={boardSettings}
    getAnchorRect={() => editingGroupsAnchor.getBoundingClientRect()}
    onUpdateView={onUpdateView}
    onUpdateProperty={onUpdateProperty}
    onClose={() => setEditingGroupsAnchor(null)}
   />
  )}

  <ConfirmDialog
   open={deleteGroupTarget !== null}
   onOpenChange={(o) => { if (!o) setDeleteGroupTarget(null); }}
   title="Delete this group?"
   description={`"${deleteGroupTarget?.name ?? ""}" will be removed. Entries currently in it will show as unset. This cannot be undone.`}
   confirmLabel="Delete"
   onConfirm={() => { if (deleteGroupTarget) deleteGroupOption(deleteGroupTarget.id); setDeleteGroupTarget(null); }}
  />
  </>
 );
}

// ── SortableColumn ───────────────────────────────────────────────────────────
// Uses a distinct "colhandle-" id prefix so column drag never collides with the "col-<key>"
// drop target; only the header (render prop) is the drag handle, not the whole column.

function SortableColumn({
 colKey, draggable, isDragging, isCollapsed, children,
}: {
 colKey:   string;
 draggable: boolean;
 isDragging: boolean;
 isCollapsed: boolean;
 children: (handleProps: Record<string, unknown> | null) => React.ReactElement;
}) {
 const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: "colhandle-" + colKey, disabled: !draggable });
 const style: React.CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.4 : 1,
 };
 const handleProps = draggable ? { ...attributes, ...listeners } : null;

 // Board columns now sit in a horizontally-scrolling flex row (not a
 // wrapping grid) so a workspace with many status options stays in one
 // row instead of pushing later columns onto a second row far below the
 // fold — flex items need an explicit width, unlike grid's `1fr` tracks.
 return (
  <div ref={setNodeRef} style={style} className={`shrink-0 ${isCollapsed ? "w-12" : "w-65"}`}>
   {children(handleProps)}
  </div>
 );
}

// ── ColumnDropTarget ──────────────────────────────────────────────────────────
// Uses a distinct id ("col-<key>") so it doesn't collide with SortableContext.id.

function ColumnDropTarget({ colKey, isCollapsed, children }: { colKey: string; isCollapsed: boolean; children: React.ReactNode }) {
 const { setNodeRef } = useDroppable({ id: "col-" + colKey });
 return (
  <div ref={setNodeRef} className={isCollapsed ? "w-12" : ""}>
   {children}
  </div>
 );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
 entry: DbEntry;
 /** dnd-kit drag id — tagged with the rendering column (see cardSortId), NOT
  *  just `entry.id`, so a Person-grouped card shown in two columns at once
  *  registers as two distinct draggables instead of colliding. */
 sortId: string;
 cardProps: SharedViewProps["properties"];
 /** The full, unrestricted property list — needed to look up Status even
  *  before "Show on card" is enabled, since at that point it isn't in
  *  `cardProps` yet. */
 properties: SharedViewProps["properties"];
 valueMap: Map<string, Map<string, unknown>>;
 databaseId: string;
 workspaceSlug: string;
 workspaceId: string;
 isEditor: boolean;
 onDeleteEntry: SharedViewProps["onDeleteEntry"];
 onDeleteRequest: (entry: DbEntry) => void;
 onDuplicateEntry?: SharedViewProps["onDuplicateEntry"];
 onOpenEntry?: SharedViewProps["onOpenEntry"];
 onUpdateEntryIcon?: SharedViewProps["onUpdateEntryIcon"];
 onUpdateTitle: SharedViewProps["onUpdateTitle"];
 onUpdateValue: SharedViewProps["onUpdateValue"];
 onUpdateProperty: SharedViewProps["onUpdateProperty"];
 activeView: SharedViewProps["activeView"];
 onUpdateView: SharedViewProps["onUpdateView"];
 entryOpenMode?: "side_panel" | "full_page";
 isDragging?: boolean;
 dragging?: boolean;
}

function SortableCard(props: CardProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.sortId });
 const style: React.CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.4 : 1,
  touchAction: "none",   // required for PointerSensor to fire reliably
  userSelect: "none",
  cursor: "grab",
 };
 return (
  // The whole card is the drag handle. Interactive children stop propagation
  // on pointerDown so clicking buttons/links never accidentally starts a drag.
  <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
   <CardShell {...props} />
  </div>
 );
}

function CardShell({ entry, cardProps, properties, valueMap, databaseId, workspaceSlug, workspaceId, dragging, isEditor, onDeleteRequest, onDuplicateEntry, onUpdateTitle, onUpdateValue, onUpdateProperty, onUpdateEntryIcon, activeView, onUpdateView, onOpenEntry, entryOpenMode }: CardProps) {
 const [hovered, setHovered] = useState(false);
 const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
 const [commentAnchor, setCommentAnchor] = useState<DOMRect | null>(null);
 const [commentCount, setCommentCount]  = useState<number | null>(entry.commentCount ?? null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();
 const [editing, setEditing] = useState(false);
 const [editTitle, setEditTitle] = useState(entry.title ?? "");
 const [propEditor, setPropEditor] = useState<{ prop: DbProperty; rect: DOMRect } | null>(null);
 const [editPropPanel, setEditPropPanel] = useState<{ propId: string; anchorRect: DOMRect } | null>(null);
 const { data: session } = useSession();

 // Vote-mode person: toggles the current viewer's own vote directly instead
 // of opening the full people picker — same rule as table-view.tsx's
 // activateCell, enforced independently server-side either way. Returns
 // true if it handled the click (caller should skip opening the picker).
 function handleVoteClick(prop: DbProperty, entryId: string): boolean {
  if (prop.type !== "person" || !prop.config?.voteMode) return false;
  if (!session?.user?.id) return true;
  onUpdateValue(entryId, prop.id, toggleSelfVote(valueMap.get(entryId)?.get(prop.id) as { userIds?: string[] } | null, session.user));
  return true;
 }
 const cardRef = useRef<HTMLDivElement>(null);
 const filledProps = cardProps.filter((prop) =>
  hasDisplayValue(prop, valueMap.get(entry.id)?.get(prop.id) ?? null)
 );
 const emptyProps = editing ? cardProps.filter((prop) =>
  !hasDisplayValue(prop, valueMap.get(entry.id)?.get(prop.id) ?? null)
 ) : [];

 // entry.commentCount is batch-computed server-side, so no per-card fetch is needed; re-sync on
 // refetch, while `onCommentAdded` bumps it instantly in between.
 useEffect(() => { setCommentCount(entry.commentCount ?? 0); }, [entry.commentCount]);

 useEffect(() => {
  if (!editing) return;
  function h(e: MouseEvent) {
   if (menuPos || commentAnchor || propEditor) return; // a nested popover owns this click
   const target = e.target as HTMLElement;
   if (cardRef.current && !cardRef.current.contains(target)) setEditing(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [editing, menuPos, commentAnchor, propEditor]);

 function commitTitle() {
  const trimmed = editTitle.trim();
  if (trimmed !== (entry.title ?? "")) onUpdateTitle(entry.id, trimmed);
 }

 return (
  <>
  <div
   ref={cardRef}
   className={[
    "group rounded-md border bg-card transition-colors duration-150",
    dragging ? "border-primary/40 opacity-50" : "border-border",
   ].join(" ")}
   onMouseEnter={() => setHovered(true)}
   onMouseLeave={() => setHovered(false)}
   onContextMenu={(e) => {
    if (!isEditor) return;
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
   }}
  >
   <>
    {entry.coverUrl && (
      <div
       className="h-20 w-full rounded-t-md bg-cover bg-center"
       style={{ backgroundImage: `url(${entry.coverUrl})` }}
      />
     )}

     <div className="p-3.5">
      {/* Title row */}
      <div className="flex items-start gap-2">
       {/* h-5 matches the title's own line height (text-sm leading-snug) so
           the grip and icon center against the title's first line instead of
           sitting at a manually-guessed offset from the row's top. */}
       <span className="flex h-5 shrink-0 items-center">
        {/* Grip icon — visual indicator only; the whole card is the drag handle */}
        <GripVertical
         size={13}
         className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-40 text-muted-foreground"
        />
       </span>

       <span className="flex h-5 shrink-0 items-center">
        {entry.icon ? (
         <PageIcon icon={entry.icon} size={14} className="shrink-0" />
        ) : (
         <FileText size={12} className="shrink-0 text-muted-foreground" />
        )}
       </span>
       {editing ? (
        <input
         autoFocus
         value={editTitle}
         onChange={(e) => {
          setEditTitle(e.target.value);
          window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: entry.id, title: e.target.value } }));
         }}
         onPointerDown={(e) => e.stopPropagation()}
         onBlur={commitTitle}
         onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commitTitle(); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setEditTitle(entry.title ?? ""); setEditing(false); }
         }}
         placeholder="Untitled"
         className="min-w-0 flex-1 overflow-hidden text-ellipsis bg-transparent text-sm font-semibold leading-snug text-foreground outline-none"
        />
       ) : (
        <button
         style={{ cursor: "pointer" }}
         onPointerDown={(e) => e.stopPropagation()}
         onClick={() => entryOpenMode === "side_panel" && onOpenEntry ? onOpenEntry(entry) : undefined}
         className={`min-w-0 flex-1 truncate text-left text-sm font-semibold leading-snug text-foreground transition-colors duration-150 ${
          entryOpenMode === "side_panel" && onOpenEntry ? "hover:text-muted-foreground" : "cursor-default"
         }`}
        >
         {entry.title || <span className="font-normal text-muted-foreground">Untitled</span>}
        </button>
       )}

       {/* Action buttons — visible on hover. One shared bordered pill (not a
           separate gray circle per icon) matching the same hover-action box
           used by the comment thread's own action pill (comment-card.tsx) —
           icons only highlight individually via hover:bg-accent, the box
           itself carries the visible border/background. */}
       <div
        className="flex shrink-0 items-center gap-px rounded-sm border border-border bg-card px-0.5 py-0.5 transition-opacity"
        style={{ opacity: hovered || editing ? 1 : 0 }}
       >
        {isEditor && !editing ? (
         <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
           e.stopPropagation();
           // The icon swaps to the side-peek icon in the same spot the cursor is
           // already resting on, so no fresh hover event will fire to update the
           // tooltip — set it directly instead of clearing it to null.
           showTooltip("Open full page", e);
           setEditTitle(entry.title ?? "");
           setEditing(true);
          }}
          onMouseEnter={(e) => showTooltip("Edit", e)}
          onMouseLeave={hideTooltip}
          style={{ cursor: "pointer" }}
          className="flex size-6 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
         >
          <Pencil size={12} />
         </button>
        ) : (
         <Link
          href={`/app/${workspaceSlug}/${entry.shortId}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseEnter={(e) => showTooltip("Open full page", e)}
          onMouseLeave={hideTooltip}
          style={{ cursor: "pointer" }}
          className="flex size-6 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
         >
          <PanelRight size={12} />
         </Link>
        )}
        {isEditor && (
         <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
           e.stopPropagation();
           hideTooltip();
           setMenuPos({ x: e.clientX, y: e.clientY });
          }}
          onMouseEnter={(e) => showTooltip("More options", e)}
          onMouseLeave={hideTooltip}
          style={{ cursor: "pointer" }}
          className="flex size-6 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
         >
          <MoreHorizontal size={12} />
         </button>
        )}
       </div>
      </div>

      {/* Non-empty properties + comment count — clickable (same value editor
          empty properties already open below) so a filled property's value,
          and for Status specifically its Display As/Wrap content, can be
          changed right from the card instead of only from Table's column
          header. */}
      {(filledProps.length > 0 || !!commentCount) && (
       <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
        {filledProps.map((prop) => {
         const raw = valueMap.get(entry.id)?.get(prop.id) ?? null;
         return (
          <button
           key={prop.id}
           type="button"
           onPointerDown={(e) => e.stopPropagation()}
           onClick={(e) => {
            e.stopPropagation();
            if (handleVoteClick(prop, entry.id)) return;
            setPropEditor({ prop, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
           }}
           className="min-w-0 shrink-0 rounded-xs text-left hover:bg-accent"
          >
           <CellDisplay property={prop} value={raw} compact resolvedDisplayAs={resolveDisplayAs(prop, activeView)} resolvedWrapContent={resolveWrapContent(prop, activeView)} workspaceId={workspaceId} />
          </button>
         );
        })}
        {!!commentCount && (
         <button
          onPointerDown={(e) => e.stopPropagation()}
          // Exempt from CellCommentPopover's capture-phase outside-click close,
          // which would otherwise close the popover just before the toggle
          // below reopened it.
          data-comment-exempt
          onClick={(e) => {
           e.stopPropagation();
           // Toggle: a second click closes the popover this badge opened.
           const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
           setCommentAnchor((cur) => (cur ? null : rect));
          }}
          className="inline-flex items-center gap-1 rounded-xs bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70"
          onMouseEnter={(e) => showTooltip("View comments", e)}
          onMouseLeave={hideTooltip}
         >
          <MessageSquare size={11} />
          {commentCount}
         </button>
        )}
       </div>
      )}

      {/* Quick-add empty properties — only while editing, matching Notion's inline card editor */}
      {emptyProps.length > 0 && (
       <div className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
        {emptyProps.map((prop) => {
         const TypeIcon = PROPERTY_TYPE_ICON[prop.type as keyof typeof PROPERTY_TYPE_ICON];
         const propConfig = (prop.config ?? {}) as { icon?: string };
         return (
          <button
           key={prop.id}
           type="button"
           onPointerDown={(e) => e.stopPropagation()}
           onClick={(e) => {
            e.stopPropagation();
            if (handleVoteClick(prop, entry.id)) return;
            setPropEditor({ prop, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
           }}
           className="flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
           {propConfig.icon ? <PageIcon icon={propConfig.icon} size={12} className="shrink-0" /> : <TypeIcon size={12} className="shrink-0" />}
           Add {prop.name}
          </button>
         );
        })}
       </div>
      )}
     </div>
   </>
  </div>

  {tooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
   document.body,
  )}

  <EntryContextMenu
   entryId={entry.id}
   entryShortId={entry.shortId}
   entryIcon={entry.icon ?? null}
   updatedAt={entry.updatedAt ?? null}
   databaseId={databaseId}
   workspaceId={workspaceId}
   workspaceSlug={workspaceSlug}
   forcePos={menuPos}
   entryRect={cardRef.current?.getBoundingClientRect() ?? null}
   onClose={() => setMenuPos(null)}
   onIconChange={(icon) => onUpdateEntryIcon?.(entry.id, icon)}
   onDelete={() => { setHovered(false); onDeleteRequest(entry); }}
   onDuplicate={onDuplicateEntry ? () => onDuplicateEntry(entry.id) : undefined}
   onOpenEntry={entryOpenMode === "side_panel" && onOpenEntry ? () => onOpenEntry(entry) : undefined}
   onCommentAdded={() => setCommentCount((c) => (c ?? 0) + 1)}
   onValueChange={(propId, value) => onUpdateValue(entry.id, propId, value)}
   onPropertyConfigChange={onUpdateProperty}
   activeView={activeView}
   onUpdateView={onUpdateView}
  />

  {commentAnchor && (
   <CellCommentPopover
    pageId={entry.id}
    workspaceId={workspaceId}
    workspaceSlug={workspaceSlug}
    entryShortId={entry.shortId}
    anchorRect={commentAnchor}
    onClose={() => setCommentAnchor(null)}
    onCommentAdded={() => setCommentCount((c) => (c ?? 0) + 1)}
   />
  )}

  {propEditor && (
   <CellEditorPopover
    property={propEditor.prop}
    value={valueMap.get(entry.id)?.get(propEditor.prop.id) ?? null}
    cellRect={propEditor.rect}
    workspaceId={workspaceId}
    onSave={(v) => { onUpdateValue(entry.id, propEditor.prop.id, v); setPropEditor(null); }}
    onClose={() => setPropEditor(null)}
    onPropertyConfigChange={(propId, config) => onUpdateProperty(propId, { config })}
    onEditProperty={propEditor.prop.config?.groupedByStatus ? (rect) => {
     setEditPropPanel({ propId: propEditor.prop.id, anchorRect: rect });
     setPropEditor(null);
    } : undefined}
   />
  )}

  {editPropPanel && (() => {
   // Looked up from the full properties list, not `cardProps` — Status isn't
   // in `cardProps` yet the very first time this opens (before "Show on
   // card" gets auto-enabled below), so that restricted list can't be used
   // to find the property being edited.
   const panelProp = properties.find((p) => p.id === editPropPanel.propId);
   if (!panelProp) return null;
   return (
    <EditPropertySidePanel
     key={panelProp.id}
     property={panelProp}
     properties={properties}
     workspaceId={workspaceId}
     getAnchorRect={() => {
      // Same convention as Calendar/Gallery: always hangs below the
      // toolbar's own "+New" button, not wherever the card happened to be
      // clicked from, so it opens in the same predictable spot every time.
      const btn = document.querySelector("[data-new-entry-button]")?.getBoundingClientRect();
      if (!btn) return editPropPanel.anchorRect;
      return new DOMRect(btn.right, btn.top, 0, btn.height);
     }}
     onUpdateProperty={(patch) => onUpdateProperty(panelProp.id, patch)}
     // Deleting/duplicating a property is a bigger, cross-view action better
     // done from Table's column header (which already offers it) — this
     // card-level panel exists only to change Status's Display As/Wrap
     // content for this view, so both are disabled here.
     canDelete={false}
     onDeleteProperty={async () => {}}
     onDuplicateProperty={async () => {}}
     onBack={() => setEditPropPanel(null)}
     onClose={() => setEditPropPanel(null)}
     showCardToggle
     viewContext={activeView ? {
      override: activeView.propertyOverrides?.[panelProp.id] ?? {},
      onUpdateOverride: (patch) => onUpdateView({
       propertyOverrides: { ...activeView.propertyOverrides, [panelProp.id]: { ...(activeView.propertyOverrides?.[panelProp.id] ?? {}), ...patch } },
      }),
     } : undefined}
    />
   );
  })()}
  </>
 );
}
