"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
 Table2 as TableIcon, LayoutGrid as SquaresFourIcon, Calendar as CalendarIcon, Grid2X2 as GridFourIcon,
 Filter as FunnelIcon, ArrowUpDown as SortAscendingIcon, Eye as EyeIcon,
 Plus as PlusIcon, Image as ImageIcon, Smile as SmileyStickerIcon,
 X as XIcon, Trash2 as TrashIcon, Check as CheckIcon, Home as HouseIcon,
 ChevronRight as CaretRightIcon, ExternalLink as ArrowSquareOutIcon,
 User as UserIcon, Tag as TagIcon,
 Link as LinkIcon, Type as TextTIcon, Hash as NumberCircleOneIcon,
 CheckSquare as CheckSquareIcon, List as ListBulletsIcon,
 MoreVertical as MoreVerticalIcon, Pencil as PencilIcon, Copy as CopyIcon, Settings2 as GearIcon,
} from "lucide-react";

const CalendarBlankIcon = CalendarIcon;
import { useUpload } from "@/lib/storage/use-upload";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import { TemplateTableView }  from "./views/template-table-view";
import { TemplateBoardView }  from "./views/template-board-view";
import { TemplateCalendarView } from "./views/template-calendar-view";
import { TemplateGalleryView } from "./views/template-gallery-view";
import { ConfirmDialog }   from "@/components/ui/confirm-dialog";
import { ShareButton }     from "@/components/pages/share-button";
import { FavoriteButton }    from "@/components/pages/favorite-button";
import { PageActionsMenu }   from "@/components/pages/page-actions-menu";
import { PageCommentButton }  from "@/components/pages/page-comment-button";
import { IconPicker }       from "@/components/pages/icon-picker";
import { PageIcon }        from "@/components/pages/page-icon";
import { getOptionColor, groupOptions } from "@/components/database/property-registry";
import { resolveDisplayAs, resolveWrapContent } from "@/components/database/view-property-resolver";
import type { SelectOption, DbPropertyConfig, DbProperty } from "@/components/database/types";

export type TemplateEntry = { id: string; shortId: string; title: string; orderIndex: number; icon?: string | null; updatedAt?: string | null };
export type TemplateValue = { id: string; entryId: string; propertyId: string; value: unknown };
export type FilterRule  = { id: string; propertyId: string; operator: string; value: unknown };
export type SortRule   = { id: string; propertyId: string; direction: "asc" | "desc" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyFilter(rawVal: unknown, rule: FilterRule, propType: string): boolean {
 const v = rawVal as Record<string, unknown> | null;
 if (rule.operator === "is_empty")   return !v || Object.keys(v).length === 0;
 if (rule.operator === "is_not_empty") return !!v && Object.keys(v).length > 0;
 switch (propType) {
  case "text": case "email": case "url": case "phone": {
   const text = String((v as Record<string,string> | null)?.[propType] ?? "").toLowerCase();
   const fv  = String(rule.value ?? "").toLowerCase();
   if (rule.operator === "contains")   return text.includes(fv);
   if (rule.operator === "not_contains") return !text.includes(fv);
   if (rule.operator === "is")      return text === fv;
   if (rule.operator === "is_not")    return text !== fv;
   break;
  }
  case "number": {
   const n = (v as { number?: number } | null)?.number ?? null;
   const fv = Number(rule.value);
   if (n === null) return false;
   if (rule.operator === "=") return n === fv;
   if (rule.operator === "!=") return n !== fv;
   if (rule.operator === ">") return n > fv;
   if (rule.operator === "<") return n < fv;
   break;
  }
  case "select": {
   const optId = (v as { optionId?: string } | null)?.optionId ?? null;
   if (rule.operator === "is")   return optId === rule.value;
   if (rule.operator === "is_not") return optId !== rule.value;
   break;
  }
  case "checkbox": {
   const checked = (v as { checked?: boolean } | null)?.checked ?? false;
   if (rule.operator === "is_checked")   return checked === true;
   if (rule.operator === "is_not_checked") return checked === false;
   break;
  }
  case "date": {
   const date = (v as { date?: string } | null)?.date ?? null;
   if (!date) return false;
   if (rule.operator === "is")    return date === rule.value;
   if (rule.operator === "is_before") return date < String(rule.value);
   if (rule.operator === "is_after") return date > String(rule.value);
   break;
  }
 }
 return true;
}

function compareVals(a: unknown, b: unknown): number {
 if (a == null && b == null) return 0;
 if (a == null) return 1;
 if (b == null) return -1;
 return JSON.stringify(a).localeCompare(JSON.stringify(b));
}

function getOperators(type: string): { value: string; label: string }[] {
 const common = [
  { value: "is_empty",   label: "is empty"   },
  { value: "is_not_empty", label: "is not empty" },
 ];
 switch (type) {
  case "text": case "email": case "url": case "phone":
   return [
    { value: "contains",   label: "contains"     },
    { value: "not_contains", label: "does not contain" },
    { value: "is",      label: "is"        },
    { value: "is_not",    label: "is not"      },
    ...common,
   ];
  case "number":
   return [
    { value: "=", label: "=" },
    { value: "!=", label: "≠" },
    { value: ">", label: ">" },
    { value: "<", label: "<" },
    ...common,
   ];
  case "select":
   return [
    { value: "is",   label: "is"   },
    { value: "is_not", label: "is not" },
    ...common,
   ];
  case "checkbox":
   return [
    { value: "is_checked",   label: "is checked"   },
    { value: "is_not_checked", label: "is not checked" },
   ];
  case "date":
   return [
    { value: "is",    label: "is"    },
    { value: "is_before", label: "is before" },
    { value: "is_after", label: "is after" },
    ...common,
   ];
  default:
   return common;
 }
}

// ── Icon picker ────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = [
 "📝","📋","📌","📍","🗂️","📁","📊","📈","🗓️","📅","📔","📚","💼","🔑",
 "🏆","🎯","💡","🔧","⚙️","✅","❌","⚠️","🔵","🟢","🟡","🔴","🟣","⭐",
 "🔥","💎","🚀","🎉","🧩","🧠","💬","🌍","👤","👥","🤝","💰","📣","🔔",
 "🏗️","🌱","⚡","🎨","✍️","🖊️","📐","🔎","⏰","🔗","🧲","🏁","🗺️","📮",
];


// ── Cover picker ───────────────────────────────────────────────────────────────

const COVER_GRADIENTS = [
 "linear-gradient(135deg,#667eea,#764ba2)",
 "linear-gradient(135deg,#f093fb,#f5576c)",
 "linear-gradient(135deg,#4facfe,#00f2fe)",
 "linear-gradient(135deg,#43e97b,#38f9d7)",
 "linear-gradient(135deg,#fa709a,#fee140)",
 "linear-gradient(135deg,#a18cd1,#fbc2eb)",
 "linear-gradient(135deg,#ffecd2,#fcb69f)",
 "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
 "linear-gradient(135deg,#d4fc79,#96e6a1)",
 "linear-gradient(135deg,#f6d365,#fda085)",
 "linear-gradient(135deg,#89f7fe,#66a6ff)",
 "linear-gradient(135deg,#fddb92,#d1fdff)",
];

function CoverPicker({
 pageId,
 workspaceId,
 onSelect,
 onRemove,
 onClose,
}: {
 pageId:   string;
 workspaceId: string;
 onSelect:  (url: string) => void;
 onRemove:  () => void;
 onClose:   () => void;
}) {
 const [url, setUrl]  = useState("");
 const fileInputRef  = useRef<HTMLInputElement>(null);
 const { upload, uploading, error: uploadErr } = useUpload({
  kind: "page_cover",
  workspaceId,
  pageId,
 });

 async function handleFile(file: File) {
  const result = await upload(file);
  if (result) {
   onSelect(result.fileUrl);
   onClose();
  }
 }

 return (
  <>
   {/* Backdrop */}
   <div className="fixed inset-0 z-[590] bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

   {/* Modal */}
   <div className="fixed left-1/2 top-1/2 z-[600] w-[calc(100vw-32px)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-border bg-popover">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
     <span className="text-sm font-semibold text-foreground">Page Cover</span>
     <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
      <XIcon size={15} />
     </button>
    </div>

    <div className="p-5">
     {/* File upload */}
     <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Upload image</p>
     <button
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
      className="mb-1 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground disabled:opacity-50"
     >
      <ImageIcon size={16} />
      {uploading ? "Uploading…" : "Choose a file to upload"}
     </button>
     <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="hidden"
      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
     />
     {uploadErr && <p className="mb-2 text-xs text-destructive">{uploadErr}</p>}


     <div className="my-3 border-t border-border/40" />

     {/* Gradients */}
     <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Color & Gradient</p>
     <div className="mb-4 grid grid-cols-6 gap-1.5">
      {COVER_GRADIENTS.map((g) => (
       <button
        key={g}
        onClick={() => { onSelect(g); onClose(); }}
        style={{ background: g }}
        className="h-8 rounded-[var(--radius-sm)] border border-border/20 transition-all hover:scale-105 hover:ring-2 hover:ring-primary/50"
       />
      ))}
     </div>

     {/* URL */}
     <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">Image URL</p>
     <div className="flex gap-2">
      <input
       value={url}
       onChange={(e) => setUrl(e.target.value)}
       placeholder="https://…"
       className="flex-1 rounded-[var(--radius-sm)] border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
      />
      <button
       onClick={() => { if (url.trim()) { onSelect(url.trim()); onClose(); } }}
       className="rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
       Set
      </button>
     </div>

     <button
      onClick={() => { onRemove(); onClose(); }}
      className="mt-3 w-full rounded-[var(--radius-sm)] py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
     >
      Remove cover
     </button>
    </div>
   </div>
  </>
 );
}

// ── Filter panel ──────────────────────────────────────────────────────────────

const SYSTEM_TYPES = new Set(["title","created_by","created_time","last_edited_by","last_edited_time"]);

function FilterPanel({ properties, filters, onChange, onClear, onClose }: {
 properties: DatabaseProperty[];
 filters:  FilterRule[];
 onChange:  (f: FilterRule[]) => void;
 onClear:  () => void;
 onClose:  () => void;
}) {
 const props = properties.filter((p) => !SYSTEM_TYPES.has(p.type));

 function addRule() {
  const p = props[0];
  if (!p) return;
  const ops = getOperators(p.type);
  onChange([...filters, { id: crypto.randomUUID(), propertyId: p.id, operator: ops[0].value, value: "" }]);
 }

 function update(id: string, patch: Partial<FilterRule>) {
  onChange(filters.map((f) => f.id === id ? { ...f, ...patch } : f));
 }

 function remove(id: string) { onChange(filters.filter((f) => f.id !== id)); }

 return (
  <div className="absolute right-0 top-full z-[400] mt-1 w-[calc(100vw-24px)] max-w-[380px] rounded-[var(--radius-md)] border border-border bg-popover">
   <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
    <span className="text-sm font-semibold">Filter</span>
    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={14} /></button>
   </div>
   <div className="max-h-[320px] overflow-y-auto p-3 space-y-2">
    {filters.length === 0 && (
     <p className="py-4 text-center text-xs text-muted-foreground">No filters applied. Add one below.</p>
    )}
    {filters.map((f) => {
     const prop  = props.find((p) => p.id === f.propertyId);
     const ops   = getOperators(prop?.type ?? "text");
     const config = (prop?.config ?? {}) as { options?: { id: string; name: string }[] };
     const needsVal = !["is_empty","is_not_empty","is_checked","is_not_checked"].includes(f.operator);
     return (
      <div key={f.id} className="flex flex-wrap items-center gap-1.5">
       <select
        value={f.propertyId}
        onChange={(e) => {
         const np = props.find((p) => p.id === e.target.value);
         const ops2 = getOperators(np?.type ?? "text");
         update(f.id, { propertyId: e.target.value, operator: ops2[0].value, value: "" });
        }}
        className="rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
       >
        {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
       </select>
       <select
        value={f.operator}
        onChange={(e) => update(f.id, { operator: e.target.value, value: "" })}
        className="rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
       >
        {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
       </select>
       {needsVal && prop?.type === "select" && (
        <select
         value={String(f.value ?? "")}
         onChange={(e) => update(f.id, { value: e.target.value })}
         className="flex-1 rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
        >
         <option value="">Any</option>
         {config.options?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
       )}
       {needsVal && prop?.type !== "select" && prop?.type !== "checkbox" && (
        <input
         type={prop?.type === "number" ? "number" : prop?.type === "date" ? "date" : "text"}
         value={String(f.value ?? "")}
         onChange={(e) => update(f.id, { value: e.target.value })}
         placeholder="Value…"
         className="flex-1 rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
       )}
       <button onClick={() => remove(f.id)} className="text-muted-foreground hover:text-destructive transition-colors">
        <XIcon size={13} />
       </button>
      </div>
     );
    })}
   </div>
   <div className="flex items-center gap-2 border-t border-border/40 px-4 py-3">
    <button onClick={addRule} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
     <PlusIcon size={12} /> Add filter
    </button>
    {filters.length > 0 && (
     <button onClick={onClear} className="ml-auto flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
      <TrashIcon size={12} /> Clear all
     </button>
    )}
   </div>
  </div>
 );
}

// ── Sort panel ────────────────────────────────────────────────────────────────

function SortPanel({ properties, sorts, onChange, onClear, onClose }: {
 properties: DatabaseProperty[];
 sorts:   SortRule[];
 onChange:  (s: SortRule[]) => void;
 onClear:  () => void;
 onClose:  () => void;
}) {
 const props = properties.filter((p) => !SYSTEM_TYPES.has(p.type));

 function addSort() {
  const p = props[0];
  if (!p) return;
  onChange([...sorts, { id: crypto.randomUUID(), propertyId: p.id, direction: "asc" }]);
 }

 function update(id: string, patch: Partial<SortRule>) {
  onChange(sorts.map((s) => s.id === id ? { ...s, ...patch } : s));
 }

 function remove(id: string) { onChange(sorts.filter((s) => s.id !== id)); }

 return (
  <div className="absolute right-0 top-full z-[400] mt-1 w-[300px] rounded-[var(--radius-md)] border border-border bg-popover">
   <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
    <span className="text-sm font-semibold">Sort</span>
    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={14} /></button>
   </div>
   <div className="max-h-[280px] overflow-y-auto p-3 space-y-2">
    {sorts.length === 0 && (
     <p className="py-4 text-center text-xs text-muted-foreground">No sorts applied.</p>
    )}
    {sorts.map((s) => (
     <div key={s.id} className="flex items-center gap-2">
      <select
       value={s.propertyId}
       onChange={(e) => update(s.id, { propertyId: e.target.value })}
       className="flex-1 rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
      >
       {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select
       value={s.direction}
       onChange={(e) => update(s.id, { direction: e.target.value as "asc" | "desc" })}
       className="rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
      >
       <option value="asc">A → Z</option>
       <option value="desc">Z → A</option>
      </select>
      <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
       <XIcon size={13} />
      </button>
     </div>
    ))}
   </div>
   <div className="flex items-center gap-2 border-t border-border/40 px-4 py-3">
    <button onClick={addSort} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
     <PlusIcon size={12} /> Add sort
    </button>
    {sorts.length > 0 && (
     <button onClick={onClear} className="ml-auto flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
      <TrashIcon size={12} /> Clear all
     </button>
    )}
   </div>
  </div>
 );
}

// ── Properties panel ──────────────────────────────────────────────────────────

function PropertiesPanel({ properties, onToggle, onClose }: {
 properties: DatabaseProperty[];
 onToggle:  (id: string, hidden: boolean) => void;
 onClose:  () => void;
}) {
 const visible = properties.filter((p) => !SYSTEM_TYPES.has(p.type));
 return (
  <div className="absolute right-0 top-full z-[400] mt-1 w-[240px] rounded-[var(--radius-md)] border border-border bg-popover">
   <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
    <span className="text-sm font-semibold">Properties</span>
    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={14} /></button>
   </div>
   <div className="max-h-[320px] overflow-y-auto p-2">
    {visible.map((p) => (
     <button
      key={p.id}
      onClick={() => onToggle(p.id, !p.isHidden)}
      className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 hover:bg-accent transition-colors"
     >
      <span className={`flex size-4 items-center justify-center rounded border text-xs ${!p.isHidden ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
       {!p.isHidden ? <CheckIcon size={10} /> : ""}
      </span>
      <span className="text-sm text-foreground">{p.name}</span>
     </button>
    ))}
   </div>
  </div>
 );
}

// ── Entry detail panel ────────────────────────────────────────────────────────

// Option/config shapes are the shared, canonical ones (components/database/types.ts)
// so colors, groups, and display settings render consistently across every view.
type PPropOption = SelectOption;
type PPropConfig = DbPropertyConfig;

function PPill({ name, color, displayAs, wrap }: { name: string; color: string; displayAs?: "select" | "checkbox"; wrap?: boolean }) {
 const wrapCls = wrap ? "whitespace-normal break-words" : "truncate";
 if (displayAs === "checkbox") {
  return (
   <span className="flex size-4 items-center justify-center rounded border border-primary bg-primary">
    <CheckIcon size={10} className="text-primary-foreground" />
   </span>
  );
 }
 const c = getOptionColor(color);
 return (
  <span
   className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium"
   style={{ backgroundColor: c.bg, color: c.text }}
  >
   <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.dot }} />
   <span className={wrapCls}>{name}</span>
  </span>
 );
}

const PROP_TYPE_ICON: Record<string, React.ElementType> = {
 text:     TextTIcon,
 number:    NumberCircleOneIcon,
 date:     CalendarBlankIcon,
 email:    LinkIcon,
 url:     LinkIcon,
 phone:    LinkIcon,
 select:    TagIcon,
 multi_select: ListBulletsIcon,
 checkbox:   CheckSquareIcon,
 person:    UserIcon,
};

function PanelPropRow({
 prop, value, onSave, onEditProperty,
}: {
 prop:  DatabaseProperty;
 value: unknown;
 onSave: (v: unknown) => void;
 onEditProperty?: (propId: string) => void;
}) {
 const Icon  = PROP_TYPE_ICON[prop.type] ?? TextTIcon;
 const config = (prop.config ?? {}) as PPropConfig;
 const isSelectType = prop.type === "select" || prop.type === "multi_select";

 return (
  <div className="group/proprow flex min-h-[32px] items-start gap-0 rounded-[var(--radius-sm)] transition-colors hover:bg-muted/30">
   <div className="flex w-[160px] shrink-0 items-center gap-2 px-2 py-2">
    {config.icon
     ? <PageIcon icon={config.icon} size={13} className="shrink-0" />
     : <Icon size={13} className="text-muted-foreground/60" />
    }
    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{prop.name}</span>
    {isSelectType && onEditProperty && (
     <button
      type="button"
      title="Edit property"
      onClick={() => onEditProperty(prop.id)}
      className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity duration-150 hover:bg-accent hover:text-foreground group-hover/proprow:opacity-100"
     >
      <GearIcon size={11} />
     </button>
    )}
   </div>
   <div className="flex-1 px-2 py-[5px]">
    <PanelPropValue type={prop.type} config={config} value={value} onSave={onSave} />
   </div>
  </div>
 );
}

function PanelPropValue({
 type, config, value, onSave,
}: {
 type:  string;
 config: PPropConfig;
 value: unknown;
 onSave: (v: unknown) => void;
}) {
 const [editing, setEditing] = useState(false);
 const [draft,  setDraft]  = useState("");
 const [open,  setOpen]  = useState(false);
 // No view context on this standalone entry-detail panel (a page can be opened
 // outside any particular view) — resolves straight to the property's own
 // global config, same as reading config.displayAs/wrapContent directly.
 const resolvedDisplayAs  = resolveDisplayAs({ config } as unknown as DbProperty, undefined);
 const resolvedWrapContent = resolveWrapContent({ config } as unknown as DbProperty, undefined);

 // ── Checkbox ─────────────────────────────────────────────────────────────
 if (type === "checkbox") {
  const checked = (value as { checked?: boolean } | null)?.checked ?? false;
  return (
   <button
    onClick={() => onSave({ checked: !checked })}
    className={`flex size-4 items-center justify-center rounded border transition-colors ${checked ? "border-primary bg-primary" : "border-border bg-background"}`}
   >
    {checked && <CheckIcon size={10} className="text-primary-foreground" />}
   </button>
  );
 }

 // ── Select ────────────────────────────────────────────────────────────────
 if (type === "select") {
  const options   = config.options ?? [];
  const selectedOpt = options.find((o) => o.id === (value as { optionId?: string } | null)?.optionId);
  const sections   = groupOptions(options, !!config.groupedByStatus);
  return (
   <div className="relative">
    <button
     onClick={() => setOpen((p) => !p)}
     className="flex min-h-[22px] w-full items-center text-left"
    >
     {selectedOpt
      ? <PPill name={selectedOpt.name} color={selectedOpt.color} displayAs={resolvedDisplayAs} wrap={resolvedWrapContent} />
      : resolvedDisplayAs === "checkbox"
      ? <span className="flex size-4 items-center justify-center rounded border border-border bg-background" />
      : <span className="text-xs text-muted-foreground/70">Empty</span>
     }
    </button>
    {open && (
     <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
      {sections.map((section) => (
       <div key={section.key}>
        {section.label && (
         <p className="mb-0.5 mt-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">{section.label}</p>
        )}
        {section.options.map((opt) => (
         <button key={opt.id} onClick={() => { onSave({ optionId: opt.id }); setOpen(false); }}
          className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent transition-colors">
          <PPill name={opt.name} color={opt.color} />
         </button>
        ))}
       </div>
      ))}
      {selectedOpt && (
       <button onClick={() => { onSave(null); setOpen(false); }}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
        Clear
       </button>
      )}
     </div>
    )}
   </div>
  );
 }

 // ── Multi-select ──────────────────────────────────────────────────────────
 if (type === "multi_select") {
  const options  = config.options ?? [];
  const selectedIds = (value as { optionIds?: string[] } | null)?.optionIds ?? [];
  return (
   <div className="relative">
    <button onClick={() => setOpen((p) => !p)} className="flex min-h-[22px] w-full flex-wrap items-center gap-1 text-left">
     {selectedIds.length === 0
      ? <span className="text-xs text-muted-foreground/70">Empty</span>
      : selectedIds.map((id) => {
        const opt = options.find((o) => o.id === id);
        return opt ? (
         <PPill key={id} name={opt.name} color={opt.color} displayAs={resolvedDisplayAs} wrap={resolvedWrapContent} />
        ) : null;
       })
     }
    </button>
    {open && (
     <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-[var(--radius-md)] border border-border bg-popover p-1">
      {options.map((opt) => {
       const isOn = selectedIds.includes(opt.id);
       return (
        <button key={opt.id}
         onClick={() => {
          const next = isOn ? selectedIds.filter((i) => i !== opt.id) : [...selectedIds, opt.id];
          onSave(next.length ? { optionIds: next } : null);
         }}
         className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent transition-colors"
        >
         <span className={`flex size-3.5 items-center justify-center rounded border ${isOn ? "border-primary bg-primary" : "border-border"}`}>
          {isOn && <CheckIcon size={9} className="text-primary-foreground" />}
         </span>
         <PPill name={opt.name} color={opt.color} />
        </button>
       );
      })}
     </div>
    )}
   </div>
  );
 }

 // ── Person ────────────────────────────────────────────────────────────────
 if (type === "person") {
  const name = (value as { name?: string } | null)?.name ?? "";
  if (editing) {
   return (
    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
     onBlur={() => { setEditing(false); onSave(draft.trim() ? { name: draft.trim() } : null); }}
     onKeyDown={(e) => {
      if (e.key === "Enter") { setEditing(false); onSave(draft.trim() ? { name: draft.trim() } : null); }
      if (e.key === "Escape") setEditing(false);
     }}
     className="w-full rounded border border-primary/50 bg-background px-2 py-0.5 text-xs outline-none focus:border-primary"
    />
   );
  }
  return (
   <button onClick={() => { setDraft(name); setEditing(true); }}
    className="flex min-h-[22px] w-full items-center gap-1.5 text-left text-xs hover:text-foreground transition-colors">
    {name
     ? <><span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{name[0]?.toUpperCase()}</span><span className="text-foreground">{name}</span></>
     : <span className="text-muted-foreground/70">Empty</span>
    }
   </button>
  );
 }

 // ── Date ──────────────────────────────────────────────────────────────────
 if (type === "date") {
  const dateStr = (value as { date?: string } | null)?.date ?? "";
  if (editing) {
   return (
    <input autoFocus type="date" value={draft} onChange={(e) => setDraft(e.target.value)}
     onBlur={() => { setEditing(false); onSave(draft ? { date: draft } : null); }}
     onKeyDown={(e) => {
      if (e.key === "Escape") setEditing(false);
     }}
     className="w-full rounded border border-primary/50 bg-background px-2 py-0.5 text-xs outline-none focus:border-primary"
    />
   );
  }
  return (
   <button onClick={() => { setDraft(dateStr); setEditing(true); }}
    className="min-h-[22px] w-full text-left text-xs hover:text-foreground transition-colors">
    {dateStr
     ? <span className="text-foreground">{new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
     : <span className="text-muted-foreground/70">Empty</span>
    }
   </button>
  );
 }

 // ── Number ────────────────────────────────────────────────────────────────
 if (type === "number") {
  const num = (value as { number?: number } | null)?.number;
  if (editing) {
   return (
    <input autoFocus type="number" value={draft} onChange={(e) => setDraft(e.target.value)}
     onBlur={() => { setEditing(false); const n = Number(draft); onSave(isNaN(n) || draft === "" ? null : { number: n }); }}
     onKeyDown={(e) => {
      if (e.key === "Enter") { setEditing(false); const n = Number(draft); onSave(isNaN(n) || draft === "" ? null : { number: n }); }
      if (e.key === "Escape") setEditing(false);
     }}
     className="w-full rounded border border-primary/50 bg-background px-2 py-0.5 text-xs outline-none focus:border-primary"
    />
   );
  }
  return (
   <button onClick={() => { setDraft(num != null ? String(num) : ""); setEditing(true); }}
    className="min-h-[22px] w-full text-left text-xs hover:text-foreground transition-colors">
    {num != null ? <span className="text-foreground">{num}</span> : <span className="text-muted-foreground/70">Empty</span>}
   </button>
  );
 }

 // ── Text / email / url / phone (default) ─────────────────────────────────
 const fieldKey = type === "email" ? "email" : type === "url" ? "url" : type === "phone" ? "phone" : "text";
 const textVal = (value as Record<string, string> | null)?.[fieldKey] ?? "";

 if (editing) {
  return (
   <input autoFocus
    type={type === "email" ? "email" : type === "url" ? "url" : "text"}
    value={draft} onChange={(e) => setDraft(e.target.value)}
    onBlur={() => { setEditing(false); onSave(draft.trim() ? { [fieldKey]: draft.trim() } : null); }}
    onKeyDown={(e) => {
     if (e.key === "Enter") { setEditing(false); onSave(draft.trim() ? { [fieldKey]: draft.trim() } : null); }
     if (e.key === "Escape") setEditing(false);
    }}
    className="w-full rounded border border-primary/50 bg-background px-2 py-0.5 text-xs outline-none focus:border-primary"
   />
  );
 }

 if (type === "url" && textVal) {
  const href = textVal.startsWith("http") ? textVal : `https://${textVal}`;
  return (
   <div className="flex items-center gap-1">
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
     className="min-h-[22px] flex-1 truncate text-xs text-primary underline-offset-2 hover:underline">
     {textVal}
    </a>
    <button onClick={() => { setDraft(textVal); setEditing(true); }}
     className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
     <TextTIcon size={11} />
    </button>
   </div>
  );
 }

 return (
  <button onClick={() => { setDraft(textVal); setEditing(true); }}
   className="min-h-[22px] w-full text-left text-xs hover:text-foreground transition-colors">
   {textVal ? <span className="text-foreground">{textVal}</span> : <span className="text-muted-foreground/70">Empty</span>}
  </button>
 );
}

function EntryDetailPanel({
 entry,
 properties,
 entryValueMap,
 workspaceSlug,
 onClose,
 onDelete,
 onSaveTitle,
 onUpdatePropValue,
}: {
 entry:       TemplateEntry;
 properties:    DatabaseProperty[];
 entryValueMap:   Map<string, Map<string, unknown>>;
 workspaceSlug:   string;
 onClose:      () => void;
 onDelete:     (id: string) => void;
 onSaveTitle:    (id: string, title: string) => void;
 onUpdatePropValue: (entryId: string, propId: string, value: unknown) => void;
}) {
 const [title, setTitle] = useState(entry.title || "");
 const [confirmDelete, setConfirmDelete] = useState(false);
 const valMap      = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
 const visibleProps   = properties.filter((p) => !p.isHidden);

 function commitTitle() {
  const t = title.trim() || "Untitled";
  if (t !== entry.title) onSaveTitle(entry.id, t);
 }

 return (
  <>
   {/* Backdrop */}
   <div className="fixed inset-0 z-[580] bg-black/50 backdrop-blur-[3px]" onClick={onClose} />

   {/* Centered modal */}
   <div className="fixed left-1/2 top-1/2 z-[590] flex w-[680px] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-lg)] border border-border bg-background overflow-hidden">

    {/* Header */}
    <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3.5">
     <button
      onClick={onClose}
      className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
     >
      <XIcon size={15} />
     </button>
     <div className="flex items-center gap-1.5">
      <Link
       href={`/app/${workspaceSlug}/${entry.shortId}`}
       className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
       <ArrowSquareOutIcon size={13} />
       Open page
      </Link>
      <button
       onClick={() => setConfirmDelete(true)}
       className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
       title="Delete entry"
      >
       <TrashIcon size={14} />
      </button>
     </div>
    </div>

    {/* Body */}
    <div className="flex-1 overflow-y-auto px-8 py-7">
     {/* Editable title */}
     <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commitTitle}
      onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); }}
      placeholder="Untitled"
      className="mb-1 w-full bg-transparent text-3xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/25"
     />
     {/* "View details" link like Notion */}
     <Link
      href={`/app/${workspaceSlug}/${entry.shortId}`}
      className="mb-6 inline-block text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
     >
      View details
     </Link>

     {/* Properties */}
     {visibleProps.length > 0 && (
      <div className="mb-2">
       <div className="space-y-0.5">
        {visibleProps.map((prop) => (
         <PanelPropRow
          key={prop.id}
          prop={prop}
          value={valMap.get(prop.id) ?? null}
          onSave={(v) => onUpdatePropValue(entry.id, prop.id, v)}
         />
        ))}
       </div>
      </div>
     )}

     {/* Divider + open full page */}
     <div className="mt-6 border-t border-border/30 pt-5 text-center">
      <p className="mb-3 text-xs text-muted-foreground/60">Open the full page to add content, comments, and more</p>
      <Link
       href={`/app/${workspaceSlug}/${entry.shortId}`}
       className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
       <ArrowSquareOutIcon size={12} />
       Open full page
      </Link>
     </div>
    </div>
   </div>
   <ConfirmDialog
    open={confirmDelete}
    onOpenChange={setConfirmDelete}
    title="Delete entry?"
    description="This entry will be permanently deleted. This cannot be undone."
    confirmLabel="Delete"
    onConfirm={() => { onDelete(entry.id); setConfirmDelete(false); onClose(); }}
   />
  </>
 );
}

// ── Main client ───────────────────────────────────────────────────────────────

const VIEW_ICON: Record<string, React.ElementType> = {
 table:  TableIcon,
 board:  SquaresFourIcon,
 calendar: CalendarIcon,
 gallery: GridFourIcon,
};

interface Props {
 page: {
  id: string; shortId: string; title: string;
  icon: string | null; coverUrl: string | null; kind: string;
 };
 properties:  DatabaseProperty[];
 views:     DatabaseView[];
 entries:    TemplateEntry[];
 values:    TemplateValue[];
 workspaceSlug: string;
 workspaceName: string;
 workspaceId:  string;
 breadcrumbs:  { shortId: string; title: string }[];
 defaultViewId: string | null;
 currentUserId: string;
 isPrivate:   boolean;
 isFavorited:  boolean;
 isEditor:   boolean;
 isAdmin:    boolean;
 isLocked:   boolean;
 isDeleted:   boolean;
}

export function TemplatePageClient({
 page,
 properties:  initProps,
 views:    initViews,
 entries:   initEntries,
 values:    initValues,
 workspaceSlug,
 workspaceName,
 workspaceId,
 breadcrumbs,
 defaultViewId,
 currentUserId,
 isPrivate,
 isFavorited,
 isEditor,
 isAdmin,
 isLocked,
 isDeleted,
}: Props) {
 const [properties, setProperties] = useState<DatabaseProperty[]>(initProps);
 const [views, setViews]      = useState<DatabaseView[]>(initViews);
 const [entries,  setEntries]  = useState<TemplateEntry[]>(initEntries);
 const [values,   setValues]   = useState<TemplateValue[]>(initValues);

 const router = useRouter();
 const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
 const [editingTitleId, setEditingTitleId] = useState<string | null>(null);

 // The toolbar's "New" button — every "Edit property" popup anchors here, not to
 // whichever column/cell triggered it, so its position is always the same and predictable.
 const newButtonRef = useRef<HTMLButtonElement>(null);
 const getEditPropertyAnchorRect = useCallback((): DOMRect => {
  return newButtonRef.current?.getBoundingClientRect() ?? new DOMRect(8, 8, 0, 0);
 }, []);

 const handleClickEntry = useCallback((entryId: string) => {
  const entry = entries.find(e => e.id === entryId);
  if (entry) router.push(`/app/${workspaceSlug}/${entry.shortId}`);
 }, [entries, router, workspaceSlug]);

 const [pageTitle,  setPageTitle]  = useState(page.title);
 const [pageIcon,   setPageIcon]   = useState<string | null>(page.icon);
 const [pageCoverUrl, setPageCoverUrl] = useState<string | null>(page.coverUrl);

 const descKey = `page-desc:${page.id}`;
 const [pageDescription,  setPageDescription]  = useState<string>("");
 const [editingDescription, setEditingDescription] = useState(false);
 const descRef = useRef<HTMLTextAreaElement>(null);

 useEffect(() => {
  const saved = localStorage.getItem(descKey);
  if (saved !== null) setPageDescription(saved);
 }, [descKey]);

 useEffect(() => {
  if (editingDescription && descRef.current) {
   const el = descRef.current;
   el.style.height = "auto";
   el.style.height = el.scrollHeight + "px";
  }
 }, [editingDescription]);

 function saveDescription(val: string) {
  setPageDescription(val);
  localStorage.setItem(descKey, val);
  setEditingDescription(false);
 }

 const [editingPageTitle, setEditingPageTitle] = useState(false);
 const [showIconPicker,  setShowIconPicker]  = useState(false);
 const [showCoverPicker, setShowCoverPicker] = useState(false);

 const [showFilter,   setShowFilter]   = useState(false);
 const [showSort,    setShowSort]    = useState(false);
 const [showProperties, setShowProperties] = useState(false);
 const [showAddView,  setShowAddView]  = useState(false);
 const [filterRules,  setFilterRules]  = useState<FilterRule[]>([]);
 const [sortRules,   setSortRules]   = useState<SortRule[]>([]);

 // Only one toolbar popup (Filter / Sort / Properties / Add view / view "⋮" menu)
 // should ever be open at once — call before opening any of them.
 function closeAllToolbarPopups() {
  setShowFilter(false);
  setShowSort(false);
  setShowProperties(false);
  setShowAddView(false);
  setViewMenuTarget(null);
  setViewMenuRect(null);
 }

 const initView  = initViews.find((v) => v.id === defaultViewId) ?? initViews[0];
 const [activeViewId, setActiveViewId] = useState(initView?.id ?? "");
 const [viewSwitching, setViewSwitching] = useState(false);
 const activeView = views.find((v) => v.id === activeViewId) ?? views[0];

 // Lifted calendar navigation state so the "+New" button can target the viewed month
 const [calYear, setCalYear] = useState(() => new Date().getFullYear());
 const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

 const pageTitleRef  = useRef<HTMLInputElement>(null);
 const addViewRef   = useRef<HTMLDivElement>(null);
 const viewMenuRef  = useRef<HTMLDivElement>(null);
 const tableViewRef = useRef<HTMLDivElement>(null);
 const scrollAreaRef = useRef<HTMLDivElement>(null);
 const viewToolbarRef = useRef<HTMLDivElement>(null);
 // Notion-style calendar shell: fills exactly the space below the sticky view-tabs
 // toolbar down to the bottom of the viewport, so week rows can divide it evenly
 // (calc(100dvh-Nrem) can't do this accurately since the cover/title/description
 // above the toolbar are variable height). Re-measured on any size change of either
 // the scroll container or the toolbar (e.g. its row wraps on a narrow window).
 const [calendarHeight, setCalendarHeight] = useState<number | null>(null);

 useLayoutEffect(() => {
  if (activeView?.type !== "calendar") return;
  const scrollEl = scrollAreaRef.current;
  const toolbarEl = viewToolbarRef.current;
  if (!scrollEl || !toolbarEl) return;
  function measure() {
   setCalendarHeight(scrollEl!.clientHeight - toolbarEl!.offsetHeight);
  }
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(scrollEl);
  ro.observe(toolbarEl);
  return () => ro.disconnect();
 }, [activeView?.type]);

 const [hoveredViewId,  setHoveredViewId]  = useState<string | null>(null);
 const [viewMenuTarget, setViewMenuTarget]  = useState<DatabaseView | null>(null);
 const [viewMenuRect,  setViewMenuRect]  = useState<DOMRect | null>(null);
 const [deleteViewTarget, setDeleteViewTarget] = useState<DatabaseView | null>(null);
 const [deletingView,  setDeletingView]  = useState(false);
 const [renamingViewId, setRenamingViewId]  = useState<string | null>(null);
 const [renamingViewName, setRenamingViewName] = useState("");

 useEffect(() => {
  if (!showAddView) return;
  function h(e: MouseEvent) {
   if (addViewRef.current && !addViewRef.current.contains(e.target as Node)) setShowAddView(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [showAddView]);

 // Lock the page's own scroll container while the view menu is open — its
 // position is a one-time snapshot (position:fixed, not re-measured), so
 // letting the page scroll underneath would leave it floating over the wrong
 // spot. Simpler and more robust than continuously repositioning it.
 useEffect(() => {
  if (!viewMenuTarget) return;
  const el = scrollAreaRef.current;
  if (!el) return;
  const prevOverflowY = el.style.overflowY;
  el.style.overflowY = "hidden";
  return () => { el.style.overflowY = prevOverflowY; };
 }, [viewMenuTarget]);

 useEffect(() => {
  if (!viewMenuTarget) return;
  function h(e: MouseEvent) {
   if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
    setViewMenuTarget(null); setViewMenuRect(null);
   }
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [viewMenuTarget]);



 // ── Auto-wire calendar property ───────────────────────────────────────────
 // When switching to a calendar view that has no calendarPropertyId, find or
 // create a Date property and patch the view so entries appear on the grid.
 useEffect(() => {
  if (activeView?.type !== "calendar") return;
  if (activeView.calendarPropertyId) return; // already wired

  let cancelled = false;
  async function wire() {
   let dateProp = properties.find((p) => p.type === "date");
   if (!dateProp) {
    const pRes = await fetch(`/api/databases/${page.id}/properties`, {
     method: "POST", headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name: "Date", type: "date", config: {} }),
    });
    if (!pRes.ok || cancelled) return;
    dateProp = await pRes.json() as DatabaseProperty;
    if (cancelled) return;
    setProperties((prev) => [...prev, dateProp!]);
   }
   // Patch the view so calendarPropertyId is persisted
   const vRes = await fetch(`/api/databases/${page.id}/views/${activeView!.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarPropertyId: dateProp!.id }),
   });
   if (!vRes.ok || cancelled) return;
   const updated = await vRes.json() as DatabaseView;
   if (cancelled) return;
   setViews((prev) => prev.map((v) => v.id === updated.id ? updated : v));
  }
  wire();
  return () => { cancelled = true; };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activeView?.id, activeView?.type]);

 // ── Auto-wire board group property ────────────────────────────────────────
 // When switching to a board view with no groupByPropertyId, find or create a
 // "Status" select property (with sensible defaults) and persist it on the view.
 useEffect(() => {
  if (activeView?.type !== "board") return;
  if (activeView.groupByPropertyId) return;

  let cancelled = false;
  async function wire() {
   let selectProp = properties.find((p) => p.type === "select");
   if (!selectProp) {
    const pRes = await fetch(`/api/databases/${page.id}/properties`, {
     method: "POST", headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
      name: "Status",
      type: "select",
      config: {
       options: [
        { id: crypto.randomUUID(), name: "To Do",    color: "gray"  },
        { id: crypto.randomUUID(), name: "In Progress", color: "blue"  },
        { id: crypto.randomUUID(), name: "Done",     color: "green" },
       ],
      },
     }),
    });
    if (!pRes.ok || cancelled) return;
    selectProp = await pRes.json() as DatabaseProperty;
    if (cancelled) return;
    setProperties((prev) => [...prev, selectProp!]);
   }
   const vRes = await fetch(`/api/databases/${page.id}/views/${activeView!.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupByPropertyId: selectProp!.id }),
   });
   if (!vRes.ok || cancelled) return;
   const updated = await vRes.json() as DatabaseView;
   if (cancelled) return;
   setViews((prev) => prev.map((v) => v.id === updated.id ? updated : v));
  }
  wire();
  return () => { cancelled = true; };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activeView?.id, activeView?.type]);

 // ── Table view: pin the horizontal scrollbar to the viewport bottom ──────
 useEffect(() => {
  const el = tableViewRef.current;
  if (!el) return;
  if (activeView?.type !== "table") {
   el.style.minHeight = "";
   return;
  }
  const measure = () => {
   const rect = el.getBoundingClientRect();
   el.style.minHeight = `${Math.max(120, window.innerHeight - rect.top)}px`;
  };
  measure();
  window.addEventListener("resize", measure);
  return () => window.removeEventListener("resize", measure);
 }, [activeView?.type, pageCoverUrl]);

 // ── Value map ──────────────────────────────────────────────────────────────

 const entryValueMap = useMemo(() => {
  const map = new Map<string, Map<string, unknown>>();
  for (const e of entries) map.set(e.id, new Map());
  for (const v of values) map.get(v.entryId)?.set(v.propertyId, v.value);
  return map;
 }, [entries, values]);

 // ── Filtered + sorted entries ──────────────────────────────────────────────

 const displayedEntries = useMemo(() => {
  let result = [...entries];
  if (filterRules.length > 0) {
   result = result.filter((entry) => {
    const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
    return filterRules.every((rule) => {
     const prop = properties.find((p) => p.id === rule.propertyId);
     return applyFilter(valMap.get(rule.propertyId), rule, prop?.type ?? "text");
    });
   });
  }
  if (sortRules.length > 0) {
   result.sort((a, b) => {
    for (const rule of sortRules) {
     const cmp = compareVals(
      entryValueMap.get(a.id)?.get(rule.propertyId),
      entryValueMap.get(b.id)?.get(rule.propertyId),
     );
     if (cmp !== 0) return rule.direction === "asc" ? cmp : -cmp;
    }
    return 0;
   });
  }
  return result;
 }, [entries, filterRules, sortRules, entryValueMap, properties]);

 // ── View switching ─────────────────────────────────────────────────────────

 async function switchView(viewId: string) {
  setActiveViewId(viewId);
  setSelectedIds(new Set());
  setFilterRules([]);
  setSortRules([]);
  setViewSwitching(true);
  try {
   const res = await fetch(`/api/databases/${page.id}/entries?viewId=${viewId}`);
   if (res.ok) {
    const data = await res.json() as {
     entries:    { id: string; shortId: string; title: string; orderIndex: number; icon: string | null; updatedAt: string | null }[];
     propertyValues: TemplateValue[];
    };
    setEntries(data.entries.map((e) => ({
     id: e.id, shortId: e.shortId, title: e.title, orderIndex: e.orderIndex, icon: e.icon, updatedAt: e.updatedAt,
    })));
    setValues(data.propertyValues);
   }
  } catch { /* keep current data */ }
  finally { setViewSwitching(false); }
 }

 // ── Entry actions ──────────────────────────────────────────────────────────

 const addEntry = useCallback(async (defaultValues?: Record<string, unknown>, title?: string) => {
  const t = title?.trim() ?? "";
  const res = await fetch(`/api/databases/${page.id}/entries`, {
   method: "POST", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ title: t, defaultValues }),
  });
  if (!res.ok) return;
  const e = await res.json() as { id: string; shortId: string; title: string; orderIndex: number; propertyValues: { entryId: string; propertyId: string; value: unknown }[] };
  setEntries((prev) => [...prev, { id: e.id, shortId: e.shortId, title: t, orderIndex: e.orderIndex }]);
  // Mirrors EVERY value the server actually wrote — not just what this caller
  // passed in — so a server-computed default (e.g. a grouped Status property
  // falling back to "Not started") shows up immediately, not only after the
  // next full refetch.
  if (e.propertyValues.length > 0) {
   const newValues = e.propertyValues.map((v) => ({
    id:     crypto.randomUUID(),
    entryId:  v.entryId,
    propertyId: v.propertyId,
    value:   v.value,
   }));
   setValues((prev) => [...prev, ...newValues]);
  }
  // Only enter inline title-edit mode when no title was pre-supplied (table/calendar add)
  if (!t) setEditingTitleId(e.id);
 }, [page.id]);

 const saveTitle = useCallback(async (entryId: string, title: string) => {
  const t = title.trim() || "Untitled";
  setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, title: t } : e));
  setEditingTitleId(null);
  await fetch(`/api/pages/${entryId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ title: t }),
  });
 }, []);

 const savePanelTitle = useCallback(async (entryId: string, title: string) => {
  const t = title.trim() || "Untitled";
  setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, title: t } : e));
  await fetch(`/api/pages/${entryId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ title: t }),
  });
 }, []);

 const saveEntryIcon = useCallback(async (entryId: string, icon: string) => {
  setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, icon } : e));
  await fetch(`/api/pages/${entryId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ icon }),
  });
 }, []);

 const deleteEntry = useCallback(async (entryId: string) => {
  setEntries((prev) => prev.filter((e) => e.id !== entryId));
  setSelectedIds((prev) => { const n = new Set(prev); n.delete(entryId); return n; });
  await fetch(`/api/pages/${entryId}`, { method: "DELETE" });
 }, []);

 const deleteSelected = useCallback(async () => {
  const ids = [...selectedIds];
  setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
  setSelectedIds(new Set());
  await Promise.all(ids.map((id) => fetch(`/api/pages/${id}`, { method: "DELETE" })));
 }, [selectedIds]);

 const duplicateEntry = useCallback(async (entryId: string) => {
  const res = await fetch(`/api/pages/${entryId}/duplicate`, { method: "POST" });
  if (!res.ok) return;
  const dup = await res.json() as { id: string; shortId: string; title: string; orderIndex: number; icon: string | null; updatedAt: string | null };
  setEntries((prev) => [...prev, { id: dup.id, shortId: dup.shortId, title: dup.title, orderIndex: dup.orderIndex, icon: dup.icon, updatedAt: dup.updatedAt }]);
  const dupValues = values
   .filter((v) => v.entryId === entryId)
   .map((v) => ({ ...v, id: crypto.randomUUID(), entryId: dup.id }));
  if (dupValues.length) setValues((prev) => [...prev, ...dupValues]);
 }, [values]);

 const updatePropValue = useCallback(async (entryId: string, propId: string, value: unknown) => {
  setValues((prev) => {
   const idx = prev.findIndex((v) => v.entryId === entryId && v.propertyId === propId);
   if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], value }; return n; }
   return [...prev, { id: crypto.randomUUID(), entryId, propertyId: propId, value }];
  });
  await fetch(`/api/entries/${entryId}/property-values/${propId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ value }),
  });
 }, []);

 // ── Selection ──────────────────────────────────────────────────────────────

 const toggleSelect = useCallback((id: string) => {
  setSelectedIds((prev) => {
   const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
 }, []);

 const toggleSelectAll = useCallback(() => {
  setSelectedIds((prev) =>
   prev.size === entries.length ? new Set() : new Set(entries.map((e) => e.id))
  );
 }, [entries]);

 // ── Property actions ───────────────────────────────────────────────────────

 const addProperty = useCallback(async (name: string, type: string, config?: Record<string, unknown>) => {
  const resolvedConfig = config ?? ((type === "select" || type === "multi_select") ? { options: [] } : {});
  const res = await fetch(`/api/databases/${page.id}/properties`, {
   method: "POST", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ name, type, config: resolvedConfig }),
  });
  if (!res.ok) return;
  const prop = await res.json() as DatabaseProperty;
  setProperties((prev) => [...prev, prop]);
 }, [page.id]);

 const renameProperty = useCallback(async (propId: string, name: string) => {
  setProperties((prev) => prev.map((p) => p.id === propId ? { ...p, name } : p));
  await fetch(`/api/databases/${page.id}/properties/${propId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ name }),
  });
 }, [page.id]);

 const updateProperty = useCallback(async (propId: string, patch: Record<string, unknown>) => {
  setProperties((prev) => prev.map((p) => p.id === propId ? { ...p, ...patch } as DatabaseProperty : p));
  await fetch(`/api/databases/${page.id}/properties/${propId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify(patch),
  });
 }, [page.id]);

 const deleteProperty = useCallback(async (propId: string) => {
  setProperties((prev) => prev.filter((p) => p.id !== propId));
  setValues((prev) => prev.filter((v) => v.propertyId !== propId));
  await fetch(`/api/databases/${page.id}/properties/${propId}`, { method: "DELETE" });
 }, [page.id]);

 const updateView = useCallback(async (patch: Record<string, unknown>) => {
  if (!activeView) return;
  const viewId = activeView.id;
  setViews((prev) => prev.map((v) => v.id === viewId ? { ...v, ...patch } as DatabaseView : v));
  await fetch(`/api/databases/${page.id}/views/${viewId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify(patch),
  });
 }, [page.id, activeView]);

 const addView = useCallback(async (name: string, type: string) => {
  let calendarPropertyId: string | null = null;

  if (type === "calendar") {
   // Find or create a Date property so the calendar has something to group by
   let dateProp = properties.find((p) => p.type === "date");
   if (!dateProp) {
    const pRes = await fetch(`/api/databases/${page.id}/properties`, {
     method: "POST", headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name: "Date", type: "date", config: {} }),
    });
    if (pRes.ok) {
     dateProp = await pRes.json() as DatabaseProperty;
     setProperties((prev) => [...prev, dateProp!]);
    }
   }
   calendarPropertyId = dateProp?.id ?? null;
  }

  const res = await fetch(`/api/databases/${page.id}/views`, {
   method: "POST", headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ name, type, calendarPropertyId }),
  });
  if (!res.ok) return;
  const view = await res.json() as DatabaseView;
  setViews((prev) => [...prev, view]);
  setActiveViewId(view.id);
 }, [page.id, properties]);

 const deleteView = useCallback(async (viewId: string) => {
  setDeletingView(true);
  const remaining = views.filter((v) => v.id !== viewId);
  setViews(remaining);
  if (activeViewId === viewId && remaining.length > 0) {
   setActiveViewId(remaining[0].id);
   switchView(remaining[0].id);
  }
  try {
   await fetch(`/api/databases/${page.id}/views/${viewId}`, { method: "DELETE" });
  } finally {
   setDeletingView(false);
   setDeleteViewTarget(null);
  }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [page.id, views, activeViewId]);

 const renameView = useCallback(async (viewId: string, name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return;
  setViews((prev) => prev.map((v) => v.id === viewId ? { ...v, name: trimmed } : v));
  setRenamingViewId(null);
  await fetch(`/api/databases/${page.id}/views/${viewId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ name: trimmed }),
  });
 }, [page.id]);

 const duplicateView = useCallback(async (viewId: string) => {
  const view = views.find((v) => v.id === viewId);
  if (!view) return;
  const res = await fetch(`/api/databases/${page.id}/views`, {
   method: "POST", headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ name: `${view.name} (copy)`, type: view.type }),
  });
  if (!res.ok) return;
  const newView = await res.json() as DatabaseView;
  setViews((prev) => [...prev, newView]);
  setActiveViewId(newView.id);
 }, [page.id, views]);

 const togglePropertyVisibility = useCallback(async (propId: string, hidden: boolean) => {
  setProperties((prev) => prev.map((p) => p.id === propId ? { ...p, isHidden: hidden } : p));
  await fetch(`/api/databases/${page.id}/properties/${propId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ isHidden: hidden }),
  });
 }, [page.id]);

 // ── Page meta ──────────────────────────────────────────────────────────────

 async function savePageTitle(title: string) {
  const t = title.trim() || "Untitled";
  setPageTitle(t);
  setEditingPageTitle(false);
  await fetch(`/api/pages/${page.id}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ title: t }),
  });
 }

 async function savePageIcon(icon: string) {
  setPageIcon(icon || null);
  await fetch(`/api/pages/${page.id}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ icon: icon || null }),
  });
 }

 async function savePageCover(coverUrl: string) {
  setPageCoverUrl(coverUrl || null);
  await fetch(`/api/pages/${page.id}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ coverUrl: coverUrl || null }),
  });
 }

 // ── Render ─────────────────────────────────────────────────────────────────

 const isCoverGradient  = pageCoverUrl?.startsWith("linear-gradient");
 const activeFilterCount = filterRules.length;
 const activeSortCount  = sortRules.length;

 return (
  <>
  <div className={"flex h-full flex-col overflow-hidden bg-background"}>

   {/* Breadcrumbs + actions */}
   <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-card/95 px-3 backdrop-blur-sm">
    <nav className="flex min-w-0 items-center gap-0.5 text-xs">
     <Link
      href={`/app/${workspaceSlug}`}
      className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
     >
      <HouseIcon size={13} />
      <span className="font-medium">{workspaceName}</span>
     </Link>

     {breadcrumbs.map((crumb) => (
      <span key={crumb.shortId} className="flex min-w-0 items-center gap-0.5">
       <CaretRightIcon size={11} className="shrink-0 text-foreground/30" />
       <Link
        href={`/app/${workspaceSlug}/${crumb.shortId}`}
        className="max-w-[120px] truncate rounded-[var(--radius-sm)] px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
       >
        {crumb.title}
       </Link>
      </span>
     ))}

     <span className="flex min-w-0 items-center gap-0.5">
      <CaretRightIcon size={11} className="shrink-0 text-foreground/30" />
      <span className="max-w-[240px] truncate px-2 py-1 text-xs font-semibold text-foreground/80">
       {pageTitle || "Untitled"}
      </span>
     </span>
    </nav>

    {/* Action buttons — same as page editor */}
    <div className="ml-2 flex shrink-0 items-center gap-0.5">
     <ShareButton
      pageId={page.id}
      currentUserId={currentUserId}
      isPrivate={isPrivate}
      isEditor={isEditor}
     />
     <PageCommentButton
      pageId={page.id}
      workspaceId={workspaceId}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
     />
     <FavoriteButton
      pageId={page.id}
      workspaceId={workspaceId}
      isFavorited={isFavorited}
     />
     {isEditor && (
      <PageActionsMenu
       pageId={page.id}
       isLocked={isLocked}
       isDeleted={isDeleted}
       workspaceSlug={workspaceSlug}
       workspaceId={workspaceId}
       pageShortId={page.shortId}
       pageTitle={pageTitle}
       pageKind={page.kind}
      />
     )}
    </div>
   </div>

   {/* Scrollable area: cover + header + sticky toolbar + view */}
   <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">

   {/* Cover */}
   {pageCoverUrl && (
    <div className="group/cover relative h-[280px] w-full">
     {isCoverGradient
      ? <div className="h-full w-full" style={{ background: pageCoverUrl }} />
      // eslint-disable-next-line @next/next/no-img-element
      : <img src={pageCoverUrl} alt="" className="h-full w-full object-cover" />
     }
     <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 transition-opacity group-hover/cover:opacity-100">
      <div className="relative">
       <button
        onClick={() => { setShowCoverPicker((p) => !p); setShowIconPicker(false); }}
        className="rounded-[var(--radius-sm)] bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
       >
        Change cover
       </button>
       {showCoverPicker && (
        <CoverPicker
         pageId={page.id}
         workspaceId={workspaceId}
         onSelect={(url) => { setShowCoverPicker(false); savePageCover(url); }}
         onRemove={() => { setShowCoverPicker(false); savePageCover(""); }}
         onClose={() => setShowCoverPicker(false)}
        />
       )}
      </div>
      <button onClick={() => savePageCover("")}
       className="rounded-[var(--radius-sm)] bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition-colors">
       Remove
      </button>
     </div>
    </div>
   )}

   {/* Page header */}
   <div className="relative mx-auto w-full max-w-[1100px] px-8 pb-2 pt-6">

    {/* Subtle action buttons row (Add icon / Add cover) */}
    <div className="mb-2 flex items-center gap-1">
     {!pageIcon && (
      <div className="relative">
       <button
        onClick={() => { setShowIconPicker((p) => !p); setShowCoverPicker(false); }}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
       >
        <SmileyStickerIcon size={13} /> Add icon
       </button>
       {showIconPicker && (
        <IconPicker
         onSelect={(v) => { savePageIcon(v); setShowIconPicker(false); }}
         onClose={() => setShowIconPicker(false)}
         workspaceId={workspaceId}
         pageId={page.id}
        />
       )}
      </div>
     )}
     {!pageCoverUrl && (
      <div className="relative">
       <button
        onClick={() => { setShowCoverPicker((p) => !p); setShowIconPicker(false); }}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
       >
        <ImageIcon size={13} /> Add cover
       </button>
       {showCoverPicker && (
        <CoverPicker
         pageId={page.id}
         workspaceId={workspaceId}
         onSelect={(url) => { setShowCoverPicker(false); savePageCover(url); }}
         onRemove={() => { setShowCoverPicker(false); savePageCover(""); }}
         onClose={() => setShowCoverPicker(false)}
        />
       )}
      </div>
     )}
    </div>

    {/* Icon + Title on same row (Notion style) */}
    <div className="flex items-start gap-3">
     {pageIcon && (
      <div className="relative mt-1 shrink-0">
       <button
        onClick={() => { setShowIconPicker((p) => !p); setShowCoverPicker(false); }}
        className="flex size-12 items-center justify-center rounded-[var(--radius-md)] transition-all hover:bg-muted/50"
       >
        <PageIcon icon={pageIcon} size={48} />
       </button>
       {showIconPicker && (
        <IconPicker
         onSelect={(v) => { savePageIcon(v); setShowIconPicker(false); }}
         onRemove={() => { savePageIcon(""); setShowIconPicker(false); }}
         onClose={() => setShowIconPicker(false)}
         workspaceId={workspaceId}
         pageId={page.id}
        />
       )}
      </div>
     )}

     <div className="min-w-0 flex-1">
      {/* Title */}
      {editingPageTitle ? (
       <input
        ref={pageTitleRef}
        defaultValue={pageTitle}
        autoFocus
        onBlur={(e) => savePageTitle(e.target.value)}
        onKeyDown={(e) => {
         if (e.key === "Enter") savePageTitle((e.target as HTMLInputElement).value);
         if (e.key === "Escape") setEditingPageTitle(false);
        }}
        className="w-full bg-transparent text-4xl font-bold tracking-tight text-foreground outline-none"
       />
      ) : (
       <h1
        onClick={() => setEditingPageTitle(true)}
        className="-mx-1 cursor-text rounded px-1 text-4xl font-bold tracking-tight text-foreground hover:bg-muted/30 transition-colors"
       >
        {pageTitle || <span className="text-muted-foreground/60">Untitled</span>}
       </h1>
      )}

      {/* Description */}
      {editingDescription ? (
       <textarea
        ref={descRef}
        autoFocus
        defaultValue={pageDescription}
        rows={1}
        onInput={(e) => {
         const el = e.currentTarget;
         el.style.height = "auto";
         el.style.height = el.scrollHeight + "px";
        }}
        onBlur={(e) => saveDescription(e.target.value)}
        onKeyDown={(e) => {
         if (e.key === "Escape") saveDescription((e.target as HTMLTextAreaElement).value);
        }}
        placeholder="Add a description…"
        className="mt-1 w-full resize-none overflow-hidden bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30"
       />
      ) : (
       <p
        onClick={() => setEditingDescription(true)}
        className="-mx-1 mt-1 cursor-text rounded px-1 text-sm text-muted-foreground transition-colors hover:bg-muted/30"
       >
        {pageDescription || <span className="text-muted-foreground/60">Add a description…</span>}
       </p>
      )}
     </div>
    </div>
   </div>

   {/* View tabs + toolbar — sticky so it stays visible as cover/header scroll away */}
   <div ref={viewToolbarRef} className="sticky top-0 z-20 bg-background border-b border-border/60">
   <div className="mx-auto flex max-w-[1100px] items-end justify-between px-8">
    <div className="flex items-end self-stretch">
     {views.map((view) => {
      const Icon   = VIEW_ICON[view.type] ?? TableIcon;
      const isActive = view.id === activeViewId;
      const isHovered = hoveredViewId === view.id;
      const menuOpen = viewMenuTarget?.id === view.id;
      return (
       <div
        key={view.id}
        className="group flex items-stretch relative"
        onMouseEnter={() => setHoveredViewId(view.id)}
        onMouseLeave={() => setHoveredViewId(null)}
       >
        {renamingViewId === view.id ? (
         <div className="flex items-end pb-1.5 px-1">
          <input
           autoFocus
           value={renamingViewName}
           onChange={(e) => setRenamingViewName(e.target.value)}
           onBlur={() => renameView(view.id, renamingViewName || view.name)}
           onKeyDown={(e) => {
            if (e.key === "Enter") renameView(view.id, renamingViewName || view.name);
            if (e.key === "Escape") setRenamingViewId(null);
           }}
           className="h-7 w-28 rounded-[var(--radius-sm)] border border-primary/40 bg-background px-2 text-sm focus:outline-none"
          />
         </div>
        ) : (
         <button
          onClick={() => switchView(view.id)}
          className={[
           "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
           isActive
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
         >
          <Icon size={13} />
          {view.name}
         </button>
        )}

        {/* ⋮ menu button — shown on hover */}
        <button
         onMouseDown={(e) => e.stopPropagation()}
         onClick={(e) => {
          e.stopPropagation();
          if (menuOpen) {
           setViewMenuTarget(null); setViewMenuRect(null);
          } else {
           const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
           closeAllToolbarPopups();
           setViewMenuTarget(view); setViewMenuRect(rect);
          }
         }}
         className="flex items-end pb-2 pr-1 pl-0.5"
         style={{ opacity: isHovered || menuOpen ? 1 : 0, pointerEvents: isHovered || menuOpen ? "auto" : "none" }}
        >
         <span className={[
          "flex size-5 items-center justify-center rounded-[var(--radius-xs)] transition-colors",
          menuOpen ? "bg-accent text-foreground" : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
         ].join(" ")}>
          <MoreVerticalIcon size={13} />
         </span>
        </button>
       </div>
      );
     })}

     {/* Add a view */}
     <div ref={addViewRef} className="relative mb-1 ml-1">
      <button
       onClick={() => { const next = !showAddView; closeAllToolbarPopups(); setShowAddView(next); }}
       title="Add a view"
       className={[
        "flex size-[26px] items-center justify-center rounded-[var(--radius-sm)] border transition-all",
        showAddView
         ? "border-primary bg-primary/10 text-primary"
         : "border-border/50 text-muted-foreground/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
       ].join(" ")}
      >
       <PlusIcon size={14} />
      </button>
      {showAddView && (
       <div className="absolute left-0 top-full z-[400] mt-1.5 w-[calc(100vw-24px)] max-w-[320px] overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card">
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
         <PlusIcon size={13} className="text-primary" />
         <span className="text-sm font-semibold text-foreground">Add a new view</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-3">
         {([
          { type: "table",  label: "Table",  Icon: TableIcon },
          { type: "board",  label: "Board",  Icon: SquaresFourIcon },
          { type: "calendar", label: "Calendar", Icon: CalendarIcon },
          { type: "gallery", label: "Gallery", Icon: GridFourIcon },
         ] as const).map(({ type, label, Icon }) => (
          <button
           key={type}
           onClick={() => { addView(label, type); setShowAddView(false); }}
           className="group flex flex-col items-center gap-2 rounded-[var(--radius-md)] px-2 py-3 text-center transition-all hover:bg-primary/5 active:scale-[0.96]"
          >
           <div className="flex size-12 items-center justify-center rounded-[var(--radius-md)] border border-border/70 bg-muted/50 transition-all group-hover:border-primary/40 group-hover:bg-primary/10">
            <Icon size={24} className="text-foreground/70 transition-colors group-hover:text-primary" />
           </div>
           <span className="text-xs font-medium leading-tight text-muted-foreground transition-colors group-hover:text-primary">
            {label}
           </span>
          </button>
         ))}
        </div>
       </div>
      )}
     </div>
    </div>

    <div className="mb-1 flex shrink-0 items-center gap-0.5">
     <div className="relative">
      <button
       onClick={() => { const next = !showFilter; closeAllToolbarPopups(); setShowFilter(next); }}
       className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-colors ${activeFilterCount > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
      >
       <FunnelIcon size={13} />
       Filter
       {activeFilterCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-white">{activeFilterCount}</span>}
      </button>
      {showFilter && (
       <FilterPanel
        properties={properties}
        filters={filterRules}
        onChange={setFilterRules}
        onClear={() => setFilterRules([])}
        onClose={() => setShowFilter(false)}
       />
      )}
     </div>

     <div className="relative">
      <button
       onClick={() => { const next = !showSort; closeAllToolbarPopups(); setShowSort(next); }}
       className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-colors ${activeSortCount > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
      >
       <SortAscendingIcon size={13} />
       Sort
       {activeSortCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-white">{activeSortCount}</span>}
      </button>
      {showSort && (
       <SortPanel
        properties={properties}
        sorts={sortRules}
        onChange={setSortRules}
        onClear={() => setSortRules([])}
        onClose={() => setShowSort(false)}
       />
      )}
     </div>

     <div className="relative">
      <button
       onClick={() => { const next = !showProperties; closeAllToolbarPopups(); setShowProperties(next); }}
       className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
       <EyeIcon size={13} /> Properties
      </button>
      {showProperties && (
       <PropertiesPanel
        properties={properties}
        onToggle={togglePropertyVisibility}
        onClose={() => setShowProperties(false)}
       />
      )}
     </div>

     <div className="mx-1 h-4 w-px bg-border/60" />

     <button
      ref={newButtonRef}
      data-new-entry-button
      onClick={() => {
       if (activeView?.type === "calendar") {
        const calPropId = activeView.calendarPropertyId
         ?? properties.find((p) => p.type === "date")?.id;
        if (calPropId) {
         const now = new Date();
         const pad = (n: number) => String(n).padStart(2, "0");
         // If user is viewing the current month use today; otherwise use 1st of viewed month
         const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();
         const day = isCurrentMonth ? now.getDate() : 1;
         addEntry({ [calPropId]: { date: `${calYear}-${pad(calMonth + 1)}-${pad(day)}` } });
         return;
        }
       }
       addEntry();
      }}
      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
     >
      <PlusIcon size={12} />
      New
     </button>
    </div>
   </div>
   </div>

   {/* Bulk action bar */}
   {selectedIds.size > 0 && (
    <div className="border-b border-border/40 bg-primary/5">
    <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-6 py-2">
     <span className="text-sm font-medium">
      {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
     </span>
     <button
      onClick={deleteSelected}
      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
     >
      <TrashIcon size={12} /> Delete
     </button>
     <button
      onClick={() => setSelectedIds(new Set())}
      className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
     >
      <XIcon size={12} /> Cancel
     </button>
    </div>
    </div>
   )}

   {/* View */}
   <div
    ref={tableViewRef}
    className={`relative ${activeView?.type === "table" ? "overflow-x-auto" : ""}`}
    style={activeView?.type === "calendar" ? { height: calendarHeight ?? "calc(100dvh - 6rem)" } : undefined}
   >
    {viewSwitching && (
     <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
     </div>
    )}
    <div className={`mx-auto w-full max-w-[1100px] ${activeView?.type === "calendar" ? "h-full" : ""}`}>
    {activeView?.type === "board" ? (
     <TemplateBoardView
      entries={displayedEntries}
      properties={properties}
      activeView={activeView}
      entryValueMap={entryValueMap}
      databaseId={page.id}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      onAddEntry={addEntry}
      onDeleteEntry={deleteEntry}
      onDuplicateEntry={duplicateEntry}
      onClickEntry={handleClickEntry}
      onSaveTitle={saveTitle}
      onUpdatePropValue={updatePropValue}
      onUpdateProperty={updateProperty}
      onUpdateEntryIcon={saveEntryIcon}
      onUpdateView={updateView}
      onAddProperty={addProperty}
      onDeleteProperty={deleteProperty}
      getEditPropertyAnchorRect={getEditPropertyAnchorRect}
     />
    ) : activeView?.type === "calendar" ? (
     <TemplateCalendarView
      entries={displayedEntries}
      properties={properties}
      activeView={activeView}
      entryValueMap={entryValueMap}
      databaseId={page.id}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      year={calYear}
      month={calMonth}
      onYearChange={setCalYear}
      onMonthChange={setCalMonth}
      onAddEntry={addEntry}
      onDeleteEntry={deleteEntry}
      onDuplicateEntry={duplicateEntry}
      onUpdateEntryIcon={saveEntryIcon}
      onClickEntry={handleClickEntry}
      onUpdateEntryDate={(entryId, calPropId, newDate) => updatePropValue(entryId, calPropId, { date: newDate })}
      onUpdatePropValue={updatePropValue}
      onUpdateProperty={updateProperty}
      onUpdateView={updateView}
     />
    ) : activeView?.type === "gallery" ? (
     <TemplateGalleryView
      entries={displayedEntries}
      databaseId={page.id}
      properties={properties}
      activeView={activeView}
      entryValueMap={entryValueMap}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      onAddEntry={addEntry}
      onDeleteEntry={deleteEntry}
      onDuplicateEntry={duplicateEntry}
      onClickEntry={handleClickEntry}
      onSaveTitle={saveTitle}
      onUpdateEntryIcon={saveEntryIcon}
      onUpdatePropValue={updatePropValue}
      onUpdateProperty={updateProperty}
      onUpdateView={updateView}
     />
    ) : (
     <TemplateTableView
      entries={displayedEntries}
      properties={properties}
      entryValueMap={entryValueMap}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      selectedIds={selectedIds}
      editingTitleId={editingTitleId}
      onToggleSelect={toggleSelect}
      onToggleSelectAll={toggleSelectAll}
      onAddEntry={addEntry}
      onSaveTitle={saveTitle}
      onStartEditTitle={setEditingTitleId}
      onClickEntry={handleClickEntry}
      onUpdatePropValue={updatePropValue}
      onDeleteEntry={deleteEntry}
      onDuplicateEntry={duplicateEntry}
      onAddProperty={addProperty}
      onRenameProperty={renameProperty}
      onUpdateProperty={updateProperty}
      onDeleteProperty={deleteProperty}
      getEditPropertyAnchorRect={getEditPropertyAnchorRect}
      activeView={activeView}
      onUpdateView={updateView}
     />
    )}
    </div>
   </div>

   </div>{/* end scrollable area */}
  </div>

  {/* ── View context menu portal ── */}
  {viewMenuTarget && viewMenuRect && typeof document !== "undefined" && createPortal(
   <div
    ref={viewMenuRef}
    style={{ position: "fixed", top: viewMenuRect.bottom + 4, left: viewMenuRect.left, zIndex: 500 }}
    className="w-48 overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover p-1"
   >
    <button
     onClick={() => {
      setRenamingViewId(viewMenuTarget.id);
      setRenamingViewName(viewMenuTarget.name);
      setViewMenuTarget(null); setViewMenuRect(null);
     }}
     className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    >
     <PencilIcon size={13} className="shrink-0 text-muted-foreground" /> Rename
    </button>
    <button
     onClick={() => { duplicateView(viewMenuTarget.id); setViewMenuTarget(null); setViewMenuRect(null); }}
     className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    >
     <CopyIcon size={13} className="shrink-0 text-muted-foreground" /> Duplicate view
    </button>
    {views.length > 1 && (
     <>
      <div className="my-1 h-px bg-border/60" />
      <button
       onClick={() => { setDeleteViewTarget(viewMenuTarget); setViewMenuTarget(null); setViewMenuRect(null); }}
       className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
       <TrashIcon size={13} className="shrink-0" /> Delete view
      </button>
     </>
    )}
   </div>,
   document.body
  )}

  {/* ── Delete view confirmation ── */}
  <ConfirmDialog
   open={!!deleteViewTarget}
   onOpenChange={(o) => !o && setDeleteViewTarget(null)}
   title={`Delete "${deleteViewTarget?.name}"?`}
   description="This view and its configuration will be permanently deleted. Entries in your database will not be affected."
   confirmLabel="Delete view"
   confirmLoadingLabel="Deleting…"
   loading={deletingView}
   onConfirm={() => { if (deleteViewTarget) deleteView(deleteViewTarget.id); }}
  />
  </>
 );
}
