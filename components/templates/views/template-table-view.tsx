"use client";

import {
 useEffect, useRef, useState, useCallback, type KeyboardEvent,
} from "react";
import {
 Plus as PlusIcon, MoreHorizontal as DotsThreeIcon, Trash2 as TrashIcon, Copy as CopyIcon,
 ExternalLink as ArrowSquareOutIcon, Type as TextTIcon, Hash as NumberCircleOneIcon,
 Calendar as CalendarBlankIcon, CheckSquare as CheckSquareIcon, Link as LinkIcon,
 List as ListBulletsIcon, Tag as TagIcon, ChevronDown as CaretDownIcon,
 Pencil as PencilSimpleIcon, User as UserIcon, GripVertical,
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
import type { DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

type PropOption   = { id: string; name: string; color: string };
type PropConfig   = { options?: PropOption[] };
type SelectVal   = { optionId?: string };
type MultiSelectVal = { optionIds?: string[] };
type CheckboxVal  = { checked?: boolean };
type DateVal    = { date?: string };
type NumberVal   = { number?: number };
type TextVal    = { text?: string };
type EmailVal    = { email?: string };
type UrlVal     = { url?: string };
type PersonVal   = { name?: string };

// ── Option colors (matches property-registry.ts exactly) ─────────────────────

const OPTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
 gray:   { bg: "#d4d4d8", text: "#3f3f46", dot: "#71717a" },
 red:    { bg: "#fecaca", text: "#b91c1c", dot: "#f87171" },
 orange:  { bg: "#fed7aa", text: "#c2410c", dot: "#fb923c" },
 yellow:  { bg: "#fef08a", text: "#a16207", dot: "#facc15" },
 green:   { bg: "#bbf7d0", text: "#15803d", dot: "#4ade80" },
 teal:   { bg: "#99f6e4", text: "#0f766e", dot: "#2dd4bf" },
 blue:   { bg: "#bae6fd", text: "#0369a1", dot: "#38bdf8" },
 purple:  { bg: "#ddd6fe", text: "#6d28d9", dot: "#a78bfa" },
 pink:   { bg: "#fbcfe8", text: "#be185d", dot: "#f472b6" },
};

function getOptColor(color: string) {
 return OPTION_COLORS[color] ?? OPTION_COLORS.gray;
}

// ── Editable scalar cell ──────────────────────────────────────────────────────

function EditableCell({
 value, type, placeholder, onSave,
}: {
 value:    string | number | null | undefined;
 type:    "text" | "number" | "email" | "url" | "date";
 placeholder: string;
 onSave:   (v: unknown) => void;
}) {
 const [editing, setEditing] = useState(false);
 const [draft,  setDraft]  = useState("");
 const inputRef       = useRef<HTMLInputElement>(null);

 function startEdit() {
  setDraft(value != null ? String(value) : "");
  setEditing(true);
 }

 useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

 function commit() {
  setEditing(false);
  const v = draft.trim();
  if (type === "number") {
   onSave(v === "" ? null : { number: Number(v) });
  } else if (type === "date") {
   onSave(v === "" ? null : { date: v });
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
    type={type === "date" ? "date" : type === "number" ? "number" : "text"}
    value={draft}
    onChange={(e) => setDraft(e.target.value)}
    onBlur={commit}
    onKeyDown={onKey}
    className="w-full bg-background border border-primary/60 rounded px-2 py-0.5 text-sm text-foreground outline-none"
   />
  );
 }

 const rawDisplay = value != null && value !== "" ? String(value) : null;
 const display = type === "date" && rawDisplay
  ? new Date(rawDisplay + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  : rawDisplay;

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
     className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground group-hover/url:block transition-colors"
     title="Edit URL"
    >
     <PencilSimpleIcon size={11} />
    </button>
   </div>
  );
 }

 return (
  <button
   onClick={startEdit}
   className="w-full rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60 transition-colors"
  >
   {display
    ? <span className="text-foreground">{display}</span>
    : <span className="text-muted-foreground/60 text-xs">{placeholder}</span>
   }
  </button>
 );
}

// ── Option badge (reusable) ────────────────────────────────────────────────────

function OptionBadge({ name, color }: { name: string; color: string }) {
 const c = getOptColor(color);
 return (
  <span
   className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] px-1.5 py-0.5 text-xs font-medium whitespace-nowrap"
   style={{ backgroundColor: c.bg, color: c.text }}
  >
   <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.dot }} />
   {name}
  </span>
 );
}

// ── Select cell ───────────────────────────────────────────────────────────────

function SelectCell({
 value, options, onSave,
}: {
 value:  SelectVal | null | undefined;
 options: PropOption[];
 onSave: (v: unknown) => void;
}) {
 const [open, setOpen] = useState(false);
 const ref       = useRef<HTMLDivElement>(null);
 const current     = options.find((o) => o.id === value?.optionId);

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
     ? <OptionBadge name={current.name} color={current.color} />
     : <span className="text-xs text-muted-foreground/60">Empty</span>
    }
    <CaretDownIcon size={10} className="ml-auto shrink-0 text-muted-foreground/70" />
   </button>

   {open && (
    <div className="absolute left-0 top-full z-[300] mt-0.5 min-w-[160px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
     {current && (
      <button
       onClick={() => { onSave(null); setOpen(false); }}
       className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
      >
       Clear
      </button>
     )}
     {options.map((opt) => (
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
   )}
  </div>
 );
}

// ── Multi-select cell ─────────────────────────────────────────────────────────

function MultiSelectCell({
 value, options, onSave,
}: {
 value:  MultiSelectVal | null | undefined;
 options: PropOption[];
 onSave: (v: unknown) => void;
}) {
 const [open, setOpen]    = useState(false);
 const ref          = useRef<HTMLDivElement>(null);
 const selectedIds      = value?.optionIds ?? [];
 const selectedOpts      = options.filter((o) => selectedIds.includes(o.id));

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
     ? selectedOpts.map((o) => <OptionBadge key={o.id} name={o.name} color={o.color} />)
     : <span className="text-xs text-muted-foreground/60">Empty</span>
    }
    <CaretDownIcon size={10} className="ml-auto shrink-0 text-muted-foreground/70" />
   </button>

   {open && (
    <div className="absolute left-0 top-full z-[300] mt-0.5 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
     {options.map((opt) => {
      const checked = selectedIds.includes(opt.id);
      return (
       <button
        key={opt.id}
        onClick={() => toggle(opt.id)}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent transition-colors"
       >
        <span className={`flex size-3.5 items-center justify-center rounded border text-xs font-bold transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
         {checked && "✓"}
        </span>
        <OptionBadge name={opt.name} color={opt.color} />
       </button>
      );
     })}
    </div>
   )}
  </div>
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

function PersonCell({ value, onSave }: { value: PersonVal | null | undefined; onSave: (v: unknown) => void }) {
 const [editing, setEditing] = useState(false);
 const [draft,  setDraft]  = useState(value?.name ?? "");
 const inputRef       = useRef<HTMLInputElement>(null);
 const name         = value?.name ?? "";

 useEffect(() => { if (editing) { setDraft(name); inputRef.current?.focus(); } }, [editing, name]);

 function commit() {
  setEditing(false);
  const n = draft.trim();
  onSave(n ? { name: n } : null);
 }

 if (editing) {
  return (
   <input
    ref={inputRef}
    value={draft}
    onChange={(e) => setDraft(e.target.value)}
    onBlur={commit}
    onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
    placeholder="Assignee name…"
    className="w-full rounded border border-primary/60 bg-background px-2 py-0.5 text-sm outline-none"
   />
  );
 }

 return (
  <button
   onClick={() => setEditing(true)}
   className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-muted/60 transition-colors"
  >
   {name ? (
    <>
     <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
      {name.charAt(0).toUpperCase()}
     </span>
     <span className="truncate text-sm text-foreground">{name}</span>
    </>
   ) : (
    <>
     <UserIcon size={12} className="shrink-0 text-muted-foreground/70" />
     <span className="text-xs text-muted-foreground/60">Empty</span>
    </>
   )}
  </button>
 );
}

// ── Column header ─────────────────────────────────────────────────────────────

const PROP_ICONS: Record<string, React.ElementType> = {
 text:     TextTIcon,
 number:    NumberCircleOneIcon,
 date:     CalendarBlankIcon,
 checkbox:   CheckSquareIcon,
 url:     LinkIcon,
 email:    LinkIcon,
 phone:    LinkIcon,
 select:    ListBulletsIcon,
 multi_select: TagIcon,
 person:    UserIcon,
};

function ColumnHeader({
 prop,
 onRename,
 onDelete,
}: {
 prop:   DatabaseProperty;
 onRename: (id: string, name: string) => void;
 onDelete: (id: string) => void;
}) {
 const [menuOpen, setMenuOpen] = useState(false);
 const [renaming, setRenaming] = useState(false);
 const [draftName, setDraftName] = useState(prop.name);
 const [confirmDelete, setConfirmDelete] = useState(false);
 const menuRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
  if (!menuOpen) return;
  function h(e: MouseEvent) {
   if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [menuOpen]);

 useEffect(() => {
  if (renaming) inputRef.current?.focus();
 }, [renaming]);

 const Icon = PROP_ICONS[prop.type] ?? TextTIcon;

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
     <Icon size={12} className="shrink-0 text-muted-foreground/60" />
     <span className="truncate text-xs font-semibold text-muted-foreground tracking-wide">
      {prop.name}
     </span>
    </div>

    <div ref={menuRef} className="relative shrink-0">
     <button
      onClick={() => setMenuOpen((p) => !p)}
      className="flex size-5 items-center justify-center rounded text-muted-foreground/70 opacity-0 group-hover/col:opacity-100 hover:bg-accent hover:text-foreground transition-all"
     >
      <DotsThreeIcon size={14} />
     </button>

     {menuOpen && (
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
          Rename
         </button>
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

// ── Row context menu ──────────────────────────────────────────────────────────

function RowMenu({
 entryId, shortId, workspaceSlug, onDuplicate, onDelete,
}: {
 entryId:    string;
 shortId:    string;
 workspaceSlug: string;
 onDuplicate:  (id: string) => void;
 onDelete:   (id: string) => void;
}) {
 const [open, setOpen] = useState(false);
 const ref       = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (!open) return;
  function h(e: MouseEvent) {
   if (!ref.current?.contains(e.target as Node)) setOpen(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [open]);

 return (
  <div ref={ref} className="relative">
   <button
    onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
    className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/row:opacity-100 hover:bg-accent hover:text-foreground transition-all"
    title="Row actions"
   >
    <DotsThreeIcon size={14} />
   </button>

   {open && (
    <div className="absolute right-0 top-full z-[500] mt-0.5 w-[180px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
     <Link
      href={`/app/${workspaceSlug}/${shortId}`}
      onClick={() => setOpen(false)}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
     >
      <ArrowSquareOutIcon size={13} /> Open page
     </Link>
     <button
      onClick={() => { onDuplicate(entryId); setOpen(false); }}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
     >
      <CopyIcon size={13} /> Duplicate
     </button>
     <div className="my-1 h-px bg-border/40" />
     <button
      onClick={() => { setOpen(false); onDelete(entryId); }}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
     >
      <TrashIcon size={13} /> Delete
     </button>
    </div>
   )}
  </div>
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
   onChange={(e) => setVal(e.target.value)}
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
 prop, raw, onSave,
}: {
 prop:  DatabaseProperty;
 raw:  unknown;
 onSave: (v: unknown) => void;
}) {
 const config = (prop.config ?? {}) as PropConfig;
 const options = config.options ?? [];

 switch (prop.type) {
  case "text": {
   const tv = raw as TextVal | null;
   return <EditableCell value={tv?.text} type="text" placeholder="Empty" onSave={onSave} />;
  }
  case "number": {
   const nv = raw as NumberVal | null;
   return <EditableCell value={nv?.number} type="number" placeholder="—" onSave={onSave} />;
  }
  case "date": {
   const dv = raw as DateVal | null;
   return <EditableCell value={dv?.date} type="date" placeholder="Pick date" onSave={onSave} />;
  }
  case "email": {
   const ev = raw as EmailVal | null;
   return <EditableCell value={ev?.email} type="email" placeholder="Empty" onSave={onSave} />;
  }
  case "url": {
   const uv = raw as UrlVal | null;
   return <EditableCell value={uv?.url} type="url" placeholder="Empty" onSave={onSave} />;
  }
  case "select":
   return <SelectCell value={raw as SelectVal | null} options={options} onSave={onSave} />;
  case "multi_select":
   return <MultiSelectCell value={raw as MultiSelectVal | null} options={options} onSave={onSave} />;
  case "checkbox":
   return (
    <div className="flex items-center px-1">
     <CheckboxCell value={raw as CheckboxVal | null} onSave={onSave} />
    </div>
   );
  case "person":
   return <PersonCell value={raw as PersonVal | null} onSave={onSave} />;
  case "phone": {
   const pv = raw as { phone?: string } | null;
   return <EditableCell value={pv?.phone} type="text" placeholder="Empty" onSave={(v) => onSave(v ? { phone: (v as { text: string }).text } : null)} />;
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
 selectedIds:   Set<string>;
 editingTitleId:  string | null;
 deleteTarget:   string | null;
 onToggleSelect:  (id: string) => void;
 onSaveTitle:   (entryId: string, title: string) => void;
 onClickEntry:   (entryId: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
 onSetDeleteTarget: (id: string) => void;
 onDuplicateEntry:  (id: string) => void;
}

function SortableRow({
 entry, visibleProps, entryValueMap, workspaceSlug, selectedIds, editingTitleId,
 deleteTarget, onToggleSelect, onSaveTitle, onClickEntry, onUpdatePropValue,
 onSetDeleteTarget, onDuplicateEntry,
}: SortableRowProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
  useSortable({ id: entry.id });

 const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
 };

 const isSelected = selectedIds.has(entry.id);
 const isEditing  = editingTitleId === entry.id;
 const valMap    = entryValueMap.get(entry.id) ?? new Map<string, unknown>();

 return (
  <tr
   ref={setNodeRef}
   style={style}
   {...attributes}
   suppressHydrationWarning
   className={`group/row border-b border-border/30 transition-colors ${isSelected ? "bg-primary/5" : !deleteTarget ? "hover:bg-muted/20" : ""}`}
  >
   {/* Drag handle */}
   <td className="w-6 px-0.5 py-0" style={{ touchAction: "none", userSelect: "none" }}>
    <div
     {...listeners}
     className="flex size-5 cursor-grab items-center justify-center rounded text-muted-foreground/0 hover:text-muted-foreground/40 transition-colors active:cursor-grabbing group-hover/row:text-muted-foreground/40"
     title="Drag to reorder"
    >
     <GripVertical size={13} />
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

     <div className="flex shrink-0 items-center gap-0.5">
      <a
       href={`/app/${workspaceSlug}/${entry.shortId}`}
       className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/row:opacity-100 hover:bg-accent hover:text-foreground transition-all"
       title="Open page"
      >
       <ArrowSquareOutIcon size={11} />
      </a>
      <RowMenu
       entryId={entry.id}
       shortId={entry.shortId}
       workspaceSlug={workspaceSlug}
       onDuplicate={onDuplicateEntry}
       onDelete={(id) => onSetDeleteTarget(id)}
      />
     </div>
    </div>
   </td>

   {/* Property cells */}
   {visibleProps.map((p) => (
    <td
     key={p.id}
     className="group/cell relative px-1 py-0.5 transition-colors hover:bg-accent/40"
    >
     <CellContent
      prop={p}
      raw={valMap.get(p.id)}
      onSave={(v) => onUpdatePropValue(entry.id, p.id, v)}
     />
    </td>
   ))}

   {/* Spacer */}
   <td />
  </tr>
 );
}

// ── Main table view ───────────────────────────────────────────────────────────

interface Props {
 entries:      TemplateEntry[];
 properties:    DatabaseProperty[];
 entryValueMap:   Map<string, Map<string, unknown>>;
 workspaceSlug:   string;
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
 onAddProperty:   (name: string, type: string) => void;
 onRenameProperty: (propId: string, name: string) => void;
 onDeleteProperty: (propId: string) => void;
}

export function TemplateTableView({
 entries,
 properties,
 entryValueMap,
 workspaceSlug,
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
 onDeleteProperty,
}: Props) {
 const [showAddProp, setShowAddProp] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
 const [deletingEntry, setDeletingEntry] = useState(false);
 const [localOrder, setLocalOrder] = useState<string[]>([]);
 const [draggingId, setDraggingId] = useState<string | null>(null);

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
    <thead className="sticky top-0 z-[200] bg-background/95 backdrop-blur-sm">
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
         onRename={onRenameProperty}
         onDelete={onDeleteProperty}
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
       selectedIds={selectedIds}
       editingTitleId={editingTitleId}
       deleteTarget={deleteTarget}
       onToggleSelect={onToggleSelect}
       onSaveTitle={onSaveTitle}
       onClickEntry={onClickEntry}
       onUpdatePropValue={onUpdatePropValue}
       onSetDeleteTarget={setDeleteTarget}
       onDuplicateEntry={onDuplicateEntry}
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
     <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 shadow-lg text-sm font-medium text-foreground">
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
  </>
 );
}
