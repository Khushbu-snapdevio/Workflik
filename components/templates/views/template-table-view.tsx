"use client";

import {
 useEffect, useRef, useState, useCallback, type KeyboardEvent, type MouseEvent as ReactMouseEvent,
} from "react";
import {
 Plus as PlusIcon, MoreHorizontal as DotsThreeIcon, Trash2 as TrashIcon, Copy as CopyIcon,
 ExternalLink as ArrowSquareOutIcon, Type as TextTIcon, Hash as NumberCircleOneIcon,
 Calendar as CalendarBlankIcon, CheckSquare as CheckSquareIcon, Link as LinkIcon,
 List as ListBulletsIcon, Tag as TagIcon, Settings2 as GearIcon,
 Pencil as PencilSimpleIcon, User as UserIcon, GripVertical, FileText,
 MessageSquare as MessageSquareIcon, Link2 as Link2Icon,
} from "lucide-react";
import {
 DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
 type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
 SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useSession } from "@/lib/auth/client";
import { toggleSelfVote } from "@/lib/databases/vote";
import type { DatabaseProperty, DatabaseView } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CellCommentPopover } from "@/components/database/cell-comment-popover";
import { CellActionOverlay } from "@/components/database/cell-action-overlay";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { getOptionColor, groupOptions, PROPERTY_TYPE_ICON, formatDateValue } from "@/components/database/property-registry";
import { EditPropertySidePanel } from "@/components/database/edit-property-panel";
import { resolveDisplayAs, resolveWrapContent } from "@/components/database/view-property-resolver";
import { PageIcon } from "@/components/pages/page-icon";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import type { SelectOption, DbPropertyConfig, DbProperty, DbView, ViewPropertyOverride } from "@/components/database/types";

// ── Types ─────────────────────────────────────────────────────────────────────
// Option/config shapes are the shared, canonical ones (components/database/types.ts)
// so colors, groups, and display settings render consistently across every view.

type PropOption   = SelectOption;
type PropConfig   = DbPropertyConfig;
// Badge-style properties (colored pill values) and Person (an avatar chip,
// not really "text" a copy-to-clipboard makes sense for) intentionally get
// comment-only hover actions — no copy-to-clipboard, unlike plain-value
// properties. "created_by" doesn't need an entry here — it skips the hover
// overlay entirely (see the createPortal call below).
const BADGE_TYPES = new Set(["select", "multi_select", "person"]);
type SelectVal   = { optionId?: string };
type MultiSelectVal = { optionIds?: string[] };
type CheckboxVal  = { checked?: boolean };
type DateVal    = { date?: string };
type NumberVal   = { number?: number };
type TextVal    = { text?: string };
type EmailVal    = { email?: string };
type UrlVal     = { url?: string };
type PersonVal   = { userIds?: string[]; _members?: { id: string; name?: string; email?: string }[] };

// ── Property text helper (for clipboard copy + comment quote snapshot) ───────
function getPropertyText(prop: DatabaseProperty, raw: unknown): string {
 if (!raw) return "";
 const v = raw as Record<string, unknown>;
 const config = (prop.config ?? {}) as PropConfig;
 switch (prop.type) {
  case "text":   return String((v as TextVal).text ?? "");
  case "number": return (v as NumberVal).number != null ? String((v as NumberVal).number) : "";
  case "url":    return String((v as UrlVal).url ?? "");
  case "email":  return String((v as EmailVal).email ?? "");
  case "phone":  return String((v as { phone?: string }).phone ?? "");
  case "checkbox": return (v as CheckboxVal).checked ? "Yes" : "No";
  case "person":
  case "created_by": {
   const members = ((v as PersonVal)._members) ?? [];
   return members.map((m) => m.name || m.email).filter(Boolean).join(", ");
  }
  case "date": return formatDateValue(v);
  case "select": {
   const optId = (v as SelectVal).optionId;
   if (!optId) return "";
   return (config.options ?? []).find((o) => o.id === optId)?.name ?? "";
  }
  case "multi_select": {
   const ids = (v as MultiSelectVal).optionIds ?? [];
   const opts = config.options ?? [];
   return ids.map((id) => opts.find((o) => o.id === id)?.name ?? "").filter(Boolean).join(", ");
  }
  default: return "";
 }
}

// ── Editable scalar cell ──────────────────────────────────────────────────────

function EditableCell({
 value, type, placeholder, onSave, onEditingChange,
}: {
 value:    string | number | null | undefined;
 type:    "text" | "number" | "email" | "url";
 placeholder: string;
 onSave:   (v: unknown) => void;
 onEditingChange: (editing: boolean) => void;
}) {
 const [editing, setEditing] = useState(false);
 const [draft,  setDraft]  = useState("");
 const inputRef       = useRef<HTMLInputElement>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 function startEdit() {
  setDraft(value != null ? String(value) : "");
  setEditing(true);
 }

 useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
 // Hide the hover overlay (comment/copy icons) the whole time this cell is
 // being typed into, matching Notion — not just report it once on click.
 useEffect(() => {
  onEditingChange(editing);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [editing]);

 function commit() {
  setEditing(false);
  const v = draft.trim();
  if (type === "number") {
   onSave(v === "" ? null : { number: Number(v) });
  } else if (type === "email") {
   onSave(v === "" ? null : { email: v });
  } else if (type === "url") {
   onSave(v === "" ? null : { url: v });
  } else {
   onSave(v === "" ? null : { text: v });
  }
 }

 function onKey(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") commit();
  if (e.key === "Escape") setEditing(false);
 }

 if (editing) {
  return (
   <input
    ref={inputRef}
    type={type === "number" ? "number" : "text"}
    value={draft}
    onChange={(e) => setDraft(e.target.value)}
    onBlur={commit}
    onKeyDown={onKey}
    className="w-full bg-background border border-primary/60 rounded px-2 py-0.5 text-sm text-foreground outline-none"
   />
  );
 }

 const display = value != null && value !== "" ? String(value) : null;

 // URL: show as clickable link with an edit pencil on hover
 if (type === "url" && display) {
  const href = display.startsWith("http") ? display : `https://${display}`;
  return (
   <div className="group/url flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors">
    <a
     href={href}
     target="_blank"
     rel="noopener noreferrer"
     onClick={(e) => e.stopPropagation()}
     className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm text-primary underline-offset-2 hover:underline"
    >
     <LinkIcon size={11} className="shrink-0" />
     <span className="truncate">{display}</span>
    </a>
    <button
     onClick={startEdit}
     onMouseEnter={(e) => showTooltip("Edit URL", e)}
     onMouseLeave={hideTooltip}
     className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground group-hover/url:block transition-colors"
    >
     <PencilSimpleIcon size={11} />
    </button>
    {tooltip && typeof document !== "undefined" && createPortal(
     <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
     document.body,
    )}
   </div>
  );
 }

 return (
  <button
   onClick={startEdit}
   className="block w-full min-w-0 rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60 transition-colors"
  >
   {display
    ? <span className="block truncate text-foreground">{display}</span>
    : <span className="block truncate text-muted-foreground/60 text-xs">{placeholder}</span>
   }
  </button>
 );
}

// ── Option badge (reusable) ────────────────────────────────────────────────────

function OptionBadge({ name, color, displayAs, wrap }: { name: string; color: string; displayAs?: "select" | "checkbox"; wrap?: boolean }) {
 const wrapCls = wrap ? "whitespace-normal break-words" : "truncate";
 if (displayAs === "checkbox") {
  return (
   <span className="flex size-4 shrink-0 items-center justify-center rounded border border-primary bg-primary text-xs font-bold text-primary-foreground">
    ✓
   </span>
  );
 }
 const c = getOptionColor(color);
 return (
  <span
   className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-[var(--radius-xs)] px-1.5 py-0.5 text-xs font-medium"
   style={{ backgroundColor: c.bg, color: c.text }}
  >
   <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.dot }} />
   <span className={wrapCls}>{name}</span>
  </span>
 );
}

// ── Select cell ───────────────────────────────────────────────────────────────

function SelectCell({
 value, options, config, resolvedDisplayAs, resolvedWrapContent, onSave, onEditProperty,
}: {
 value:  SelectVal | null | undefined;
 options: PropOption[];
 config: PropConfig;
 resolvedDisplayAs?: "select" | "checkbox";
 resolvedWrapContent?: boolean;
 onSave: (v: unknown) => void;
 onEditProperty: (rect: DOMRect) => void;
}) {
 const [open, setOpen] = useState(false);
 const ref       = useRef<HTMLDivElement>(null);
 const current     = options.find((o) => o.id === value?.optionId);
 const grouped     = !!config.groupedByStatus;
 const sections     = groupOptions(options, grouped);
 const displayAs    = resolvedDisplayAs ?? config.displayAs;
 const wrapContent   = resolvedWrapContent ?? config.wrapContent;

 useEffect(() => {
  if (!open) return;
  function handler(e: MouseEvent) {
   if (!ref.current?.contains(e.target as Node)) setOpen(false);
  }
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
 }, [open]);

 return (
  <div ref={ref} className="relative">
   <button
    onClick={() => setOpen((p) => !p)}
    className="flex w-full items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
   >
    {current
     ? <OptionBadge name={current.name} color={current.color} displayAs={displayAs} wrap={wrapContent} />
     : displayAs === "checkbox"
     ? <span className="flex size-4 shrink-0 items-center justify-center rounded border border-border" />
     : <span className="text-xs text-muted-foreground/60">Empty</span>
    }
   </button>

   {open && (
    <div className="absolute left-0 top-full z-[300] mt-0.5 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
     {current && (
      <button
       onClick={() => { onSave(null); setOpen(false); }}
       className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
      >
       Clear
      </button>
     )}
     {sections.map((section) => (
      <div key={section.key}>
       {section.label && (
        <p className="mb-0.5 mt-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">{section.label}</p>
       )}
       {section.options.map((opt) => (
        <button
         key={opt.id}
         onClick={() => { onSave({ optionId: opt.id }); setOpen(false); }}
         className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent transition-colors"
        >
         <OptionBadge name={opt.name} color={opt.color} />
         {opt.id === current?.id && <span className="ml-auto text-primary text-xs font-bold">✓</span>}
        </button>
       ))}
      </div>
     ))}
     <div className="my-1 h-px bg-border/60" />
     <button
      onClick={(e) => { onEditProperty((e.currentTarget as HTMLElement).getBoundingClientRect()); setOpen(false); }}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
     >
      <GearIcon size={12} /> Edit property
     </button>
    </div>
   )}
  </div>
 );
}

// ── Multi-select cell ─────────────────────────────────────────────────────────

function MultiSelectCell({
 value, options, config, resolvedDisplayAs, resolvedWrapContent, onSave, onEditProperty,
}: {
 value:  MultiSelectVal | null | undefined;
 options: PropOption[];
 config: PropConfig;
 resolvedDisplayAs?: "select" | "checkbox";
 resolvedWrapContent?: boolean;
 onSave: (v: unknown) => void;
 onEditProperty: (rect: DOMRect) => void;
}) {
 const [open, setOpen]    = useState(false);
 const ref          = useRef<HTMLDivElement>(null);
 const selectedIds      = value?.optionIds ?? [];
 const selectedOpts      = options.filter((o) => selectedIds.includes(o.id));
 const displayAs       = resolvedDisplayAs ?? config.displayAs;
 const wrapContent      = resolvedWrapContent ?? config.wrapContent;

 useEffect(() => {
  if (!open) return;
  function handler(e: MouseEvent) {
   if (!ref.current?.contains(e.target as Node)) setOpen(false);
  }
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
 }, [open]);

 function toggle(optId: string) {
  const next = selectedIds.includes(optId)
   ? selectedIds.filter((id) => id !== optId)
   : [...selectedIds, optId];
  onSave({ optionIds: next });
 }

 return (
  <div ref={ref} className="relative">
   <button
    onClick={() => setOpen((p) => !p)}
    className="flex w-full min-h-[24px] flex-wrap items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
   >
    {selectedOpts.length > 0
     ? selectedOpts.map((o) => <OptionBadge key={o.id} name={o.name} color={o.color} displayAs={displayAs} wrap={wrapContent} />)
     : <span className="text-xs text-muted-foreground/60">Empty</span>
    }
   </button>

   {open && (
    <div className="absolute left-0 top-full z-[300] mt-0.5 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
     {selectedOpts.length > 0 && (
      <button
       onClick={() => { onSave({ optionIds: [] }); setOpen(false); }}
       className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
      >
       Clear
      </button>
     )}
     {options.map((opt) => {
      const checked = selectedIds.includes(opt.id);
      return (
       <button
        key={opt.id}
        onClick={() => toggle(opt.id)}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent transition-colors"
       >
        <OptionBadge name={opt.name} color={opt.color} />
        {checked && <span className="ml-auto text-primary text-xs font-bold">✓</span>}
       </button>
      );
     })}
     <div className="my-1 h-px bg-border/60" />
     <button
      onClick={(e) => { onEditProperty((e.currentTarget as HTMLElement).getBoundingClientRect()); setOpen(false); }}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
     >
      <GearIcon size={12} /> Edit property
     </button>
    </div>
   )}
  </div>
 );
}

// ── Select / Multi-select cell (non-Status) ──────────────────────────────────
// Regular Select/Multi-select columns use the same proper Notion-style
// popover as Board/Gallery (search, create-with-colored-badge preview, drag
// reorder) via CellEditorPopover, instead of the old flat checkmark-list
// dropdown above — which is kept ONLY for Status (groupedByStatus) so its
// already-tuned behavior stays untouched.
function SelectPopoverCell({
 property, value, options, config, resolvedDisplayAs, resolvedWrapContent,
 workspaceId, multi, onSave, onEditProperty, onUpdateProperty,
}: {
 property: DatabaseProperty;
 value:  SelectVal | MultiSelectVal | null | undefined;
 options: PropOption[];
 config: PropConfig;
 resolvedDisplayAs?: "select" | "checkbox";
 resolvedWrapContent?: boolean;
 workspaceId: string;
 multi:  boolean;
 onSave: (v: unknown) => void;
 onEditProperty: (rect: DOMRect) => void;
 onUpdateProperty: (propId: string, patch: Record<string, unknown>) => void;
}) {
 const [rect, setRect] = useState<DOMRect | null>(null);
 const displayAs   = resolvedDisplayAs ?? config.displayAs;
 const wrapContent  = resolvedWrapContent ?? config.wrapContent;

 const selectedIds = multi ? (value as MultiSelectVal | null)?.optionIds ?? [] : [];
 const selectedOpts = multi ? options.filter((o) => selectedIds.includes(o.id)) : [];
 const currentOpt  = !multi ? options.find((o) => o.id === (value as SelectVal | null)?.optionId) : undefined;

 return (
  <>
   <button
    type="button"
    onClick={(e) => setRect((e.currentTarget as HTMLElement).getBoundingClientRect())}
    className={
     multi
      ? "flex min-h-[24px] w-full flex-wrap items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted/60"
      : "flex w-full items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted/60"
    }
   >
    {multi ? (
     selectedOpts.length > 0 ? (
      selectedOpts.map((o) => (
       <OptionBadge key={o.id} name={o.name} color={o.color} displayAs={displayAs} wrap={wrapContent} />
      ))
     ) : (
      <span className="text-xs text-muted-foreground/60">Empty</span>
     )
    ) : currentOpt ? (
     <OptionBadge name={currentOpt.name} color={currentOpt.color} displayAs={displayAs} wrap={wrapContent} />
    ) : displayAs === "checkbox" ? (
     <span className="flex size-4 shrink-0 items-center justify-center rounded border border-border" />
    ) : (
     <span className="text-xs text-muted-foreground/60">Empty</span>
    )}
   </button>

   {rect && (
    <CellEditorPopover
     property={property as unknown as DbProperty}
     value={value ?? null}
     cellRect={rect}
     workspaceId={workspaceId}
     onSave={onSave}
     onClose={() => setRect(null)}
     onPropertyConfigChange={(propId, cfg) => onUpdateProperty(propId, { config: cfg })}
     onEditProperty={(r) => { onEditProperty(r); setRect(null); }}
    />
   )}
  </>
 );
}

// ── Date cell ─────────────────────────────────────────────────────────────────
// Uses the same shared CellDisplay (read) + CellEditorPopover (edit — range,
// time/timezone, format, reminder) as every other database view, instead of
// EditableCell's plain single-date DatePicker.
function DateCell({
 property, value, workspaceId, onSave, onEditingChange,
}: {
 property: DatabaseProperty;
 value:  DateVal | null | undefined;
 workspaceId: string;
 onSave: (v: unknown) => void;
 onEditingChange?: (editing: boolean) => void;
}) {
 const [rect, setRect] = useState<DOMRect | null>(null);
 const hasValue = !!value?.date;

 function open(e: ReactMouseEvent<HTMLButtonElement>) {
  setRect((e.currentTarget as HTMLElement).getBoundingClientRect());
  onEditingChange?.(true);
 }
 function close() {
  setRect(null);
  onEditingChange?.(false);
 }

 return (
  <>
   <button
    type="button"
    onClick={open}
    className="flex min-h-[24px] w-full items-center rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/60"
   >
    {hasValue ? (
     <CellDisplay property={property as unknown as DbProperty} value={value} />
    ) : (
     <span className="text-xs text-muted-foreground/60">Pick date</span>
    )}
   </button>

   {rect && (
    <CellEditorPopover
     property={property as unknown as DbProperty}
     value={value ?? null}
     cellRect={rect}
     workspaceId={workspaceId}
     onSave={onSave}
     onClose={close}
    />
   )}
  </>
 );
}

// ── Checkbox cell ─────────────────────────────────────────────────────────────

function CheckboxCell({ value, onSave }: { value: CheckboxVal | null | undefined; onSave: (v: unknown) => void }) {
 const checked = value?.checked ?? false;
 return (
  <button
   onClick={() => onSave({ checked: !checked })}
   className={`flex size-4 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"}`}
  >
   {checked && "✓"}
  </button>
 );
}

// ── Person cell ───────────────────────────────────────────────────────────────
// Uses the same shared CellDisplay (read) + CellEditorPopover (edit, workspace-
// member picker) as every other database view — this used to be its own
// free-text "type a name" input storing `{ name }`, which didn't match the
// `{ userIds, _members }` shape every other view saves/reads, so a person
// picked from the entry's own page (or Board/Gallery/Calendar) always showed
// as Empty here.
function PersonCell({
 property, value, workspaceId, onSave,
}: {
 property: DatabaseProperty;
 value:  PersonVal | null | undefined;
 workspaceId: string;
 onSave: (v: unknown) => void;
}) {
 const [rect, setRect] = useState<DOMRect | null>(null);
 const { data: session } = useSession();
 const hasValue = (value?.userIds?.length ?? 0) > 0;
 const voteMode = !!(property.config as { voteMode?: boolean } | null)?.voteMode;

 // Vote-mode: clicking toggles the current viewer's own vote directly, never
 // opens the people picker — so there's no path here to editing anyone
 // else's vote. Server enforces the same self-only rule independently.
 if (voteMode) {
  return (
   <button
    type="button"
    disabled={!session?.user?.id}
    onClick={() => { if (session?.user?.id) onSave(toggleSelfVote(value, session.user)); }}
    className="flex min-h-[24px] w-fit items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/60 disabled:cursor-default"
   >
    <CellDisplay property={property as unknown as DbProperty} value={value ?? { userIds: [] }} workspaceId={workspaceId} />
   </button>
  );
 }

 return (
  <>
   <button
    type="button"
    onClick={(e) => setRect((e.currentTarget as HTMLElement).getBoundingClientRect())}
    className="flex min-h-[24px] w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/60"
   >
    {hasValue ? (
     <CellDisplay property={property as unknown as DbProperty} value={value} workspaceId={workspaceId} />
    ) : (
     <>
      <UserIcon size={12} className="shrink-0 text-muted-foreground/70" />
      <span className="text-xs text-muted-foreground/60">Empty</span>
     </>
    )}
   </button>

   {rect && (
    <CellEditorPopover
     property={property as unknown as DbProperty}
     value={value ?? null}
     cellRect={rect}
     workspaceId={workspaceId}
     onSave={onSave}
     onClose={() => setRect(null)}
    />
   )}
  </>
 );
}

// ── Files cell ───────────────────────────────────────────────────────────────
// Same CellDisplay (read) + CellEditorPopover (edit, upload/link) pattern as
// PersonCell above — keeps the template preview's editing behavior identical
// to the live app's table-view.tsx instead of a second, divergent implementation.
function FileCell({
 property, value, workspaceId, onSave,
}: {
 property: DatabaseProperty;
 value:  { files?: { id: string; url: string; name: string; mimeType: string; sizeBytes: number }[] } | null | undefined;
 workspaceId: string;
 onSave: (v: unknown) => void;
}) {
 const [rect, setRect] = useState<DOMRect | null>(null);
 const hasValue = (value?.files?.length ?? 0) > 0;

 return (
  <>
   <button
    type="button"
    onClick={(e) => setRect((e.currentTarget as HTMLElement).getBoundingClientRect())}
    className="flex min-h-[24px] w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/60"
   >
    {hasValue ? (
     <CellDisplay property={property as unknown as DbProperty} value={value} compact workspaceId={workspaceId} />
    ) : (
     <span className="text-xs text-muted-foreground/60">Empty</span>
    )}
   </button>

   {rect && (
    <CellEditorPopover
     property={property as unknown as DbProperty}
     value={value ?? null}
     cellRect={rect}
     workspaceId={workspaceId}
     onSave={onSave}
     onClose={() => setRect(null)}
    />
   )}
  </>
 );
}

// ── Column header ─────────────────────────────────────────────────────────────

function ColumnHeader({
 prop,
 properties,
 workspaceId,
 onRename,
 onDelete,
 onUpdateProperty,
 onDuplicateProperty,
 getEditPropertyAnchorRect,
 activeView,
 onUpdateView,
}: {
 prop:   DatabaseProperty;
 properties: DatabaseProperty[];
 workspaceId: string;
 onRename: (id: string, name: string) => void;
 onDelete: (id: string) => void;
 onUpdateProperty: (propId: string, patch: Record<string, unknown>) => void;
 onDuplicateProperty: (prop: DatabaseProperty) => void;
 getEditPropertyAnchorRect: () => DOMRect;
 activeView?: DatabaseView | null;
 onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
}) {
 const [menuOpen, setMenuOpen] = useState(false);
 const [renaming, setRenaming] = useState(false);
 const [draftName, setDraftName] = useState(prop.name);
 const [confirmDelete, setConfirmDelete] = useState(false);
 // "Edit property" replaces this same menu's content in place, at the same anchor —
 // matches Notion's behavior of drilling into a sub-panel rather than opening a new one.
 const [editingProperty, setEditingProperty] = useState(false);
 const menuRef = useRef<HTMLDivElement>(null);
 const triggerRef = useRef<HTMLButtonElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
  if (!menuOpen) return;
  function h(e: MouseEvent) {
   const target = e.target as HTMLElement;
   // EditPropertySidePanel (and its own nested submenu/confirm-dialog portals) render
   // outside menuRef's DOM subtree — without this they'd read as "outside" and close mid-interaction.
   if (target.closest?.('[role="alertdialog"], [data-edit-property-exempt]')) return;
   if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
    setMenuOpen(false);
    setEditingProperty(false);
   }
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [menuOpen]);

 useEffect(() => {
  if (renaming) inputRef.current?.focus();
 }, [renaming]);

 const Icon = PROPERTY_TYPE_ICON[prop.type as keyof typeof PROPERTY_TYPE_ICON] ?? TextTIcon;
 const propConfig = (prop.config ?? {}) as PropConfig;

 function commitRename() {
  const n = draftName.trim();
  if (n && n !== prop.name) onRename(prop.id, n);
  setRenaming(false);
  setMenuOpen(false);
 }

 return (
  <>
   <div className="flex items-center justify-between gap-1 w-full">
    <div className="flex min-w-0 items-center gap-1.5">
     {propConfig.icon
      ? <PageIcon icon={propConfig.icon} size={12} className="shrink-0" />
      : <Icon size={12} className="shrink-0 text-muted-foreground/60" />
     }
     <span className="truncate text-xs font-semibold text-muted-foreground tracking-wide">
      {prop.name}
     </span>
    </div>

    <div ref={menuRef} className="relative shrink-0">
     <button
      ref={triggerRef}
      onClick={() => setMenuOpen((p) => !p)}
      className="flex size-5 items-center justify-center rounded text-muted-foreground/70 opacity-0 group-hover/col:opacity-100 hover:bg-accent hover:text-foreground transition-all"
     >
      <DotsThreeIcon size={14} />
     </button>

     {menuOpen && !editingProperty && (
      <div className="absolute right-0 top-full z-[500] mt-0.5 w-[190px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
       {renaming ? (
        <div className="flex items-center gap-2 px-2 py-1.5">
         <input
          ref={inputRef}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
           if (e.key === "Enter") commitRename();
           if (e.key === "Escape") { setRenaming(false); setMenuOpen(false); }
          }}
          className="flex-1 rounded-[var(--radius-sm)] border border-primary/60 bg-background px-2 py-1 text-xs text-foreground outline-none"
         />
        </div>
       ) : (
        <>
         <button
          onClick={() => { setDraftName(prop.name); setRenaming(true); }}
          className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
         >
          <PencilSimpleIcon size={13} /> Rename
         </button>
         {!prop.isSystem && (
          <button
           onClick={() => setEditingProperty(true)}
           className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
           <GearIcon size={13} /> Edit property
          </button>
         )}
         <div className="my-1 h-px bg-border/40" />
         <button
          onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
          className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
         >
          <TrashIcon size={13} /> Delete property
         </button>
        </>
       )}
      </div>
     )}

     {menuOpen && editingProperty && (
      <EditPropertySidePanel
       property={prop as unknown as DbProperty}
       properties={properties as unknown as DbProperty[]}
       workspaceId={workspaceId}
       getAnchorRect={getEditPropertyAnchorRect}
       canDelete={!prop.isSystem}
       onUpdateProperty={async (patch) => onUpdateProperty(prop.id, patch)}
       onDeleteProperty={async () => onDelete(prop.id)}
       onDuplicateProperty={async () => onDuplicateProperty(prop)}
       onBack={() => setEditingProperty(false)}
       onClose={() => { setEditingProperty(false); setMenuOpen(false); }}
       viewContext={activeView && onUpdateView ? {
        override: ((activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined) ?? {})[prop.id] ?? {},
        onUpdateOverride: (patch) => onUpdateView({
         propertyOverrides: {
          ...(activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined),
          [prop.id]: { ...(((activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined) ?? {})[prop.id] ?? {}), ...patch },
         },
        }),
       } : undefined}
      />
     )}
    </div>
   </div>
   <ConfirmDialog
    open={confirmDelete}
    onOpenChange={setConfirmDelete}
    title="Delete property?"
    description={`"${prop.name}" and all its data will be permanently removed. This cannot be undone.`}
    confirmLabel="Delete property"
    onConfirm={() => { onDelete(prop.id); setConfirmDelete(false); }}
   />
  </>
 );
}

// ── Add property panel ────────────────────────────────────────────────────────

const PROP_TYPES = [
 { type: "text",     label: "Text",     Icon: TextTIcon      },
 { type: "number",    label: "Number",    Icon: NumberCircleOneIcon },
 { type: "select",    label: "Select",    Icon: ListBulletsIcon   },
 { type: "multi_select", label: "Multi-select", Icon: TagIcon       },
 { type: "date",     label: "Date",     Icon: CalendarBlankIcon  },
 { type: "checkbox",   label: "Checkbox",   Icon: CheckSquareIcon   },
 { type: "url",     label: "URL",      Icon: LinkIcon      },
 { type: "email",    label: "Email",     Icon: LinkIcon      },
];

function AddPropertyPanel({
 onAdd, onClose,
}: {
 onAdd:  (name: string, type: string) => void;
 onClose: () => void;
}) {
 const [name,  setName]  = useState("");
 const [selType, setSelType] = useState("text");
 const [step,  setStep]  = useState<"name" | "type">("name");
 const inputRef       = useRef<HTMLInputElement>(null);
 const ref          = useRef<HTMLDivElement>(null);

 useEffect(() => { inputRef.current?.focus(); }, []);

 useEffect(() => {
  function h(e: MouseEvent) {
   if (!ref.current?.contains(e.target as Node)) onClose();
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [onClose]);

 function submit(type: string) {
  const n = name.trim();
  if (!n) return;
  onAdd(n, type);
  onClose();
 }

 return (
  <div
   ref={ref}
   className="absolute right-0 top-full z-[500] mt-1 w-[240px] rounded-[var(--radius-md)] border border-border bg-popover"
  >
   {step === "name" ? (
    <>
     <div className="border-b border-border/40 px-4 py-3">
      <span className="text-sm font-semibold">New property</span>
     </div>
     <div className="p-3">
      <input
       ref={inputRef}
       value={name}
       onChange={(e) => setName(e.target.value)}
       onKeyDown={(e) => {
        if (e.key === "Enter" && name.trim()) setStep("type");
        if (e.key === "Escape") onClose();
       }}
       placeholder="Property name…"
       className="w-full rounded-[var(--radius-sm)] border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
      />
      <button
       onClick={() => name.trim() && setStep("type")}
       disabled={!name.trim()}
       className="mt-2 w-full rounded-[var(--radius-sm)] bg-primary py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
      >
       Continue →
      </button>
     </div>
    </>
   ) : (
    <>
     <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
      <button
       onClick={() => setStep("name")}
       className="text-muted-foreground hover:text-foreground text-xs transition-colors"
      >
       ← Back
      </button>
      <span className="text-sm font-semibold">Choose type</span>
     </div>
     <div className="p-2">
      {PROP_TYPES.map(({ type, label, Icon }) => (
       <button
        key={type}
        onClick={() => { setSelType(type); submit(type); }}
        className={`flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm hover:bg-accent transition-colors ${selType === type ? "bg-muted font-medium" : ""}`}
       >
        <Icon size={14} className="shrink-0 text-muted-foreground" />
        {label}
       </button>
      ))}
     </div>
    </>
   )}
  </div>
 );
}

// ── Inline title input ────────────────────────────────────────────────────────

function InlineTitleInput({
 entryId, initialTitle, onSave,
}: {
 entryId:   string;
 initialTitle: string;
 onSave:    (id: string, title: string) => void;
}) {
 const [val, setVal] = useState(initialTitle);
 const ref      = useRef<HTMLInputElement>(null);

 useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

 function commit() { onSave(entryId, val); }

 return (
  <input
   ref={ref}
   value={val}
   onChange={(e) => {
    setVal(e.target.value);
    window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: entryId, title: e.target.value } }));
   }}
   onBlur={commit}
   onKeyDown={(e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") onSave(entryId, initialTitle);
   }}
   className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
   placeholder="Untitled"
  />
 );
}

// ── Cell renderer ─────────────────────────────────────────────────────────────

function CellContent({
 prop, raw, activeView, workspaceId, onSave, onEditProperty, onUpdateProperty, onEditingChange,
}: {
 prop:  DatabaseProperty;
 raw:  unknown;
 activeView?: DatabaseView | null;
 workspaceId: string;
 onSave: (v: unknown) => void;
 onEditProperty: (propId: string, rect: DOMRect) => void;
 onUpdateProperty: (propId: string, patch: Record<string, unknown>) => void;
 onEditingChange: (editing: boolean) => void;
}) {
 const config = (prop.config ?? {}) as PropConfig;
 const options = config.options ?? [];
 const resolvedDisplayAs  = resolveDisplayAs(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined);
 const resolvedWrapContent = resolveWrapContent(prop as unknown as DbProperty, activeView as unknown as DbView | null | undefined);
 // Status keeps its own already-tuned flat dropdown untouched; every other
 // Select/Multi-select gets the proper Notion-style popover (search,
 // create-with-colored-badge, drag reorder) via CellEditorPopover.
 const isStatus = !!config.groupedByStatus;

 switch (prop.type) {
  case "text": {
   const tv = raw as TextVal | null;
   return <EditableCell value={tv?.text} type="text" placeholder="Empty" onSave={onSave} onEditingChange={onEditingChange} />;
  }
  case "number": {
   const nv = raw as NumberVal | null;
   return <EditableCell value={nv?.number} type="number" placeholder="—" onSave={onSave} onEditingChange={onEditingChange} />;
  }
  case "date":
   return <DateCell property={prop} value={raw as DateVal | null} workspaceId={workspaceId} onSave={onSave} onEditingChange={onEditingChange} />;
  case "email": {
   const ev = raw as EmailVal | null;
   return <EditableCell value={ev?.email} type="email" placeholder="Empty" onSave={onSave} onEditingChange={onEditingChange} />;
  }
  case "url": {
   const uv = raw as UrlVal | null;
   return <EditableCell value={uv?.url} type="url" placeholder="Empty" onSave={onSave} onEditingChange={onEditingChange} />;
  }
  case "select":
   if (isStatus) {
    return <SelectCell value={raw as SelectVal | null} options={options} config={config} resolvedDisplayAs={resolvedDisplayAs} resolvedWrapContent={resolvedWrapContent} onSave={onSave} onEditProperty={(rect) => onEditProperty(prop.id, rect)} />;
   }
   return (
    <SelectPopoverCell
     property={prop}
     value={raw as SelectVal | null}
     options={options}
     config={config}
     resolvedDisplayAs={resolvedDisplayAs}
     resolvedWrapContent={resolvedWrapContent}
     workspaceId={workspaceId}
     multi={false}
     onSave={onSave}
     onEditProperty={(rect) => onEditProperty(prop.id, rect)}
     onUpdateProperty={onUpdateProperty}
    />
   );
  case "multi_select":
   if (isStatus) {
    return <MultiSelectCell value={raw as MultiSelectVal | null} options={options} config={config} resolvedDisplayAs={resolvedDisplayAs} resolvedWrapContent={resolvedWrapContent} onSave={onSave} onEditProperty={(rect) => onEditProperty(prop.id, rect)} />;
   }
   return (
    <SelectPopoverCell
     property={prop}
     value={raw as MultiSelectVal | null}
     options={options}
     config={config}
     resolvedDisplayAs={resolvedDisplayAs}
     resolvedWrapContent={resolvedWrapContent}
     workspaceId={workspaceId}
     multi
     onSave={onSave}
     onEditProperty={(rect) => onEditProperty(prop.id, rect)}
     onUpdateProperty={onUpdateProperty}
    />
   );
  case "checkbox":
   return (
    <div className="flex items-center px-1">
     <CheckboxCell value={raw as CheckboxVal | null} onSave={onSave} />
    </div>
   );
  case "person":
   return <PersonCell property={prop} value={raw as PersonVal | null} workspaceId={workspaceId} onSave={onSave} />;
  case "files":
   return <FileCell property={prop} value={raw as { files?: { id: string; url: string; name: string; mimeType: string; sizeBytes: number }[] } | null} workspaceId={workspaceId} onSave={onSave} />;
  // Computed server-side from the entry's own creator, same as Rollup/Formula
  // — read-only, no editor popover (there's nothing for a user to pick).
  case "created_by": {
   const pv = raw as PersonVal | null;
   const hasValue = (pv?.userIds?.length ?? 0) > 0;
   return (
    <div className="flex min-h-[24px] w-full items-center px-1 py-0.5">
     {hasValue
      ? <CellDisplay property={prop as unknown as DbProperty} value={pv} workspaceId={workspaceId} />
      : <span className="text-xs text-muted-foreground/60">Empty</span>
     }
    </div>
   );
  }
  case "phone": {
   const pv = raw as { phone?: string } | null;
   return <EditableCell value={pv?.phone} type="text" placeholder="Empty" onSave={(v) => onSave(v ? { phone: (v as { text: string }).text } : null)} onEditingChange={onEditingChange} />;
  }
  default:
   return <span className="px-1 text-xs text-muted-foreground/70">—</span>;
 }
}

// ── Sortable row ──────────────────────────────────────────────────────────────

interface SortableRowProps {
 entry:       TemplateEntry;
 visibleProps:   DatabaseProperty[];
 entryValueMap:  Map<string, Map<string, unknown>>;
 workspaceSlug:  string;
 workspaceId:   string;
 selectedIds:   Set<string>;
 editingTitleId:  string | null;
 deleteTarget:   string | null;
 activeView:    DatabaseView | null | undefined;
 onToggleSelect:  (id: string) => void;
 onSaveTitle:   (entryId: string, title: string) => void;
 onClickEntry:   (entryId: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
 onSetDeleteTarget: (id: string) => void;
 onDuplicateEntry:  (id: string) => void;
 onEditProperty:   (propId: string, rect: DOMRect) => void;
 onUpdateProperty:  (propId: string, patch: Record<string, unknown>) => void;
}

function SortableRow({
 entry, visibleProps, entryValueMap, workspaceSlug, workspaceId, selectedIds, editingTitleId,
 deleteTarget, activeView, onToggleSelect, onSaveTitle, onClickEntry, onUpdatePropValue,
 onSetDeleteTarget, onDuplicateEntry, onEditProperty, onUpdateProperty,
}: SortableRowProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
  useSortable({ id: entry.id });
 const [rowHovered, setRowHovered] = useState(false);
 const [menuOpen, setMenuOpen]   = useState(false);
 // Comment popover — tracks which cell (propId) it was opened from, plus a
 // frozen snapshot of that property's name/value for the quoted reference.
 const [commentPopover, setCommentPopover] = useState<{
  rect: DOMRect; propId: string | null; propName: string | null; valueLabel: string | null;
 } | null>(null);
 const menuRef = useRef<HTMLDivElement>(null);

 // Portal-based per-cell hover overlay (comment + copy icons)
 const [hoveredCell, setHoveredCell] = useState<{
  propId: string; prop: DatabaseProperty; rawVal: unknown; rect: DOMRect;
 } | null>(null);
 // Which property (if any) is currently being typed into — the hover overlay
 // must not show while the user is actively editing a cell, matching Notion
 // (and matching the main workspace table view's behavior).
 const [editingPropId, setEditingPropId] = useState<string | null>(null);
 const [copiedPropId, setCopiedPropId] = useState<string | null>(null);
 const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 // Raw per-property comment list for this row, fetched once and used to derive
 // a per-cell comment badge count (comments are scoped to a property).
 const [rowComments, setRowComments] = useState<Array<{ blockId: string | null; deletedAt: string | null; propertyId: string | null }> | null>(null);
 const commentsFetchedRef = useRef(false);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();
 // entry.commentCount is batch-computed server-side; shadowed in local state
 // so the row badge can bump instantly when a new page-level comment is
 // added via commentPopover below, instead of waiting on the next full fetch.
 const [rowCommentCount, setRowCommentCount] = useState(entry.commentCount ?? 0);
 useEffect(() => { setRowCommentCount(entry.commentCount ?? 0); }, [entry.commentCount]);

 function clearLeaveTimer() {
  if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
 }
 function scheduleLeave() {
  clearLeaveTimer();
  leaveTimerRef.current = setTimeout(() => setHoveredCell(null), 150);
 }

 // The overlay is a `position: fixed` portal anchored to a `rect` snapshotted
 // once on mouseenter. Unlike the click-opened menus (which lock scroll
 // instead), this is a passive hover affordance, so scrolling should just
 // dismiss it rather than block the table — listen in the capture phase so a
 // scroll on the table's scroll container (an ancestor, not this row) is seen.
 useEffect(() => {
  if (!hoveredCell) return;
  function handleScroll() {
   clearLeaveTimer();
   setHoveredCell(null);
  }
  document.addEventListener("scroll", handleScroll, true);
  return () => document.removeEventListener("scroll", handleScroll, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [hoveredCell]);

 function fetchRowComments() {
  if (commentsFetchedRef.current) return;
  commentsFetchedRef.current = true;
  fetch(`/api/pages/${entry.id}/comments`)
   .then((r) => (r.ok ? r.json() : null))
   .then((data) => {
    if (data) setRowComments(data.comments as Array<{ blockId: string | null; deletedAt: string | null; propertyId: string | null }>);
   })
   .catch(() => {});
 }

 function commentCountFor(propId: string | null): number | null {
  if (!rowComments) return null;
  return rowComments.filter((c) => !c.blockId && !c.deletedAt && c.propertyId === propId).length;
 }

 useEffect(() => {
  if (!menuOpen) return;
  function h(e: MouseEvent) {
   if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [menuOpen]);

 const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
 };

 const isSelected = selectedIds.has(entry.id);
 const isEditing  = editingTitleId === entry.id;
 const valMap    = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
 const isRowHovered = rowHovered && !menuOpen;

 return (
  <>
  <tr
   ref={setNodeRef}
   style={style}
   {...attributes}
   suppressHydrationWarning
   onMouseEnter={() => setRowHovered(true)}
   onMouseLeave={() => setRowHovered(false)}
   className={`group/row border-b border-border/30 transition-colors ${isSelected ? "bg-primary/5" : !deleteTarget ? "hover:bg-muted/20" : ""}`}
  >
   {/* Drag handle + row actions (Notion style: 6-dot grip, click for menu) */}
   <td className="w-6 px-0.5 py-0" style={{ touchAction: "none", userSelect: "none" }}>
    <div ref={menuRef} className="relative">
     <div
      {...listeners}
      onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
      onMouseEnter={(e) => showTooltip("Drag · Click for actions", e)}
      onMouseLeave={hideTooltip}
      className="flex size-5 cursor-grab items-center justify-center rounded text-muted-foreground/0 hover:bg-accent hover:text-muted-foreground/60 transition-colors active:cursor-grabbing group-hover/row:text-muted-foreground/40"
     >
      <GripVertical size={13} />
     </div>

     {menuOpen && (
      <div className="absolute left-0 top-full z-[500] mt-0.5 w-[190px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
       <Link
        href={`/app/${workspaceSlug}/${entry.shortId}`}
        onClick={() => setMenuOpen(false)}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
       >
        <ArrowSquareOutIcon size={13} /> Open full page
       </Link>
       <button
        onClick={(e) => {
         setCommentPopover({ rect: (e.currentTarget as HTMLElement).getBoundingClientRect(), propId: null, propName: null, valueLabel: null });
         setMenuOpen(false);
        }}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
       >
        <MessageSquareIcon size={13} /> Comment
       </button>
       <button
        onClick={() => {
         if (typeof window !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(`${window.location.origin}/app/${workspaceSlug}/${entry.shortId}`).catch(() => {});
         }
         toast.success("Link copied to clipboard", { duration: 2000 });
         setMenuOpen(false);
        }}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
       >
        <Link2Icon size={13} /> Copy link
       </button>
       <button
        onClick={() => { onDuplicateEntry(entry.id); setMenuOpen(false); }}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
       >
        <CopyIcon size={13} /> Duplicate
       </button>
       <div className="my-1 h-px bg-border/40" />
       <button
        onClick={() => { setMenuOpen(false); onSetDeleteTarget(entry.id); }}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
       >
        <TrashIcon size={13} /> Delete
       </button>
      </div>
     )}
    </div>
   </td>

   {/* Checkbox */}
   <td className="w-8 px-2 py-0">
    <button
     onClick={() => onToggleSelect(entry.id)}
     className={`flex size-3.5 items-center justify-center rounded border text-xs font-bold transition-all ${isSelected ? "border-primary bg-primary text-primary-foreground opacity-100" : "border-border opacity-0 group-hover/row:opacity-100 hover:border-primary/60"}`}
    >
     {isSelected ? "✓" : ""}
    </button>
   </td>

   {/* Title */}
   <td className="py-1.5 pl-1 pr-2">
    <div className="flex items-center gap-1">
     <div className="min-w-0 flex-1">
      {isEditing ? (
       <InlineTitleInput
        entryId={entry.id}
        initialTitle={entry.title}
        onSave={onSaveTitle}
       />
      ) : (
       <button
        onClick={() => onClickEntry(entry.id)}
        className="w-full rounded px-0.5 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
       >
        {entry.title
         ? <span className="text-foreground">{entry.title}</span>
         : <span className="text-muted-foreground/60">Untitled</span>
        }
       </button>
      )}
     </div>

     {!!rowCommentCount && (
      <button
       type="button"
       onClick={(e) => {
        e.stopPropagation();
        setCommentPopover({ rect: (e.currentTarget as HTMLElement).getBoundingClientRect(), propId: null, propName: null, valueLabel: null });
       }}
       onMouseEnter={(e) => showTooltip("View comments", e)}
       onMouseLeave={hideTooltip}
       className="flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-1 text-[11px] text-muted-foreground/60 transition-opacity duration-150 hover:bg-accent hover:text-foreground"
       style={{ opacity: isRowHovered ? 1 : 0 }}
      >
       <MessageSquareIcon size={11} />
       {rowCommentCount}
      </button>
     )}

     {/* Row quick action: OPEN */}
     <div className="ml-auto flex shrink-0 items-center transition-opacity duration-150"
      style={{ opacity: isRowHovered ? 1 : 0 }}>
      <Link
       href={`/app/${workspaceSlug}/${entry.shortId}`}
       onMouseEnter={(e) => showTooltip("Open full page", e)}
       onMouseLeave={hideTooltip}
       className="flex items-center gap-[3px] rounded-[var(--radius-sm)] border border-border/60 bg-background px-1.5 py-[3px] text-[10px] font-semibold tracking-wide text-muted-foreground/60 hover:border-primary/40 hover:bg-muted/60 hover:text-foreground transition-colors"
      >
       <FileText size={9} />
       OPEN
      </Link>
     </div>
    </div>
   </td>

   {/* Property cells */}
   {visibleProps.map((p) => (
    <td
     key={p.id}
     // pr-7 (not px-1 on the right) reserves a gutter matching the hover
     // CellActionOverlay's comment/copy icon zone — otherwise wide badge
     // content truncates flush to the cell edge and the icons render
     // directly on top of it on hover (same fix as table-view.tsx).
     className="group/cell relative overflow-hidden pl-1 pr-7 py-0.5 transition-colors hover:bg-accent/40"
     onMouseEnter={(e) => {
      clearLeaveTimer();
      if (!commentPopover && editingPropId !== p.id) {
       const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
       setHoveredCell({ propId: p.id, prop: p, rawVal: valMap.get(p.id), rect });
       fetchRowComments();
      }
     }}
     onMouseLeave={scheduleLeave}
    >
     <CellContent
      prop={p}
      raw={valMap.get(p.id)}
      activeView={activeView}
      workspaceId={workspaceId}
      onSave={(v) => onUpdatePropValue(entry.id, p.id, v)}
      onEditProperty={onEditProperty}
      onUpdateProperty={onUpdateProperty}
      onEditingChange={(editing) => {
       if (editing) { clearLeaveTimer(); setHoveredCell(null); setEditingPropId(p.id); }
       else if (editingPropId === p.id) { setEditingPropId(null); }
      }}
     />
    </td>
   ))}

   {/* Spacer */}
   <td />
  </tr>

  {/* Portal overlay — comment + copy icons on cell hover. Skipped entirely
      for "created_by" — it's a computed, read-only value with nothing
      meaningful to comment on or copy per-cell (same reasoning as it having
      no click-to-edit interaction either). */}
  {hoveredCell && hoveredCell.prop.type !== "created_by" && typeof document !== "undefined" && createPortal(
   <CellActionOverlay
    rect={hoveredCell.rect}
    canCopy={!BADGE_TYPES.has(hoveredCell.prop.type) && !!getPropertyText(hoveredCell.prop, hoveredCell.rawVal)}
    commentCount={commentCountFor(hoveredCell.propId)}
    copied={copiedPropId === hoveredCell.propId}
    onClearLeaveTimer={clearLeaveTimer}
    onScheduleLeave={scheduleLeave}
    onCommentClick={(btnRect) => {
     if (!commentPopover) {
      clearLeaveTimer();
      setHoveredCell(null);
     }
     setCommentPopover(commentPopover ? null : {
      rect: btnRect,
      propId: hoveredCell.propId,
      propName: hoveredCell.prop.name,
      valueLabel: getPropertyText(hoveredCell.prop, hoveredCell.rawVal),
     });
    }}
    onCopyClick={() => {
     const txt = getPropertyText(hoveredCell.prop, hoveredCell.rawVal);
     if (!txt) return;
     const apply = () => { setCopiedPropId(hoveredCell.propId); setTimeout(() => setCopiedPropId(null), 1500); };
     if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(apply).catch(() => {
       try {
        const el = document.createElement("textarea");
        el.value = txt; el.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
        document.body.appendChild(el); el.select();
        document.execCommand("copy"); document.body.removeChild(el);
        apply();
       } catch {}
      });
     }
    }}
   />,
   document.body,
  )}

  {commentPopover && createPortal(
   <CellCommentPopover
    pageId={entry.id}
    workspaceId={workspaceId}
    workspaceSlug={workspaceSlug}
    entryShortId={entry.shortId}
    anchorRect={commentPopover.rect}
    propertyId={commentPopover.propId}
    propertyName={commentPopover.propName}
    propertyValueLabel={commentPopover.valueLabel}
    onClose={() => { setCommentPopover(null); commentsFetchedRef.current = false; }}
    onCommentAdded={() => {
     setRowComments((prev) => [...(prev ?? []), { blockId: null, deletedAt: null, propertyId: commentPopover.propId }]);
     if (commentPopover.propId === null) setRowCommentCount((c) => c + 1);
    }}
   />,
   document.body,
  )}
  {tooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
   document.body,
  )}
  </>
 );
}

// ── Main table view ───────────────────────────────────────────────────────────

interface Props {
 entries:      TemplateEntry[];
 properties:    DatabaseProperty[];
 entryValueMap:   Map<string, Map<string, unknown>>;
 workspaceSlug:   string;
 workspaceId:    string;
 selectedIds:    Set<string>;
 editingTitleId:  string | null;
 onToggleSelect:  (id: string) => void;
 onToggleSelectAll: () => void;
 onAddEntry:    (defaultValues?: Record<string, unknown>) => Promise<void>;
 onSaveTitle:    (entryId: string, title: string) => void;
 onStartEditTitle: (entryId: string) => void;
 onClickEntry:   (entryId: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
 onDeleteEntry:   (entryId: string) => void;
 onDuplicateEntry: (entryId: string) => void;
 onAddProperty:   (name: string, type: string, config?: Record<string, unknown>) => void;
 onRenameProperty: (propId: string, name: string) => void;
 onUpdateProperty: (propId: string, patch: Record<string, unknown>) => void;
 onDeleteProperty: (propId: string) => void;
 /** Every "Edit property" popup anchors here (the toolbar's New button) instead of to whatever triggered it — always the same, predictable spot. */
 getEditPropertyAnchorRect: () => DOMRect;
 activeView?: DatabaseView | null;
 onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
}

export function TemplateTableView({
 entries,
 properties,
 entryValueMap,
 workspaceSlug,
 workspaceId,
 selectedIds,
 editingTitleId,
 onToggleSelect,
 onToggleSelectAll,
 onAddEntry,
 onSaveTitle,
 onStartEditTitle,
 onClickEntry,
 onUpdatePropValue,
 onDeleteEntry,
 onDuplicateEntry,
 onAddProperty,
 onRenameProperty,
 onUpdateProperty,
 onDeleteProperty,
 getEditPropertyAnchorRect,
 activeView,
 onUpdateView,
}: Props) {
 const [showAddProp, setShowAddProp] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
 const [deletingEntry, setDeletingEntry] = useState(false);
 const [localOrder, setLocalOrder] = useState<string[]>([]);
 const [draggingId, setDraggingId] = useState<string | null>(null);
 const [editPropPanel, setEditPropPanel] = useState<{ propId: string } | null>(null);

 const visibleProps = properties.filter((p) => !p.isHidden);

 const allSelected = entries.length > 0 && selectedIds.size === entries.length;
 const someSelected = selectedIds.size > 0 && !allSelected;

 const handleAdd = useCallback(async () => { await onAddEntry(); }, [onAddEntry]);

 // Reset local order when the underlying entries list changes
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(() => { setLocalOrder([]); }, [entries.map((e) => e.id).join(",")]);

 const orderedEntries = localOrder.length > 0
  ? localOrder.map((id) => entries.find((e) => e.id === id)).filter(Boolean) as TemplateEntry[]
  : entries;

 const draggingEntry = draggingId ? entries.find((e) => e.id === draggingId) : null;

 const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
 );

 function handleDragStart(event: DragStartEvent) {
  setDraggingId(String(event.active.id));
 }

 function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setDraggingId(null);
  if (!over || active.id === over.id) return;
  const base = localOrder.length > 0 ? localOrder : entries.map((e) => e.id);
  const oldIdx = base.indexOf(String(active.id));
  const newIdx = base.indexOf(String(over.id));
  if (oldIdx === -1 || newIdx === -1) return;
  setLocalOrder(arrayMove(base, oldIdx, newIdx));
 }

 return (
  <>
  <div className="relative isolate">
   <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
   <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
    <colgroup>
     {/* Drag handle col */}
     <col style={{ width: "24px" }} />
     <col style={{ width: "32px" }} />
     <col style={{ minWidth: "260px", width: "35%" }} />
     {visibleProps.map((p) => (
      <col key={p.id} style={{ minWidth: "140px", width: "160px" }} />
     ))}
     <col style={{ width: "140px" }} />
    </colgroup>

    {/* Header */}
    <thead className="sticky top-0 z-[200] bg-background">
     <tr className="border-b border-border/60">
      {/* Drag handle column header (empty) */}
      <th className="w-6 px-0.5 py-2.5" />

      {/* Select-all */}
      <th className="w-8 px-2 py-2.5 text-left">
       <button
        onClick={onToggleSelectAll}
        className={`flex size-3.5 items-center justify-center rounded border text-xs font-bold transition-colors ${allSelected ? "border-primary bg-primary text-primary-foreground" : someSelected ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/60"}`}
       >
        {allSelected ? "✓" : someSelected ? "−" : ""}
       </button>
      </th>

      {/* Title column */}
      <th className="py-2.5 pl-1 pr-4 text-left">
       <span className="text-xs font-semibold tracking-wide text-muted-foreground">Name</span>
      </th>

      {/* Property columns */}
      {visibleProps.map((p) => (
       <th key={p.id} className="group/col px-3 py-2.5 text-left">
        <ColumnHeader
         prop={p}
         properties={properties}
         workspaceId={workspaceId}
         onRename={onRenameProperty}
         onDelete={onDeleteProperty}
         onUpdateProperty={onUpdateProperty}
         onDuplicateProperty={(prop) => onAddProperty(`${prop.name} (copy)`, prop.type, prop.config as Record<string, unknown>)}
         getEditPropertyAnchorRect={getEditPropertyAnchorRect}
         activeView={activeView}
         onUpdateView={onUpdateView}
        />
       </th>
      ))}

      {/* Add property */}
      <th className="px-2 py-2.5 text-left">
       <div className="relative">
        <button
         onClick={() => setShowAddProp((p) => !p)}
         className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
         <PlusIcon size={12} /> Add property
        </button>
        {showAddProp && (
         <AddPropertyPanel
          onAdd={(name, type) => {
           onAddProperty(name, type);
           setShowAddProp(false);
          }}
          onClose={() => setShowAddProp(false)}
         />
        )}
       </div>
      </th>
     </tr>
    </thead>

    {/* Body */}
    <SortableContext items={orderedEntries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
    <tbody>
     {orderedEntries.map((entry) => (
      <SortableRow
       key={entry.id}
       entry={entry}
       visibleProps={visibleProps}
       entryValueMap={entryValueMap}
       workspaceSlug={workspaceSlug}
       workspaceId={workspaceId}
       selectedIds={selectedIds}
       editingTitleId={editingTitleId}
       deleteTarget={deleteTarget}
       activeView={activeView}
       onToggleSelect={onToggleSelect}
       onSaveTitle={onSaveTitle}
       onClickEntry={onClickEntry}
       onUpdatePropValue={onUpdatePropValue}
       onSetDeleteTarget={setDeleteTarget}
       onDuplicateEntry={onDuplicateEntry}
       onEditProperty={(propId) => setEditPropPanel({ propId })}
       onUpdateProperty={onUpdateProperty}
      />
     ))}

     {/* Empty state */}
     {entries.length === 0 && (
      <tr>
       <td colSpan={visibleProps.length + 4} className="py-16 text-center">
        <div className="space-y-1">
         <p className="text-sm font-medium text-muted-foreground">No entries yet</p>
         <p className="text-xs text-muted-foreground">Click &quot;+ New&quot; below to add your first row</p>
        </div>
       </td>
      </tr>
     )}
    </tbody>
    </SortableContext>
   </table>

   {/* Drag overlay */}
   <DragOverlay>
    {draggingEntry && (
     <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
      <GripVertical size={13} className="text-muted-foreground/40" />
      {draggingEntry.title || "Untitled"}
     </div>
    )}
   </DragOverlay>
   </DndContext>
  </div>
  <ConfirmDialog
   open={!!deleteTarget}
   onOpenChange={(o) => !o && setDeleteTarget(null)}
   title="Delete entry?"
   description="This entry will be permanently deleted. This cannot be undone."
   confirmLabel="Delete"
   confirmLoadingLabel="Deleting…"
   loading={deletingEntry}
   onConfirm={async () => {
    if (!deleteTarget) return;
    setDeletingEntry(true);
    await onDeleteEntry(deleteTarget);
    setDeletingEntry(false);
    setDeleteTarget(null);
   }}
  />
  {editPropPanel && (() => {
   const panelProp = properties.find((p) => p.id === editPropPanel.propId);
   if (!panelProp) return null;
   return (
    <EditPropertySidePanel
     key={panelProp.id}
     property={panelProp as unknown as DbProperty}
     properties={properties as unknown as DbProperty[]}
     workspaceId={workspaceId}
     getAnchorRect={getEditPropertyAnchorRect}
     canDelete={!panelProp.isSystem}
     onUpdateProperty={async (patch) => onUpdateProperty(panelProp.id, patch)}
     onDeleteProperty={async () => onDeleteProperty(panelProp.id)}
     onDuplicateProperty={async () => onAddProperty(`${panelProp.name} (copy)`, panelProp.type, panelProp.config as Record<string, unknown>)}
     onClose={() => setEditPropPanel(null)}
     viewContext={activeView && onUpdateView ? {
      override: ((activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined) ?? {})[panelProp.id] ?? {},
      onUpdateOverride: (patch) => onUpdateView({
       propertyOverrides: {
        ...(activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined),
        [panelProp.id]: { ...(((activeView.propertyOverrides as Record<string, ViewPropertyOverride> | undefined) ?? {})[panelProp.id] ?? {}), ...patch },
       },
      }),
     } : undefined}
    />
   );
  })()}
  </>
 );
}
