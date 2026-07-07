"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, PanelRight, Pencil, MoreHorizontal, MessageSquare, Pin, FileText } from "lucide-react";
import { PageIcon } from "@/components/pages/page-icon";
import {
 DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
 type DragEndEvent, type DragStartEvent, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GroupHeaderMenu } from "@/components/database/group-header-menu";
import { GroupSettingsPanel, type BoardSettings } from "@/components/database/group-settings-panel";
import { EntryContextMenu } from "@/components/database/entry-context-menu";
import { CellCommentPopover } from "@/components/database/cell-comment-popover";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import { EditPropertySidePanel } from "@/components/database/edit-property-panel";
import { resolveDisplayAs, resolveWrapContent } from "@/components/database/view-property-resolver";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { PROPERTY_TYPE_ICON, STATUS_GROUPS } from "@/components/database/property-registry";
import type { DbProperty, DbView, StatusGroupKey, ViewPropertyOverride } from "@/components/database/types";

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

// Same rule board-view.tsx uses to decide whether a property has a
// display-worthy value — displayProps here is already select/multi_select only.
function hasDisplayValue(prop: DatabaseProperty, raw: unknown): boolean {
 const v = raw as Record<string, unknown> | null;
 switch (prop.type) {
  case "select":    return !!(v as { optionId?: string } | null)?.optionId;
  case "multi_select": return ((v as { optionIds?: string[] } | null)?.optionIds ?? []).length > 0;
  default:       return false;
 }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PropOption   = { id: string; name: string; color: string; group?: StatusGroupKey };
type PropConfig   = { options?: PropOption[]; groupedByStatus?: boolean };
type SelectVal   = { optionId?: string };
type MultiSelectVal = { optionIds?: string[] };

type Column = {
 optionId: string | null; label: string; color: string; entries: TemplateEntry[];
 /** Set only for status-super-group columns (statusBy: "group") — the real option a
  *  new/dropped card should actually be assigned, since a super-group isn't itself a
  *  selectable option value. */
 representativeOptionId?: string | null;
};

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
     className="rounded-[var(--radius-sm)] bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
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

// ── Column drop zone (enables dropping into empty columns) ────────────────────

function ColumnDropZone({ colKey, children }: { colKey: string; children: React.ReactNode }) {
 const { setNodeRef } = useDroppable({ id: "col-" + colKey });
 return <div ref={setNodeRef} className="flex flex-col gap-2 px-2 pt-2">{children}</div>;
}

// ── Sortable column ────────────────────────────────────────────────────────────
// Whole columns are reorderable via drag, using a distinct "colhandle-" id prefix so
// it never collides with the existing "col-<key>" empty-column drop target. Only the
// header is the drag handle (passed via render prop) — not the whole column, so
// dragging a card inside never gets mistaken for dragging the column itself.

function SortableColumn({
 colKey, draggable, isDragging, children,
}: {
 colKey:   string;
 draggable: boolean;
 isDragging: boolean;
 children: (handleProps: Record<string, unknown> | null) => React.ReactElement;
}) {
 const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: "colhandle-" + colKey, disabled: !draggable });
 const style: React.CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.4 : 1,
 };
 const handleProps = draggable ? { ...attributes, ...listeners } : null;

 return (
  <div ref={setNodeRef} style={style}>
   {children(handleProps)}
  </div>
 );
}

// ── Sortable card ─────────────────────────────────────────────────────────────

interface CardShellProps {
 entry:        TemplateEntry;
 displayProps:    DatabaseProperty[];
 /** The full, unrestricted property list — needed to look up Status even
  *  before "Show on card" is enabled, since at that point it isn't in
  *  `displayProps` yet. */
 properties:     DatabaseProperty[];
 entryValueMap:   Map<string, Map<string, unknown>>;
 databaseId:     string;
 workspaceSlug:   string;
 workspaceId:    string;
 onClickEntry:    (id: string) => void;
 onDeleteRequest:  (id: string) => void;
 onDuplicateEntry: (id: string) => void;
 onSaveTitle:    (id: string, title: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
 onUpdateProperty: (propId: string, patch: Record<string, unknown>) => void;
 onUpdateEntryIcon?: (entryId: string, icon: string) => void;
 activeView:     DatabaseView;
 onUpdateView:    (patch: Record<string, unknown>) => Promise<void>;
 dragging?:       boolean;
}

function CardShell({
 entry, displayProps, properties, entryValueMap, databaseId, workspaceSlug, workspaceId, onClickEntry, onDeleteRequest, onDuplicateEntry,
 onSaveTitle, onUpdatePropValue, onUpdateProperty, onUpdateEntryIcon, activeView, onUpdateView, dragging,
}: CardShellProps) {
 const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
 const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
 const [commentAnchor, setCommentAnchor] = useState<DOMRect | null>(null);
 const [commentCount, setCommentCount]  = useState<number | null>(null);
 const [tooltip, setTooltip] = useState<{ label: string; rect: DOMRect } | null>(null);
 const [editing, setEditing] = useState(false);
 const [editTitle, setEditTitle] = useState(entry.title ?? "");
 const [propEditor, setPropEditor] = useState<{ prop: DatabaseProperty; rect: DOMRect } | null>(null);
 const [editPropPanel, setEditPropPanel] = useState<{ propId: string; anchorRect: DOMRect } | null>(null);
 const cardRef = useRef<HTMLDivElement>(null);
 const fetchedRef = useRef(false);

 useEffect(() => {
  if (dragging || fetchedRef.current) return;
  fetchedRef.current = true;
  fetch(`/api/pages/${entry.id}/comments`)
   .then((r) => (r.ok ? r.json() : null))
   .then((data) => {
    if (!data) return;
    const list = data.comments as Array<{ blockId: string | null; deletedAt: string | null; propertyId: string | null }>;
    // Only count page-level threads (propertyId === null) — the badge opens the same
    // page-level popover, and property-scoped comments (added from a table cell) aren't
    // shown there, so counting them would show a badge that opens to nothing.
    setCommentCount(list.filter((c) => !c.blockId && !c.deletedAt && c.propertyId === null).length);
   })
   .catch(() => {});
 }, [entry.id, dragging]);

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
  if (trimmed !== (entry.title ?? "")) onSaveTitle(entry.id, trimmed);
 }

 return (
  <>
  <div
   ref={cardRef}
   className={[
    "group relative rounded-[var(--radius-sm)] border bg-background p-3 transition-all",
    dragging
     ? "border-primary/40 opacity-50"
     : "border-border/50 hover:border-border hover:-translate-y-0.5",
   ].join(" ")}
   onClick={() => !dragging && !editing && onClickEntry(entry.id)}
   onContextMenu={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
   }}
  >
   <div className="flex items-start gap-1.5">
    {entry.icon ? (
     <PageIcon icon={entry.icon} size={13} className="mt-0.5 shrink-0" />
    ) : (
     <FileText size={12} className="mt-0.5 shrink-0 text-muted-foreground/60" />
    )}
    {editing ? (
     <input
      autoFocus
      value={editTitle}
      onChange={(e) => setEditTitle(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={commitTitle}
      onKeyDown={(e) => {
       if (e.key === "Enter") { e.preventDefault(); commitTitle(); (e.target as HTMLInputElement).blur(); }
       if (e.key === "Escape") { setEditTitle(entry.title ?? ""); setEditing(false); }
      }}
      placeholder="Untitled"
      className="min-w-0 flex-1 bg-transparent pr-5 text-sm font-medium leading-snug text-foreground outline-none"
     />
    ) : (
     <p className="min-w-0 flex-1 pr-5 text-sm font-medium leading-snug text-foreground">
      {entry.title || <span className="text-muted-foreground/70">Untitled</span>}
     </p>
    )}
   </div>

   {/* Property badges + comment count — clickable (same value editor empty
       properties already open below) so a filled property's value, and for
       Status specifically its Display As/Wrap content, can be changed right
       from the card. */}
   {(displayProps.length > 0 || !!commentCount) && (
    <div className="mt-2 flex flex-wrap items-center gap-1">
     {displayProps.filter((dp) => hasDisplayValue(dp, valMap.get(dp.id) ?? null)).map((dp) => (
      <button
       key={dp.id}
       type="button"
       onPointerDown={(e) => e.stopPropagation()}
       onClick={(e) => { e.stopPropagation(); setPropEditor({ prop: dp, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() }); }}
       className="min-w-0 shrink-0 rounded-[var(--radius-xs)] text-left hover:bg-accent"
      >
       <CellDisplay
        property={dp as unknown as DbProperty}
        value={valMap.get(dp.id) ?? null}
        compact
        resolvedDisplayAs={resolveDisplayAs(dp as unknown as DbProperty, activeView as unknown as DbView)}
        resolvedWrapContent={resolveWrapContent(dp as unknown as DbProperty, activeView as unknown as DbView)}
       />
      </button>
     ))}
     {!!commentCount && (
      <button
       onPointerDown={(e) => e.stopPropagation()}
       onClick={(e) => {
        e.stopPropagation();
        setCommentAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
       }}
       className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70"
       title="View comments"
      >
       <MessageSquare size={11} />
       {commentCount}
      </button>
     )}
    </div>
   )}

   {/* Card actions */}
   <div
    className={`absolute right-2 top-2 items-center gap-1 ${editing ? "flex" : "hidden group-hover:flex"}`}
    onClick={(e) => e.stopPropagation()}
   >
    {!editing ? (
     <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
       e.stopPropagation();
       // The icon swaps to the side-peek icon in the same spot the cursor is
       // already resting on, so no fresh hover event will fire to update the
       // tooltip — set it directly instead of clearing it to null.
       setTooltip({ label: "Open full page", rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
       setEditTitle(entry.title ?? "");
       setEditing(true);
      }}
      onMouseEnter={(e) => setTooltip({ label: "Edit", rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
      onMouseLeave={() => setTooltip(null)}
      className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
     >
      <Pencil size={11} />
     </button>
    ) : (
     <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClickEntry(entry.id); }}
      onMouseEnter={(e) => setTooltip({ label: "Open full page", rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
      onMouseLeave={() => setTooltip(null)}
      className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
     >
      <PanelRight size={11} />
     </button>
    )}
    <button
     onPointerDown={(e) => e.stopPropagation()}
     onClick={(e) => {
      e.stopPropagation();
      setTooltip(null);
      setMenuPos({ x: e.clientX, y: e.clientY });
     }}
     onMouseEnter={(e) => setTooltip({ label: "More options", rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
     onMouseLeave={() => setTooltip(null)}
     className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
     <MoreHorizontal size={11} />
    </button>
   </div>

   {/* Quick-add empty properties — only while editing, matching Notion's inline card editor */}
   {editing && displayProps.filter((dp) => !valMap.get(dp.id)).length > 0 && (
    <div className="mt-2 flex flex-col gap-0.5 border-t border-border/50 pt-2">
     {displayProps.filter((dp) => !valMap.get(dp.id)).map((dp) => {
      const TypeIcon = PROPERTY_TYPE_ICON[dp.type as keyof typeof PROPERTY_TYPE_ICON];
      return (
       <button
        key={dp.id}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
         e.stopPropagation();
         setPropEditor({ prop: dp, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
        }}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1 py-0.5 text-left text-xs text-muted-foreground/70 hover:bg-accent hover:text-foreground"
       >
        <TypeIcon size={12} className="shrink-0" />
        Add {dp.name}
       </button>
      );
     })}
    </div>
   )}
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
   onDelete={() => onDeleteRequest(entry.id)}
   onDuplicate={() => onDuplicateEntry(entry.id)}
   onCommentAdded={() => setCommentCount((c) => (c ?? 0) + 1)}
   onValueChange={(propId, value) => onUpdatePropValue(entry.id, propId, value)}
   onPropertyConfigChange={onUpdateProperty}
   activeView={activeView as unknown as DbView | null}
   onUpdateView={onUpdateView}
  />

  {commentAnchor && (
   <CellCommentPopover
    pageId={entry.id}
    workspaceId={workspaceId}
    anchorRect={commentAnchor}
    onClose={() => setCommentAnchor(null)}
    onCommentAdded={() => setCommentCount((c) => (c ?? 0) + 1)}
   />
  )}

  {propEditor && (
   <CellEditorPopover
    property={propEditor.prop as unknown as DbProperty}
    value={valMap.get(propEditor.prop.id) ?? null}
    cellRect={propEditor.rect}
    workspaceId={workspaceId}
    onSave={(v) => { onUpdatePropValue(entry.id, propEditor.prop.id, v); setPropEditor(null); }}
    onClose={() => setPropEditor(null)}
    onPropertyConfigChange={(propId, config) => onUpdateProperty(propId, { config })}
    onEditProperty={(propEditor.prop.config as { groupedByStatus?: boolean } | null)?.groupedByStatus ? (rect) => {
     setEditPropPanel({ propId: propEditor.prop.id, anchorRect: rect });
     setPropEditor(null);
    } : undefined}
   />
  )}

  {editPropPanel && (() => {
   // Looked up from the full properties list, not `displayProps` — Status
   // isn't in `displayProps` yet the very first time this opens (before
   // "Show on card" gets auto-enabled below), so that restricted list can't
   // be used to find the property being edited.
   const panelProp = properties.find((p) => p.id === editPropPanel.propId);
   if (!panelProp) return null;
   return (
    <EditPropertySidePanel
     key={panelProp.id}
     property={panelProp as unknown as DbProperty}
     getAnchorRect={() => {
      // Same convention as Calendar/Gallery: always hangs below the
      // toolbar's own "+New" button, not wherever the card happened to be
      // clicked from, so it opens in the same predictable spot every time.
      const btn = document.querySelector("[data-new-entry-button]")?.getBoundingClientRect();
      if (!btn) return editPropPanel.anchorRect;
      return new DOMRect(btn.right, btn.top, 0, btn.height);
     }}
     onUpdateProperty={async (patch) => onUpdateProperty(panelProp.id, patch)}
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
     viewContext={{
      override: ((activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined) ?? {})[panelProp.id] ?? {},
      onUpdateOverride: (patch) => onUpdateView({
       propertyOverrides: {
        ...(activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined),
        [panelProp.id]: { ...(((activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined) ?? {})[panelProp.id] ?? {}), ...patch },
       },
      }),
     }}
    />
   );
  })()}
  </>
 );
}

function SortableCard(props: CardShellProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.entry.id });
 const style: React.CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity:    isDragging ? 0.4 : 1,
  touchAction: "none",
  userSelect:  "none",
  cursor:    "grab",
 };
 return (
  <div ref={setNodeRef} style={style} {...attributes} {...listeners} suppressHydrationWarning>
   <CardShell {...props} />
  </div>
 );
}

// ── Main board view ───────────────────────────────────────────────────────────

interface Props {
 entries:      TemplateEntry[];
 properties:     DatabaseProperty[];
 activeView:     DatabaseView;
 entryValueMap:   Map<string, Map<string, unknown>>;
 databaseId:     string;
 workspaceSlug:   string;
 workspaceId:    string;
 onAddEntry:     (defaultValues?: Record<string, unknown>, title?: string) => void;
 onDeleteEntry:   (entryId: string) => void;
 onDuplicateEntry: (entryId: string) => void;
 onClickEntry:    (entryId: string) => void;
 onSaveTitle:    (entryId: string, title: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
 onUpdateProperty: (propId: string, patch: Record<string, unknown>) => void;
 onUpdateEntryIcon?: (entryId: string, icon: string) => void;
 onUpdateView:    (patch: Record<string, unknown>) => Promise<void>;
 onAddProperty:   (name: string, type: string, config?: Record<string, unknown>) => void;
 onDeleteProperty: (propId: string) => void;
 getEditPropertyAnchorRect: () => DOMRect;
}

export function TemplateBoardView({
 entries, properties, activeView, entryValueMap, databaseId, workspaceSlug, workspaceId,
 onAddEntry, onDeleteEntry, onDuplicateEntry, onClickEntry, onSaveTitle, onUpdatePropValue,
 onUpdateProperty, onUpdateEntryIcon, onUpdateView, onAddProperty, onDeleteProperty, getEditPropertyAnchorRect,
}: Props) {
 const [addingTo, setAddingTo]           = useState<string | null>(null);
 const [deleteTarget, setDeleteTarget]       = useState<string | null>(null);
 const [draggingId, setDraggingId]         = useState<string | null>(null);
 const [localOrder, setLocalOrder]         = useState<Map<string, string[]>>(new Map());
 const [groupMenu, setGroupMenu]          = useState<{ optionId: string; triggerEl: HTMLElement } | null>(null);
 const [editingGroups, setEditingGroups]      = useState(false);
 const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ id: string; name: string } | null>(null);
 const [draggingColKey, setDraggingColKey]     = useState<string | null>(null);
 const [pinTooltip, setPinTooltip] = useState<{ label: string; rect: DOMRect } | null>(null);

 const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

 const groupProp = properties.find((p) => p.id === activeView.groupByPropertyId)
  ?? properties.find((p) => p.type === "select");
 const groupConfig = (groupProp?.config ?? {}) as PropConfig;
 const groupOptions = groupConfig.options ?? [];

 const boardSettings = (activeView.boardSettings ?? {}) as BoardSettings;
 const hiddenGroupOptionIds = boardSettings.hiddenGroupOptionIds ?? [];
 const hiddenStatusGroupKeys = boardSettings.hiddenStatusGroupKeys ?? [];
 const hideAggregation = !!boardSettings.hideAggregation;
 const sortDirection = boardSettings.sortDirection ?? "manual";
 const hideEmptyGroups = !!boardSettings.hideEmptyGroups;
 const colorColumns = boardSettings.colorColumns !== false;
 // "Group" mode is only meaningful for a real Status-type property (one whose options
 // are bucketed into the 3 fixed super-groups) — otherwise always fall back to "option".
 const statusBy = groupConfig.groupedByStatus ? (boardSettings.statusBy ?? "option") : "option";
 // Display-only sorted copy — the underlying option array (and its index-based drag
 // math in onDragEnd) is untouched, so switching back to Manual restores drag order.
 const displayGroupOptions = sortDirection === "manual"
  ? groupOptions
  : [...groupOptions].sort((a, b) => sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

 // Matches Notion: a card shows only its title by default. The one
 // exception is Status, and only once the user explicitly turns on "Show on
 // card" from Status's own Edit Property panel — every other property stays
 // fully editable via the card's own popup but is never rendered on it.
 // Same rule as Calendar/Gallery.
 const displayProps = properties.filter((p) => {
  const config = p.config as { groupedByStatus?: boolean; showOnCard?: boolean } | null;
  return !!config?.groupedByStatus && !!config?.showOnCard;
 });

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

 const rawColumns: Column[] = statusBy === "group"
  ? [
    ...STATUS_GROUPS.map((g) => {
     const groupOpts = groupOptions.filter((o) => (o.group ?? "in_progress") === g.key);
     const groupEntries = groupOpts.flatMap((o) => buckets.get(o.id) ?? []);
     return {
      optionId: g.key, label: g.label, color: groupOpts[0]?.color ?? "gray",
      entries: groupEntries, representativeOptionId: groupOpts[0]?.id ?? null,
     };
    }),
    { optionId: null, label: "No Status", color: "gray", entries: buckets.get(null)! },
   ]
  : [
    ...displayGroupOptions.map((opt) => ({
     optionId: opt.id, label: opt.name, color: opt.color, entries: buckets.get(opt.id) ?? [],
    })),
    { optionId: null, label: groupProp ? "No Status" : "All Items", color: "gray", entries: buckets.get(null)! },
   ].filter((col) => {
    if (col.optionId !== null) return true;
    return col.entries.length > 0 || groupOptions.length === 0;
   });

 // Apply local ordering overrides for within-column reorders
 const columns = rawColumns.map((col) => {
  const key = col.optionId ?? "none";
  const order = localOrder.get(key);
  if (!order) return col;
  const map = new Map(col.entries.map((e) => [e.id, e]));
  const sorted = order.map((id) => map.get(id)).filter(Boolean) as TemplateEntry[];
  const extra = col.entries.filter((e) => !order.includes(e.id));
  return { ...col, entries: [...sorted, ...extra] };
 });

 const visibleColumns = columns.filter((c) => {
  if (c.optionId === null) return true;
  if (statusBy === "group") {
   if (hiddenStatusGroupKeys.includes(c.optionId as StatusGroupKey)) return false;
  } else if (hiddenGroupOptionIds.includes(c.optionId)) {
   return false;
  }
  if (hideEmptyGroups && c.entries.length === 0 && addingTo !== c.optionId) return false;
  return true;
 });
 // The 3 status super-groups are in a fixed order (matches Notion) — never draggable.
 const draggableColumnKeys = statusBy === "option" && sortDirection === "manual"
  ? visibleColumns.filter((c) => c.optionId !== null).map((c) => "colhandle-" + c.optionId)
  : [];

 // Pinned groups render as a compact chip strip in addition to their normal column —
 // a quick-reference row, independent of that column's hidden/visible state.
 const pinnedGroupIds = statusBy === "group" ? (boardSettings.pinnedStatusGroupKeys ?? []) : (boardSettings.pinnedGroupOptionIds ?? []);
 const pinnedColumns = columns.filter((c) => c.optionId !== null && pinnedGroupIds.includes(c.optionId));
 function unpinColumn(optionId: string) {
  if (statusBy === "group") {
   onUpdateView({ boardSettings: { ...boardSettings, pinnedStatusGroupKeys: pinnedGroupIds.filter((k) => k !== optionId) } });
  } else {
   onUpdateView({ boardSettings: { ...boardSettings, pinnedGroupOptionIds: pinnedGroupIds.filter((id) => id !== optionId) } });
  }
 }
 function scrollToColumn(colKey: string) {
  document.querySelector(`[data-col-id="${colKey}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
 }

 const draggingEntry = draggingId ? entries.find((e) => e.id === draggingId) : null;

 function onDragStart({ active }: DragStartEvent) {
  const id = String(active.id);
  if (id.startsWith("colhandle-")) { setDraggingColKey(id.slice("colhandle-".length)); return; }
  setDraggingId(id);
 }

 function onDragEnd({ active, over }: DragEndEvent) {
  const activeId = String(active.id);

  // Whole-column reordering — distinct id prefix so it never collides with card ids.
  if (activeId.startsWith("colhandle-")) {
   setDraggingColKey(null);
   if (!over) return;
   const overId = String(over.id);
   if (!overId.startsWith("colhandle-") || activeId === overId) return;
   const activeOptId = activeId.slice("colhandle-".length);
   const overOptId  = overId.slice("colhandle-".length);
   const oldIdx = groupOptions.findIndex((o) => o.id === activeOptId);
   const newIdx = groupOptions.findIndex((o) => o.id === overOptId);
   if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
   const nextOptions = arrayMove(groupOptions, oldIdx, newIdx);
   if (groupProp) onUpdateProperty(groupProp.id, { config: { ...groupConfig, options: nextOptions } });
   return;
  }

  setDraggingId(null);
  if (!over || active.id === over.id) return;

  const overId  = String(over.id);

  const activeCol = columns.find((c) => c.entries.some((e) => e.id === activeId));
  if (!activeCol) return;
  const activeKey = activeCol.optionId ?? "none";

  const targetColByDroppable = columns.find((c) => "col-" + (c.optionId ?? "none") === overId);
  const targetColByCard   = columns.find((c) => c.entries.some((e) => e.id === overId));
  const targetCol = targetColByDroppable ?? targetColByCard;
  if (!targetCol) return;
  const targetKey = targetCol.optionId ?? "none";

  if (activeKey === targetKey) {
   // Within-column reorder — optimistic local state
   const currentOrder = activeCol.entries.map((e) => e.id);
   const oldIdx = currentOrder.indexOf(activeId);
   const newIdx = targetColByCard ? currentOrder.indexOf(overId) : currentOrder.length - 1;
   if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
   setLocalOrder((prev) => new Map(prev).set(activeKey, arrayMove(currentOrder, oldIdx, newIdx)));
  } else {
   // Cross-column move — persist new group value. A status-super-group column isn't
   // itself an option, so drops there resolve to that group's representative option.
   if (groupProp) {
    const nextOptionId = targetCol.representativeOptionId !== undefined
     ? targetCol.representativeOptionId
     : targetCol.optionId;
    onUpdatePropValue(
     activeId,
     groupProp.id,
     nextOptionId ? { optionId: nextOptionId } : { optionId: null },
    );
   }
   setLocalOrder((prev) => {
    const next = new Map(prev);
    next.delete(activeKey);
    next.delete(targetKey);
    return next;
   });
  }
 }

 function deleteGroupOption(optionId: string) {
  if (!groupProp) return;
  const next = groupOptions.filter((o) => o.id !== optionId);
  onUpdateProperty(groupProp.id, { config: { ...groupConfig, options: next } });
 }

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
  {pinnedColumns.length > 0 && (
   <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-6 py-2">
    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
     <Pin size={11} /> Pinned groups
    </span>
    {pinnedColumns.map((col) => {
     const style = getStyle(col.color);
     return (
      <div
       key={col.optionId}
       className={`flex shrink-0 items-center gap-0.5 rounded-full border pl-1 pr-1 py-1 text-xs font-medium ${style.header}`}
      >
       <button
        type="button"
        onClick={() => scrollToColumn(col.optionId ?? "none")}
        onMouseEnter={(e) => setPinTooltip({ label: `Jump to ${col.label}`, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
        onMouseLeave={() => setPinTooltip(null)}
        className="flex items-center gap-1.5 rounded-full px-1.5 transition-colors hover:opacity-70"
       >
        <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
        {col.label}
        <span className="text-muted-foreground">{col.entries.length}</span>
       </button>
       <button
        type="button"
        onClick={() => unpinColumn(col.optionId!)}
        onMouseEnter={(e) => setPinTooltip({ label: "Unpin group", rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
        onMouseLeave={() => setPinTooltip(null)}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/60"
       >
        <Pin size={10} className="shrink-0" />
       </button>
      </div>
     );
    })}
   </div>
  )}
  <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
   <SortableContext items={draggableColumnKeys} strategy={horizontalListSortingStrategy}>
    <div className="grid items-start gap-3 p-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
     {visibleColumns.map((col) => {
      const style    = colorColumns ? getStyle(col.color) : { ...getStyle("gray"), dot: getStyle(col.color).dot };
      const colKey   = col.optionId ?? "none";
      const isAddingHere = addingTo === colKey;

      return (
       <SortableColumn key={colKey} colKey={colKey} draggable={col.optionId !== null && statusBy === "option" && sortDirection === "manual"} isDragging={draggingColKey === col.optionId}>
        {(handleProps) => (
        <div className="flex flex-col rounded-[var(--radius-md)] border border-border/40 bg-muted/10 overflow-hidden" data-col-id={colKey}>
         {/* Column header — doubles as the drag handle for reordering the whole column */}
         <div
          {...handleProps}
          suppressHydrationWarning
          style={{ touchAction: handleProps ? "none" : undefined }}
          className={`flex items-center justify-between border-b px-3 py-2.5 ${style.header} ${handleProps ? "cursor-grab" : ""}`}
         >
          <div className="flex min-w-0 items-center gap-2">
           <span className={`size-2 flex-shrink-0 rounded-full ${style.dot}`} />
           <span className="truncate text-sm font-semibold text-foreground">{col.label}</span>
           {!hideAggregation && (
            <span className="flex min-w-[18px] shrink-0 items-center justify-center rounded-full bg-background/80 px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
             {col.entries.length}
            </span>
           )}
           {col.optionId !== null && pinnedGroupIds.includes(col.optionId) && (
            <Pin size={12} className="shrink-0 text-muted-foreground" />
           )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
           {/* Status-super-group columns aren't a single real option, so the per-option
               "⋯" menu (hide/delete this option) doesn't apply — manage visibility for
               those via "Edit groups" instead. */}
           {col.optionId !== null && statusBy === "option" && (
            <button
             onPointerDown={(e) => e.stopPropagation()}
             onClick={(e) => setGroupMenu({ optionId: col.optionId!, triggerEl: e.currentTarget as HTMLElement })}
             className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors"
            >
             <MoreHorizontal size={13} />
            </button>
           )}
           <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setAddingTo(colKey)}
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors"
           >
            <Plus size={13} />
           </button>
          </div>
         </div>

         {/* Cards */}
         <SortableContext id={colKey} items={col.entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <ColumnDropZone colKey={colKey}>
           {col.entries.map((entry) => (
            <SortableCard
             key={entry.id}
             entry={entry}
             displayProps={displayProps}
             properties={properties}
             entryValueMap={entryValueMap}
             databaseId={databaseId}
             workspaceSlug={workspaceSlug}
             workspaceId={workspaceId}
             onClickEntry={onClickEntry}
             onDeleteRequest={setDeleteTarget}
             onDuplicateEntry={onDuplicateEntry}
             onSaveTitle={onSaveTitle}
             onUpdatePropValue={onUpdatePropValue}
             onUpdateProperty={onUpdateProperty}
             onUpdateEntryIcon={onUpdateEntryIcon}
             activeView={activeView}
             onUpdateView={onUpdateView}
            />
           ))}

           {/* Inline add card input */}
           {isAddingHere && (
            <InlineCardInput
             onConfirm={(title) => handleAddCard(col.representativeOptionId !== undefined ? col.representativeOptionId : col.optionId, title)}
             onCancel={() => setAddingTo(null)}
            />
           )}

           {col.entries.length === 0 && !isAddingHere && (
            <p className="py-4 text-center text-xs text-muted-foreground/70">No items</p>
           )}
          </ColumnDropZone>
         </SortableContext>

         {/* Add card button at bottom */}
         {!isAddingHere && (
          <button
           onClick={() => setAddingTo(colKey)}
           className="mx-2 mb-2 flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed border-border/60 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
           <Plus size={12} />
           Add card
          </button>
         )}
        </div>
        )}
       </SortableColumn>
      );
     })}
    </div>
   </SortableContext>

   <DragOverlay>
    {draggingEntry && (
     <CardShell
      entry={draggingEntry}
      displayProps={displayProps}
      properties={properties}
      entryValueMap={entryValueMap}
      databaseId={databaseId}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      onClickEntry={() => {}}
      onDeleteRequest={() => {}}
      onDuplicateEntry={() => {}}
      onSaveTitle={() => {}}
      onUpdatePropValue={() => {}}
      onUpdateProperty={onUpdateProperty}
      onUpdateEntryIcon={onUpdateEntryIcon}
      activeView={activeView}
      onUpdateView={onUpdateView}
      dragging
     />
    )}
   </DragOverlay>
  </DndContext>

  {pinTooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={pinTooltip.rect} label={pinTooltip.label} />,
   document.body,
  )}

  <ConfirmDialog
   open={deleteTarget !== null}
   onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
   title="Delete entry?"
   description="This entry will be permanently deleted. This cannot be undone."
   confirmLabel="Delete"
   onConfirm={() => { if (deleteTarget) { onDeleteEntry(deleteTarget); setDeleteTarget(null); } }}
  />

  {groupMenu && (() => {
   const opt = groupOptions.find((o) => o.id === groupMenu.optionId);
   if (!opt) return null;
   return (
    <GroupHeaderMenu
     getAnchorRect={() => groupMenu.triggerEl.getBoundingClientRect()}
     hideAggregation={hideAggregation}
     onEditGroups={() => setEditingGroups(true)}
     onToggleHideAggregation={() => onUpdateView({ boardSettings: { ...boardSettings, hideAggregation: !hideAggregation } })}
     onHideGroup={() => onUpdateView({ boardSettings: { ...boardSettings, hiddenGroupOptionIds: [...hiddenGroupOptionIds, groupMenu.optionId] } })}
     onDeleteGroup={() => setDeleteGroupTarget({ id: opt.id, name: opt.name })}
     onClose={() => setGroupMenu(null)}
    />
   );
  })()}

  {editingGroups && groupProp && (
   <GroupSettingsPanel
    groupProp={groupProp as unknown as DbProperty}
    properties={properties as unknown as DbProperty[]}
    boardSettings={boardSettings}
    getAnchorRect={getEditPropertyAnchorRect}
    onUpdateView={onUpdateView}
    onUpdateProperty={onUpdateProperty}
    onClose={() => setEditingGroups(false)}
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
