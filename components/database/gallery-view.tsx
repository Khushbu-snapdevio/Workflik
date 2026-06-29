"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ExternalLink, Trash2, LayoutGrid, GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { getOptionColor } from "@/components/database/property-registry";
import type { SharedViewProps, SelectOption, DbEntry } from "@/components/database/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";


const SIZE_COVER: Record<string, string> = {
 small: "h-28",
 medium: "h-44",
 large: "h-60",
};
const SIZE_GRID: Record<string, string> = {
 small: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
 medium: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
 large: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

export function GalleryView({
 workspaceSlug, entries, properties, valueMap, activeView, isEditor,
 onCreateEntry, onDeleteEntry, onOpenEntry,
}: SharedViewProps) {
 const cardSize      = activeView?.galleryCardSize ?? "medium";
 const cardDisplayPropIds = (activeView?.cardDisplayProps ?? []) as string[];
 const entryOpenMode   = activeView?.entryOpenMode ?? "side_panel";
 const [deleteTarget, setDeleteTarget] = useState<DbEntry | null>(null);
 const [deletingEntry, setDeletingEntry] = useState(false);

 // DnD state (ungrouped path only)
 const [localOrder, setLocalOrder] = useState<string[]>([]);
 const [draggingId, setDraggingId] = useState<string | null>(null);

 // Reset order when entries change (add/delete)
 const entryIdKey = entries.map((e) => e.id).join(",");
 useEffect(() => {
  setLocalOrder([]);
 }, [entryIdKey]);

 const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
 );

 const displayProps = cardDisplayPropIds.length > 0
  ? cardDisplayPropIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as typeof properties
  : properties.filter((p) => !p.isSystem).slice(0, 3);

 // Grouping
 const groupPropId = activeView?.groupByPropertyId;
 const groupProp  = groupPropId ? properties.find((p) => p.id === groupPropId && p.type === "select") : null;

 type Group = { id: string | null; label: string; color: string | null; entries: DbEntry[] };
 let groups: Group[] = [];
 if (groupProp) {
  const options = (groupProp.config?.options ?? []) as SelectOption[];
  groups = [
   { id: null, label: `No ${groupProp.name}`, color: null, entries: [] },
   ...options.map((o) => ({ id: o.id, label: o.name, color: o.color, entries: [] as DbEntry[] })),
  ];
  for (const entry of entries) {
   const val = valueMap.get(entry.id)?.get(groupPropId!) as { optionId?: string } | null;
   const g  = groups.find((gr) => gr.id === (val?.optionId ?? null)) ?? groups[0];
   g.entries.push(entry);
  }
  groups = groups.filter((g) => g.entries.length > 0 || g.id === null);
 }

 function renderCards(list: DbEntry[]) {
  return list.map((entry) => (
   <GalleryCard
    key={entry.id}
    entry={entry}
    displayProps={displayProps}
    valueMap={valueMap}
    workspaceSlug={workspaceSlug}
    cardSize={cardSize}
    isEditor={isEditor}
    onDeleteEntry={onDeleteEntry}
    onDeleteRequest={setDeleteTarget}
    onOpenEntry={onOpenEntry}
    entryOpenMode={entryOpenMode}
   />
  ));
 }

 if (groupProp) {
  return (
   <>
   <div className="h-full overflow-auto px-5 py-4">
    {groups.map((group) => {
     const color = group.color ? getOptionColor(group.color) : null;
     return (
      <div key={group.id ?? "no-group"} className="mb-6">
       <div className="mb-3 flex items-center gap-2.5">
        {group.id && color ? (
         <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-1 text-xs font-semibold tracking-wide ${color.bg} ${color.text}`}>
          <span className={`size-1.5 rounded-full ${color.dot}`} />
          {group.label}
         </span>
        ) : (
         <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-muted px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground/60">
          <span className="size-1.5 rounded-full bg-muted-foreground/30" />
          {group.label}
         </span>
        )}
        <span className="text-xs text-muted-foreground/70">{group.entries.length}</span>
        <div className="h-px flex-1 bg-border/50" />
       </div>
       <div className={`grid gap-4 ${SIZE_GRID[cardSize]}`}>
        {renderCards(group.entries)}
        {isEditor && (
         <button
          onClick={() => onCreateEntry(group.id ? { [groupPropId!]: { optionId: group.id } } : {})}
          className={[
           "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-border/40 bg-muted/20",
           "text-muted-foreground/70 transition-colors duration-150 hover:border-border hover:bg-accent hover:text-muted-foreground",
           "h-24",
          ].join(" ")}
         >
          <Plus size={16} />
          <span className="text-xs font-medium">New entry</span>
         </button>
        )}
       </div>
      </div>
     );
    })}
   </div>
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

 // ── Ungrouped path with DnD ────────────────────────────────────────────────

 const orderedEntries =
  localOrder.length > 0
   ? localOrder.map((id) => entries.find((e) => e.id === id)).filter(Boolean) as DbEntry[]
   : entries;

 const draggingEntry = draggingId
  ? entries.find((e) => e.id === draggingId) ?? null
  : null;

 function handleDragStart(event: DragStartEvent) {
  setDraggingId(String(event.active.id));
 }

 function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setDraggingId(null);
  if (!over || active.id === over.id) return;

  const currentIds = orderedEntries.map((e) => e.id);
  const oldIndex = currentIds.indexOf(String(active.id));
  const newIndex = currentIds.indexOf(String(over.id));
  if (oldIndex === -1 || newIndex === -1) return;

  setLocalOrder(arrayMove(currentIds, oldIndex, newIndex));
 }

 return (
  <>
   <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="h-full overflow-auto p-5">
     <SortableContext
      items={orderedEntries.map((e) => e.id)}
      strategy={rectSortingStrategy}
     >
      <div className={`grid gap-4 ${SIZE_GRID[cardSize]}`}>
       {orderedEntries.map((entry) => (
        <SortableGalleryCard
         key={entry.id}
         entry={entry}
         displayProps={displayProps}
         valueMap={valueMap}
         workspaceSlug={workspaceSlug}
         cardSize={cardSize}
         isEditor={isEditor}
         onDeleteEntry={onDeleteEntry}
         onDeleteRequest={setDeleteTarget}
         onOpenEntry={onOpenEntry}
         entryOpenMode={entryOpenMode}
        />
       ))}

       {/* Add entry card — outside SortableContext items */}
       {isEditor && (
        <button
         onClick={() => onCreateEntry()}
         className={[
          "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-border/40 bg-muted/20",
          "text-muted-foreground/70 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
          SIZE_COVER[cardSize],
         ].join(" ")}
        >
         <Plus size={20} />
         <span className="text-xs font-medium">New entry</span>
        </button>
       )}
      </div>
     </SortableContext>
    </div>

    <DragOverlay>
     {draggingEntry && (
      <GalleryCard
       entry={draggingEntry}
       displayProps={displayProps}
       valueMap={valueMap}
       workspaceSlug={workspaceSlug}
       cardSize={cardSize}
       isEditor={false}
       onDeleteEntry={onDeleteEntry}
       onDeleteRequest={() => {}}
       onOpenEntry={onOpenEntry}
       entryOpenMode={entryOpenMode}
       dragging
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

// ── Sortable wrapper ───────────────────────────────────────────────────────────

interface SortableGalleryCardProps extends GalleryCardProps {}

function SortableGalleryCard(props: SortableGalleryCardProps) {
 const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
  useSortable({ id: props.entry.id });

 const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.4 : 1,
  touchAction: "none" as const,
  userSelect: "none" as const,
  cursor: "grab",
 };

 return (
  <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
   <GalleryCard {...props} />
  </div>
 );
}

// ── Gallery card ──────────────────────────────────────────────────────────────

interface GalleryCardProps {
 entry: SharedViewProps["entries"][number];
 displayProps: SharedViewProps["properties"];
 valueMap: Map<string, Map<string, unknown>>;
 workspaceSlug: string;
 cardSize: string;
 isEditor: boolean;
 onDeleteEntry: SharedViewProps["onDeleteEntry"];
 onDeleteRequest: (entry: SharedViewProps["entries"][number]) => void;
 onOpenEntry?: SharedViewProps["onOpenEntry"];
 entryOpenMode?: "side_panel" | "full_page";
 dragging?: boolean;
}

function GalleryCard({ entry, displayProps, valueMap, workspaceSlug, cardSize, isEditor, onDeleteRequest, onOpenEntry, entryOpenMode, dragging }: GalleryCardProps) {
 const [hovered, setHovered] = useState(false);
 const filledProps = displayProps.filter((prop) => {
  const raw = valueMap.get(entry.id)?.get(prop.id) ?? null;
  if (raw == null) return false;
  if (typeof raw !== "object") return true;
  return Object.values(raw as Record<string, unknown>).some(
   (v) => v != null && !(Array.isArray(v) && v.length === 0) && v !== "" && v !== false
  );
 });

 const isSidePanel = entryOpenMode === "side_panel" && !!onOpenEntry;

 return (
   <div
    className={[
     "relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card transition-colors duration-150",
     dragging ? "shadow-xl opacity-90" : "",
    ].join(" ")}
    onMouseEnter={() => !dragging && setHovered(true)}
    onMouseLeave={() => setHovered(false)}
   >
   {/* Grip icon — top-left, visible on hover */}
   <div
    className="pointer-events-none absolute left-2 top-2 z-10 transition-opacity"
    style={{ opacity: hovered ? 0.6 : 0 }}
   >
    <GripVertical size={14} className="text-foreground/70" />
   </div>

   {/* Action buttons — top-right, visible on hover */}
   <div className="absolute right-2 top-2 z-10 flex items-center gap-1 transition-opacity"
    style={{ opacity: hovered ? 1 : 0 }}>
    <Link
    href={`/app/${workspaceSlug}/${entry.shortId}`}
    onClick={(e) => e.stopPropagation()}
    onPointerDown={(e) => e.stopPropagation()}
    title="Open full page"
    className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-card text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
   >
    <ExternalLink size={13} />
   </Link>
   {isEditor && (
    <button
     onClick={() => { setHovered(false); onDeleteRequest(entry); }}
     onPointerDown={(e) => e.stopPropagation()}
     title="Delete entry"
     className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-card text-foreground/60 transition-colors duration-150 hover:bg-destructive/5 hover:text-destructive"
    >
     <Trash2 size={13} />
    </button>
   )}
  </div>

  {/* Cover area */}
  {isSidePanel ? (
   <button
    onClick={() => !dragging && onOpenEntry!(entry)}
    onPointerDown={(e) => e.stopPropagation()}
    className={`relative block w-full shrink-0 overflow-hidden ${SIZE_COVER[cardSize]}`}
   >
    {entry.coverUrl ? (
     // eslint-disable-next-line @next/next/no-img-element
     <img
      src={entry.coverUrl}
      alt={entry.title ?? "Entry cover"}
      className="size-full object-cover"
     />
    ) : (
     <div className="flex size-full items-center justify-center bg-muted">
      {entry.icon ? (
       <span className="text-4xl">{entry.icon}</span>
      ) : (
       <LayoutGrid size={28} className="text-muted-foreground/60" />
      )}
     </div>
    )}
   </button>
  ) : (
   <Link
    href={`/app/${workspaceSlug}/${entry.shortId}`}
    onPointerDown={(e) => e.stopPropagation()}
    className={`relative block w-full shrink-0 overflow-hidden ${SIZE_COVER[cardSize]}`}
   >
    {entry.coverUrl ? (
     // eslint-disable-next-line @next/next/no-img-element
     <img
      src={entry.coverUrl}
      alt={entry.title ?? "Entry cover"}
      className="size-full object-cover"
     />
    ) : (
     <div className="flex size-full items-center justify-center bg-muted">
      {entry.icon ? (
       <span className="text-4xl">{entry.icon}</span>
      ) : (
       <LayoutGrid size={28} className="text-muted-foreground/60" />
      )}
     </div>
    )}
   </Link>
  )}

  {/* Content */}
  <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
   {isSidePanel ? (
    <button
     onClick={() => !dragging && onOpenEntry!(entry)}
     onPointerDown={(e) => e.stopPropagation()}
     className="text-left"
    >
     <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-150 hover:text-muted-foreground">
      {entry.title || <span className="font-normal text-muted-foreground/60">Untitled</span>}
     </p>
    </button>
   ) : (
    <Link
     href={`/app/${workspaceSlug}/${entry.shortId}`}
     onPointerDown={(e) => e.stopPropagation()}
    >
     <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-150 hover:text-muted-foreground">
      {entry.title || <span className="font-normal text-muted-foreground/60">Untitled</span>}
     </p>
    </Link>
   )}

   {filledProps.length > 0 && (
    <div className="mt-1.5 space-y-0.5">
     {filledProps.map((prop) => {
      const raw = valueMap.get(entry.id)?.get(prop.id) ?? null;
      return (
       <div key={prop.id} className="flex items-center gap-1.5 overflow-hidden">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
         {prop.name}
        </span>
        <div className="min-w-0 overflow-hidden">
         <CellDisplay property={prop} value={raw} compact />
        </div>
       </div>
      );
     })}
    </div>
   )}
  </div>
 </div>
 );
}
