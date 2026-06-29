"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ExternalLink, GripVertical } from "lucide-react";
import Link from "next/link";
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
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  entries:       TemplateEntry[];
  properties:    DatabaseProperty[];
  activeView:    DatabaseView;
  entryValueMap: Map<string, Map<string, unknown>>;
  workspaceSlug: string;
  onAddEntry:    (defaultValues?: Record<string, unknown>) => void;
  onDeleteEntry: (entryId: string) => void;
  onClickEntry:  (entryId: string) => void;
}

// ── Visual card content (shared between sortable and drag overlay) ─────────────

interface GalleryCardContentProps {
  entry:         TemplateEntry;
  workspaceSlug: string;
  dragging?:     boolean;
  onClickEntry:  (id: string) => void;
  onDeleteRequest: (id: string) => void;
}

function GalleryCardContent({
  entry,
  workspaceSlug,
  dragging,
  onClickEntry,
  onDeleteRequest,
}: GalleryCardContentProps) {
  return (
    <div
      className={[
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-sm)] border border-border/50 bg-card transition-all hover:border-border",
        dragging ? "shadow-xl opacity-90" : "",
      ].join(" ")}
      onClick={() => !dragging && onClickEntry(entry.id)}
    >
      {/* Grip icon — top-left, visible on hover */}
      <div className="pointer-events-none absolute left-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-50">
        <GripVertical size={14} className="text-foreground/70" />
      </div>

      {/* Cover area */}
      <div className="h-[140px] w-full shrink-0 bg-primary/10" />

      {/* Title + actions row */}
      <div className="flex min-h-[40px] items-center gap-1 px-3 py-2.5">
        <p className="flex-1 truncate text-sm font-medium text-foreground">
          {entry.title || <span className="text-muted-foreground/70">Untitled</span>}
        </p>

        {/* Hover actions */}
        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <Link
            href={`/app/${workspaceSlug}/${entry.shortId}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title="Open page"
            className="flex size-[22px] items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
          >
            <ExternalLink size={12} />
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(entry.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Delete"
            className="flex size-[22px] items-center justify-center rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sortable wrapper ───────────────────────────────────────────────────────────

interface SortableGalleryCardProps {
  entry:         TemplateEntry;
  workspaceSlug: string;
  onClickEntry:  (id: string) => void;
  onDeleteRequest: (id: string) => void;
}

function SortableGalleryCard({
  entry,
  workspaceSlug,
  onClickEntry,
  onDeleteRequest,
}: SortableGalleryCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: entry.id });

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
      <GalleryCardContent
        entry={entry}
        workspaceSlug={workspaceSlug}
        onClickEntry={onClickEntry}
        onDeleteRequest={onDeleteRequest}
      />
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function TemplateGalleryView({
  entries, workspaceSlug, onAddEntry, onDeleteEntry, onClickEntry,
}: Props) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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

  // Derive display order
  const orderedEntries =
    localOrder.length > 0
      ? localOrder.map((id) => entries.find((e) => e.id === id)).filter(Boolean) as TemplateEntry[]
      : entries;

  const draggingEntry = draggingId ? entries.find((e) => e.id === draggingId) ?? null : null;

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
        <div className="h-full overflow-auto p-4 pb-8">
          <SortableContext
            items={orderedEntries.map((e) => e.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {orderedEntries.map((entry) => (
                <SortableGalleryCard
                  key={entry.id}
                  entry={entry}
                  workspaceSlug={workspaceSlug}
                  onClickEntry={onClickEntry}
                  onDeleteRequest={setDeleteTarget}
                />
              ))}

              {/* New page card — outside SortableContext items */}
              <button
                onClick={() => onAddEntry()}
                className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border/50 text-muted-foreground/70 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary/60"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">New page</span>
              </button>
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {draggingEntry && (
            <GalleryCardContent
              entry={draggingEntry}
              workspaceSlug={workspaceSlug}
              dragging
              onClickEntry={() => {}}
              onDeleteRequest={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

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
