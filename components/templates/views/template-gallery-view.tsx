"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  GripVertical,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  PanelRight,
  Pencil,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CellCommentPopover } from "@/components/database/cell-comment-popover";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import { EntryContextMenu } from "@/components/database/entry-context-menu";
import { PROPERTY_TYPE_ICON } from "@/components/database/property-registry";
import { resolveDisplayAs, resolveWrapContent } from "@/components/database/view-property-resolver";
import type { DbProperty, DbView } from "@/components/database/types";
import { PageIcon } from "@/components/pages/page-icon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import type { DatabaseProperty, DatabaseView } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";

// Same rule board-view.tsx uses to decide whether a property has a
// display-worthy value — kept in sync so gallery cards and board cards
// agree on what counts as "filled".
function hasDisplayValue(prop: DatabaseProperty, raw: unknown, displayAs?: "select" | "checkbox"): boolean {
  const v = raw as Record<string, unknown> | null;
  switch (prop.type) {
    case "text":
      return !!(v as { text?: string } | null)?.text;
    case "number":
      return (v as { number?: number | null } | null)?.number != null;
    // Checkbox-display is meaningful even unset (an empty checkbox is still a
    // real state to show, unlike an empty pill, which has nothing to render).
    case "select":
      return displayAs === "checkbox" || !!(v as { optionId?: string } | null)?.optionId;
    case "multi_select":
      return (
        displayAs === "checkbox" ||
        ((v as { optionIds?: string[] } | null)?.optionIds ?? []).length > 0
      );
    case "date":
      return !!(v as { date?: string } | null)?.date;
    case "checkbox":
      return !!(v as { checked?: boolean } | null)?.checked;
    case "url":
      return !!(v as { url?: string } | null)?.url;
    case "email":
      return !!(v as { email?: string } | null)?.email;
    case "phone":
      return !!(v as { phone?: string } | null)?.phone;
    case "person":
      return ((v as { userIds?: string[] } | null)?.userIds ?? []).length > 0;
    case "relation":
      return ((v as { entryIds?: string[] } | null)?.entryIds ?? []).length > 0;
    default:
      return false;
  }
}

// Toggling a checkbox-display select on a card: unchecking always clears the
// value; checking picks the first "complete"-group option if the property is
// grouped (marking it "done", matching what the checkbox visually implies),
// falling back to the first option at all for an ungrouped select.
function nextCheckboxSelectValue(prop: DatabaseProperty, raw: unknown): { optionId: string | null } {
  const optionId = (raw as { optionId?: string | null } | null)?.optionId ?? null;
  if (optionId) return { optionId: null };
  const options = ((prop.config as { options?: { id: string; group?: string }[] } | null)?.options ?? []);
  const target = options.find((o) => o.group === "complete") ?? options[0];
  return { optionId: target?.id ?? null };
}

// Same idea for multi-select: unchecking clears every selected option;
// checking sets just the first "complete"-group (or first) option, same
// single-value semantic a checkbox implies even for a multi-select field.
function nextCheckboxMultiSelectValue(prop: DatabaseProperty, raw: unknown): { optionIds: string[] } {
  const optionIds = (raw as { optionIds?: string[] } | null)?.optionIds ?? [];
  if (optionIds.length > 0) return { optionIds: [] };
  const options = ((prop.config as { options?: { id: string; group?: string }[] } | null)?.options ?? []);
  const target = options.find((o) => o.group === "complete") ?? options[0];
  return { optionIds: target ? [target.id] : [] };
}

interface Props {
  activeView: DatabaseView;
  databaseId: string;
  entries: TemplateEntry[];
  entryValueMap: Map<string, Map<string, unknown>>;
  onAddEntry: (defaultValues?: Record<string, unknown>) => void;
  onClickEntry: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicateEntry: (entryId: string) => void;
  onSaveTitle: (entryId: string, title: string) => void;
  onUpdateEntryIcon?: (entryId: string, icon: string) => void;
  onUpdateProperty: (propId: string, patch: Record<string, unknown>) => void;
  onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
  onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
  properties: DatabaseProperty[];
  workspaceId: string;
  workspaceSlug: string;
}

// ── Card ──────────────────────────────────────────────────────────────────────
// Mirrors board-view.tsx's CardShell (Edit/Open-full-page toggle, "…" menu,
// comments, inline quick-add for empty properties) so gallery cards behave
// identically to board cards, just with a cover area up top.

interface GalleryCardProps {
  databaseId: string;
  displayProps: DatabaseProperty[];
  dragging?: boolean;
  /** Wires the grip icon to dnd-kit's activator instead of making the whole
   *  card a drag surface — the card is covered edge-to-edge by click targets
   *  (cover, title, buttons) that intentionally stop pointerdown propagation,
   *  so a whole-card drag zone shrinks to unreliable leftover gaps. Omitted
   *  for the drag overlay instance, which doesn't need a handle. */
  dragHandleProps?: {
    ref: (el: HTMLElement | null) => void;
  } & Record<string, unknown>;
  entry: TemplateEntry;
  onClickEntry: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onDuplicateEntry: (id: string) => void;
  onSaveTitle: (id: string, title: string) => void;
  onUpdateEntryIcon?: (entryId: string, icon: string) => void;
  onUpdateProperty: (propId: string, patch: Record<string, unknown>) => void;
  onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
  valueMap: Map<string, Map<string, unknown>>;
  workspaceId: string;
  workspaceSlug: string;
  activeView?: DatabaseView | null;
  onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
}

function GalleryCard({
  entry,
  databaseId,
  displayProps,
  valueMap,
  workspaceSlug,
  workspaceId,
  onClickEntry,
  onDeleteRequest,
  onDuplicateEntry,
  onSaveTitle,
  onUpdatePropValue,
  onUpdateProperty,
  onUpdateEntryIcon,
  dragging,
  dragHandleProps,
  activeView,
  onUpdateView,
}: GalleryCardProps) {
  const [hovered, setHovered] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [commentAnchor, setCommentAnchor] = useState<DOMRect | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(entry.commentCount ?? null);
  const [tooltip, setTooltip] = useState<{
    label: string;
    rect: DOMRect;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(entry.title ?? "");
  const [propEditor, setPropEditor] = useState<{
    prop: DatabaseProperty;
    rect: DOMRect;
  } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const valMap = valueMap.get(entry.id) ?? new Map<string, unknown>();
  const filledProps = displayProps.filter((prop) =>
    hasDisplayValue(prop, valMap.get(prop.id) ?? null, resolveDisplayAs(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined))
  );
  const emptyProps = editing
    ? displayProps.filter(
        (prop) => !hasDisplayValue(prop, valMap.get(prop.id) ?? null, resolveDisplayAs(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined))
      )
    : [];

  // entry.commentCount is batch-computed server-side (open, page-level
  // threads only) — see components/database/board-view.tsx's CardShell for
  // the same change. `onCommentAdded` below still bumps this instantly
  // between fetches.
  useEffect(() => { setCommentCount(entry.commentCount ?? 0); }, [entry.commentCount]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    function h(e: MouseEvent) {
      if (menuPos || commentAnchor || propEditor) {
        return; // a nested popover owns this click
      }
      const target = e.target as HTMLElement;
      if (cardRef.current && !cardRef.current.contains(target)) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [editing, menuPos, commentAnchor, propEditor]);

  // tooltip is a `position: fixed` portal anchored to a rect snapshotted once
  // on hover — dismiss it on scroll instead of repositioning, since locking
  // scroll on every card hover would hurt the gallery's own scrolling.
  useEffect(() => {
    if (!tooltip) return;
    function handleScroll() { setTooltip(null); }
    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, [tooltip]);

  function commitTitle() {
    const trimmed = editTitle.trim();
    if (trimmed !== (entry.title ?? "")) {
      onSaveTitle(entry.id, trimmed);
    }
  }

  return (
    <>
      <div
        className={[
          "relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card transition-colors duration-150",
          dragging ? "ring-2 ring-primary/40 opacity-90" : "",
        ].join(" ")}
        onMouseEnter={() => !dragging && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={(e) => {
          if (dragging) return;
          e.preventDefault();
          e.stopPropagation();
          setTooltip(null);
          setMenuPos({ x: e.clientX, y: e.clientY });
        }}
        ref={cardRef}
      >
        {/* Grip icon — top-left, visible on hover; the actual drag handle */}
        <div
          className={`absolute left-2 top-2 z-10 transition-opacity ${dragHandleProps ? "cursor-grab touch-none select-none" : "pointer-events-none"}`}
          style={{ opacity: hovered ? 0.6 : 0 }}
          {...dragHandleProps}
        >
          <GripVertical className="text-foreground/70" size={14} />
        </div>

        {/* Action buttons — top-right, visible on hover */}
        <div
          className="absolute right-2 top-2 z-10 flex items-center gap-1 transition-opacity"
          style={{ opacity: hovered || editing ? 1 : 0 }}
        >
          {editing ? (
            <button
              className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-card text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onClickEntry(entry.id);
              }}
              onMouseEnter={(e) =>
                setTooltip({
                  label: "Open full page",
                  rect: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setTooltip(null)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PanelRight size={13} />
            </button>
          ) : (
            <button
              className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-card text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setTooltip({
                  label: "Open full page",
                  rect: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                });
                setEditTitle(entry.title ?? "");
                setEditing(true);
              }}
              onMouseEnter={(e) =>
                setTooltip({
                  label: "Edit",
                  rect: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setTooltip(null)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-card text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setTooltip(null);
              setMenuPos({ x: e.clientX, y: e.clientY });
            }}
            onMouseEnter={(e) =>
              setTooltip({
                label: "More options",
                rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
              })
            }
            onMouseLeave={() => setTooltip(null)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={13} />
          </button>
        </div>

        {/* Cover area */}
        <button
          className="relative block h-[140px] w-full shrink-0 overflow-hidden bg-primary/10"
          onClick={() => !dragging && !editing && onClickEntry(entry.id)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex size-full items-center justify-center">
            <LayoutGrid className="text-muted-foreground/60" size={28} />
          </div>
        </button>

        {/* Content */}
        <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
          <div className="flex items-start gap-1.5">
            {/* h-5 matches the title's own line height (text-sm leading-snug)
                so the icon centers against the title's first line instead of
                sitting at a manually-guessed offset from the row's top. */}
            <span className="flex h-5 shrink-0 items-center">
              {entry.icon ? (
                <PageIcon className="shrink-0" icon={entry.icon} size={16} />
              ) : (
                <FileText className="shrink-0 text-muted-foreground/60" size={12} />
              )}
            </span>
            {editing ? (
              <input
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold leading-snug text-foreground outline-none"
                onBlur={commitTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: entry.id, title: e.target.value } }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                    (e.target as HTMLInputElement).blur();
                  }
                  if (e.key === "Escape") {
                    setEditTitle(entry.title ?? "");
                    setEditing(false);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Untitled"
                value={editTitle}
              />
            ) : (
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => !dragging && onClickEntry(entry.id)}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-150 hover:text-muted-foreground">
                  {entry.title || (
                    <span className="font-normal text-muted-foreground/60">
                      Untitled
                    </span>
                  )}
                </p>
              </button>
            )}
          </div>

          {/* Always rendered (not just when there's a comment/filled property) —
              reserves the same vertical slot on every card, including an
              invisible placeholder for the comment badge below, so cards in
              the same row land on identical natural heights instead of some
              being visibly shorter with a dead gap at the bottom. */}
          <div className="mt-1.5 space-y-0.5">
              {filledProps.map((prop) => {
                const raw = valMap.get(prop.id) ?? null;
                const resolvedDisplayAs = resolveDisplayAs(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined);
                const resolvedWrapContent = resolveWrapContent(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined);
                const isCheckboxDisplay =
                  (prop.type === "select" || prop.type === "multi_select") &&
                  resolvedDisplayAs === "checkbox";
                // Checkbox display already renders its own "☐ Property name"
                // label internally — wrapping it in the usual "label: value"
                // row would show the property name twice.
                if (isCheckboxDisplay) {
                  return (
                    <div key={prop.id} className="overflow-hidden">
                      <CellDisplay
                        compact
                        property={prop as unknown as DbProperty}
                        value={raw}
                        resolvedDisplayAs={resolvedDisplayAs}
                        resolvedWrapContent={resolvedWrapContent}
                        workspaceId={workspaceId}
                        onToggleCheckbox={() => {
                          const next = prop.type === "multi_select"
                            ? nextCheckboxMultiSelectValue(prop, raw)
                            : nextCheckboxSelectValue(prop, raw);
                          onUpdatePropValue(entry.id, prop.id, next);
                        }}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    className="flex items-center gap-1.5 overflow-hidden"
                    key={prop.id}
                  >
                    <span className="w-[76px] shrink-0 truncate text-xs font-medium text-muted-foreground">
                      {prop.name}
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <CellDisplay
                        compact
                        property={prop as unknown as DbProperty}
                        value={raw}
                        resolvedDisplayAs={resolvedDisplayAs}
                        resolvedWrapContent={resolvedWrapContent}
                        workspaceId={workspaceId}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Rendered even with 0 comments (just invisible) — reserves this
                  row's height on every card so a card with no comments doesn't
                  end up visibly shorter than one that has them. */}
              <button
                className={`inline-flex items-center gap-1 rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 ${!commentCount ? "invisible" : ""}`}
                tabIndex={commentCount ? 0 : -1}
                aria-hidden={!commentCount}
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentAnchor(
                    (e.currentTarget as HTMLElement).getBoundingClientRect()
                  );
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseEnter={(e) =>
                  setTooltip({
                    label: "View comments",
                    rect: (
                      e.currentTarget as HTMLElement
                    ).getBoundingClientRect(),
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              >
                <MessageSquare size={11} />
                {commentCount || 0}
              </button>
            </div>

          {/* Quick-add empty properties — only while editing, matching board-view's
            inline card editor so gallery cards can be filled in without opening
            the full page. */}
          {emptyProps.length > 0 && (
            <div className="mt-2 flex flex-col gap-0.5 border-t border-border/50 pt-2">
              {emptyProps.map((prop) => {
                const TypeIcon =
                  PROPERTY_TYPE_ICON[
                    prop.type as keyof typeof PROPERTY_TYPE_ICON
                  ];
                const propConfig = (prop.config ?? {}) as { icon?: string };
                return (
                  <button
                    className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1 py-0.5 text-left text-xs text-muted-foreground/70 hover:bg-accent hover:text-foreground"
                    key={prop.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPropEditor({
                        prop,
                        rect: (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect(),
                      });
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    type="button"
                  >
                    {propConfig.icon ? <PageIcon icon={propConfig.icon} className="shrink-0" size={12} /> : <TypeIcon className="shrink-0" size={12} />}
                    Add {prop.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {tooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <IconTooltip label={tooltip.label} rect={tooltip.rect} />,
          document.body
        )}

      <EntryContextMenu
        databaseId={databaseId}
        entryIcon={entry.icon ?? null}
        entryId={entry.id}
        entryRect={cardRef.current?.getBoundingClientRect() ?? null}
        entryShortId={entry.shortId}
        forcePos={menuPos}
        onClose={() => setMenuPos(null)}
        onCommentAdded={() => setCommentCount((c) => (c ?? 0) + 1)}
        onDelete={() => {
          setHovered(false);
          onDeleteRequest(entry.id);
        }}
        onDuplicate={() => onDuplicateEntry(entry.id)}
        onIconChange={(icon) => onUpdateEntryIcon?.(entry.id, icon)}
        onPropertyConfigChange={onUpdateProperty}
        onValueChange={(propId, value) =>
          onUpdatePropValue(entry.id, propId, value)
        }
        updatedAt={entry.updatedAt ?? null}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        activeView={activeView as unknown as DbView | null}
        onUpdateView={onUpdateView}
      />

      {commentAnchor && (
        <CellCommentPopover
          anchorRect={commentAnchor}
          onClose={() => setCommentAnchor(null)}
          onCommentAdded={() => setCommentCount((c) => (c ?? 0) + 1)}
          pageId={entry.id}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          entryShortId={entry.shortId}
        />
      )}

      {propEditor && (
        <CellEditorPopover
          cellRect={propEditor.rect}
          onClose={() => setPropEditor(null)}
          onPropertyConfigChange={(propId, config) =>
            onUpdateProperty(propId, { config })
          }
          onSave={(v) => {
            onUpdatePropValue(entry.id, propEditor.prop.id, v);
            setPropEditor(null);
          }}
          property={propEditor.prop as unknown as DbProperty}
          value={valMap.get(propEditor.prop.id) ?? null}
          workspaceId={workspaceId}
        />
      )}
    </>
  );
}

// ── Sortable wrapper ───────────────────────────────────────────────────────────

function SortableGalleryCard(props: GalleryCardProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <GalleryCard
        {...props}
        dragHandleProps={{
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function TemplateGalleryView({
  entries,
  databaseId,
  properties,
  activeView,
  entryValueMap,
  workspaceSlug,
  workspaceId,
  onAddEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onClickEntry,
  onSaveTitle,
  onUpdateEntryIcon,
  onUpdatePropValue,
  onUpdateProperty,
  onUpdateView,
}: Props) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Matches Notion: a card shows only its title by default. The one
  // exception is Status, and only once the user explicitly turns on "Show on
  // card" from Status's own Edit Property panel — every other property stays
  // fully editable via the entry's popup but is never rendered on the card.
  const displayProps = properties.filter((p) => {
    const config = p.config as { groupedByStatus?: boolean; showOnCard?: boolean } | null;
    return !!config?.groupedByStatus && !!config?.showOnCard;
  });

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
      ? (localOrder
          .map((id) => entries.find((e) => e.id === id))
          .filter(Boolean) as TemplateEntry[])
      : entries;

  const draggingEntry = draggingId
    ? (entries.find((e) => e.id === draggingId) ?? null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);
    if (!over || active.id === over.id) {
      return;
    }

    const currentIds = orderedEntries.map((e) => e.id);
    const oldIndex = currentIds.indexOf(String(active.id));
    const newIndex = currentIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    setLocalOrder(arrayMove(currentIds, oldIndex, newIndex));
  }

  return (
    <>
      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="h-full overflow-auto p-4 pb-8">
          <SortableContext
            items={orderedEntries.map((e) => e.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {orderedEntries.map((entry) => (
                <SortableGalleryCard
                  databaseId={databaseId}
                  displayProps={displayProps}
                  entry={entry}
                  key={entry.id}
                  onClickEntry={onClickEntry}
                  onDeleteRequest={setDeleteTarget}
                  onDuplicateEntry={onDuplicateEntry}
                  onSaveTitle={onSaveTitle}
                  onUpdateEntryIcon={onUpdateEntryIcon}
                  onUpdateProperty={onUpdateProperty}
                  onUpdatePropValue={onUpdatePropValue}
                  valueMap={entryValueMap}
                  workspaceId={workspaceId}
                  workspaceSlug={workspaceSlug}
                  activeView={activeView}
                  onUpdateView={onUpdateView}
                />
              ))}

              {/* New page card — outside SortableContext items */}
              <button
                className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border/50 text-muted-foreground/70 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary/60"
                onClick={() => onAddEntry()}
              >
                <Plus size={18} />
                <span className="text-sm font-medium">New page</span>
              </button>
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {draggingEntry && (
            <GalleryCard
              databaseId={databaseId}
              displayProps={displayProps}
              dragging
              entry={draggingEntry}
              onClickEntry={() => {}}
              onDeleteRequest={() => {}}
              onDuplicateEntry={() => {}}
              onSaveTitle={() => {}}
              onUpdateProperty={() => {}}
              onUpdatePropValue={() => {}}
              valueMap={entryValueMap}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              activeView={activeView}
              onUpdateView={onUpdateView}
            />
          )}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        confirmLabel="Delete"
        description="This entry will be permanently deleted. This cannot be undone."
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteEntry(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
        title="Delete entry?"
      />
    </>
  );
}
