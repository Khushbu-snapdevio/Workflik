"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
 Table2 as TableIcon, LayoutGrid as SquaresFourIcon, Calendar as CalendarIcon, Grid2X2 as GridFourIcon,
 GanttChartSquare as GanttIcon,
 Filter as FunnelIcon, ArrowUpDown as SortAscendingIcon, Eye as EyeIcon,
 Plus as PlusIcon, Image as ImageIcon, Smile as SmileyStickerIcon,
 X as XIcon, Trash2 as TrashIcon, Check as CheckIcon, Home as HouseIcon,
 ChevronRight as CaretRightIcon, ChevronLeft as ChevronLeftIcon,
 MoreVertical as MoreVerticalIcon, Pencil as PencilIcon, Copy as CopyIcon,
} from "lucide-react";

import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpload } from "@/lib/storage/use-upload";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { TimeAgo } from "@/components/ui/time-ago";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiOptionPicker } from "@/components/database/filter-bar";
import { getClampedTop, getClampedLeft } from "@/lib/ui/clamp-to-viewport";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import { pageNavSourceHref, pageNavSourceLabel, type PageNavSource } from "@/lib/pages/navigation-source";
import { TemplateTableView }  from "./views/template-table-view";
import { TemplateBoardView }  from "./views/template-board-view";
import { TemplateCalendarView } from "./views/template-calendar-view";
import { TemplateGalleryView } from "./views/template-gallery-view";
import { TemplateGanttView } from "./views/template-gantt-view";
import { ConfirmDialog }   from "@/components/ui/confirm-dialog";
import { ShareButton }     from "@/components/pages/share-button";
import { CopyLinkButton }   from "@/components/pages/copy-link-button";
import { PageSearchButton } from "@/components/pages/page-search-button";
import { PagePrivacyProvider } from "@/components/pages/page-privacy-context";
import { PagePrivacyPill }   from "@/components/pages/page-privacy-pill";
import { FavoriteButton }    from "@/components/pages/favorite-button";
import { PageActionsMenu }   from "@/components/pages/page-actions-menu";
import { IconPicker }       from "@/components/pages/icon-picker";
import { PageIcon }        from "@/components/pages/page-icon";

export type TemplateEntry = { id: string; shortId: string; title: string; orderIndex: number; icon?: string | null; updatedAt?: string | null; commentCount?: number };
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
   if (rule.operator === "is_any_of")  return Array.isArray(rule.value) && rule.value.includes(optId);
   if (rule.operator === "is_none_of") return Array.isArray(rule.value) && !rule.value.includes(optId);
   // No option chosen ("Any") — the filter row exists but doesn't yet
   // constrain anything, so it shouldn't exclude every row via a literal
   // `optionId === ""` comparison that can never be true.
   if (!rule.value) return true;
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

// Pulls the actual sortable key out of a property's stored value shape —
// e.g. a select's value is `{ optionId }`, which sorts by an arbitrary
// generated id unless resolved to the option's label first.
function sortKeyFor(value: unknown, type: string, options?: { id: string; name: string }[]): string | number | boolean | null {
 if (value == null) return null;
 switch (type) {
  case "number":
   return (value as { number?: number } | null)?.number ?? null;
  case "checkbox":
   return (value as { checked?: boolean } | null)?.checked ?? false;
  case "date":
   return (value as { date?: string } | null)?.date ?? null;
  case "select": {
   const optId = (value as { optionId?: string } | null)?.optionId ?? null;
   if (!optId) return null;
   return options?.find((o) => o.id === optId)?.name ?? optId;
  }
  case "person":
  case "created_by": {
   const v = value as { userIds?: string[]; _members?: { id: string; name: string; email: string }[] } | null;
   const userIds = v?.userIds ?? [];
   if (!userIds.length) return null;
   const members = v?._members ?? [];
   return userIds
    .map((id) => { const m = members.find((m) => m.id === id); return m?.name || m?.email || id; })
    .join(", ");
  }
  default:
   return (value as { text?: string } | null)?.text ?? null;
 }
}

function compareVals(a: unknown, b: unknown, type: string, options?: { id: string; name: string }[]): number {
 const ka = sortKeyFor(a, type, options);
 const kb = sortKeyFor(b, type, options);
 if (ka == null && kb == null) return 0;
 if (ka == null) return 1;
 if (kb == null) return -1;
 if (typeof ka === "number" && typeof kb === "number") return ka - kb;
 if (typeof ka === "boolean" && typeof kb === "boolean") return ka === kb ? 0 : ka ? 1 : -1;
 return String(ka).localeCompare(String(kb));
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
    { value: "is",      label: "is"      },
    { value: "is_not",    label: "is not"    },
    { value: "is_any_of",  label: "is any of"  },
    { value: "is_none_of", label: "is none of" },
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
  <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
   <DialogContent className="max-w-95">
    <DialogHeader>
     <DialogTitle>Page Cover</DialogTitle>
    </DialogHeader>

    <div>
     {/* File upload */}
     <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Upload image</p>
     <button
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
      className="mb-1 flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground disabled:opacity-50"
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


     <div className="my-3 border-t border-border" />

     {/* Gradients */}
     <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Color & Gradient</p>
     <div className="mb-4 grid grid-cols-6 gap-1.5">
      {COVER_GRADIENTS.map((g) => (
       <button
        key={g}
        onClick={() => { onSelect(g); onClose(); }}
        style={{ background: g }}
        className="h-8 rounded-sm border border-border transition-all hover:scale-105 hover:ring-2 hover:ring-primary/50"
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
       className="flex-1 rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
      />
      <button
       onClick={() => { if (url.trim()) { onSelect(url.trim()); onClose(); } }}
       className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
       Set
      </button>
     </div>

     <button
      onClick={() => { onRemove(); onClose(); }}
      className="mt-3 w-full rounded-sm py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
     >
      Remove cover
     </button>
    </div>
   </DialogContent>
  </Dialog>
 );
}

// ── Filter panel ──────────────────────────────────────────────────────────────

const SYSTEM_TYPES = new Set(["title","created_by","created_time","last_edited_by","last_edited_time"]);
const ANY_OPTION = "__any__";
// Sentinel propertyId for sorting by the entry's page title (the "Name"
// column), which has no `database_properties` row. Matches the id the
// entries API recognises so saved view sorts round-trip server-side too.
const TITLE_SORT_ID = "__title__";

function FilterPanel({ properties, filters, onChange, onClear, onClose }: {
 properties: DatabaseProperty[];
 filters:  FilterRule[];
 onChange:  (f: FilterRule[]) => void;
 onClear:  () => void;
 onClose:  () => void;
}) {
 const props = properties.filter((p) => !SYSTEM_TYPES.has(p.type));
 const atLimit = props.length === 0;
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 // The same property can be picked more than once — rows sharing a property
 // OR together (see displayedEntries), which is how "Priority is Medium OR
 // High" is expressed as two separate rows instead of requiring "is any of".
 function addRule() {
  if (atLimit) return;
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
  <div className="absolute right-0 top-full z-400 mt-1 w-[calc(100vw-24px)] max-w-95 rounded-md border border-border bg-popover">
   <div className="flex items-center justify-between border-b border-border px-4 py-3">
    <span className="text-sm font-semibold">Filter</span>
    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={14} /></button>
   </div>
   <div className="max-h-80 overflow-y-auto p-3 space-y-2">
    {filters.length === 0 && (
     <p className="py-4 text-center text-xs text-muted-foreground">No filters applied. Add one below.</p>
    )}
    {filters.map((f, i) => {
     const prop  = props.find((p) => p.id === f.propertyId);
     const ops   = getOperators(prop?.type ?? "text");
     const config = (prop?.config ?? {}) as { options?: { id: string; name: string }[] };
     const needsVal = !["is_empty","is_not_empty","is_checked","is_not_checked"].includes(f.operator);
     // "is any of" / "is none of" lets ONE rule match several values of the
     // same select property. Alternatively, two separate rows on the same
     // property (below) OR together instead — see displayedEntries.
     const isMultiVal = prop?.type === "select" && (f.operator === "is_any_of" || f.operator === "is_none_of");
     // Rows sharing a property with an earlier row OR together instead of
     // AND (see displayedEntries) — surface that so it isn't silent.
     const isOr = i > 0 && filters.slice(0, i).some((other) => other.propertyId === f.propertyId);
     return (
      <div key={f.id} className="flex items-center gap-1.5">
       {i > 0 && (
        <span className={`shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-bold tracking-wide ${
         isOr ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
        }`}>
         {isOr ? "or" : "and"}
        </span>
       )}
       <Select
        value={f.propertyId}
        onValueChange={(v) => {
         const np = props.find((p) => p.id === v);
         const ops2 = getOperators(np?.type ?? "text");
         update(f.id, { propertyId: v, operator: ops2[0].value, value: "" });
        }}
       >
        <SelectTrigger size="sm" className="w-auto min-w-24 shrink-0">
         <SelectValue />
        </SelectTrigger>
        <SelectContent>
         {props.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
         ))}
        </SelectContent>
       </Select>
       <Select
        value={f.operator}
        onValueChange={(v) => update(f.id, { operator: v, value: (v === "is_any_of" || v === "is_none_of") ? [] : "" })}
       >
        <SelectTrigger size="sm" className="w-auto min-w-24 shrink-0">
         <SelectValue />
        </SelectTrigger>
        <SelectContent>
         {ops.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
       </Select>
       {needsVal && isMultiVal && (
        <MultiOptionPicker
         options={config.options ?? []}
         value={Array.isArray(f.value) ? f.value as string[] : []}
         onChange={(ids) => update(f.id, { value: ids })}
        />
       )}
       {needsVal && !isMultiVal && prop?.type === "select" && (
        // Radix Select items can't have an empty-string value (reserved for
        // "unset"), so "Any" — the "no specific option required" choice —
        // uses a sentinel that's translated back to "" on select/read.
        <Select
         value={String(f.value ?? "") || ANY_OPTION}
         onValueChange={(v) => update(f.id, { value: v === ANY_OPTION ? "" : v })}
        >
         <SelectTrigger size="sm" className="min-w-0 flex-1">
          <SelectValue className="truncate" />
         </SelectTrigger>
         <SelectContent>
          <SelectItem value={ANY_OPTION}>Any</SelectItem>
          {config.options?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
         </SelectContent>
        </Select>
       )}
       {needsVal && prop?.type !== "select" && prop?.type !== "checkbox" && (
        <input
         type={prop?.type === "number" ? "number" : prop?.type === "date" ? "date" : "text"}
         value={String(f.value ?? "")}
         onChange={(e) => update(f.id, { value: e.target.value })}
         placeholder="Value…"
         className="min-w-0 flex-1 rounded-sm border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
       )}
       <button onClick={() => remove(f.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
        <XIcon size={13} />
       </button>
      </div>
     );
    })}
   </div>
   <div className="flex items-center gap-2 border-t border-border px-4 py-3">
    <button
     onClick={addRule}
     disabled={atLimit}
     onMouseEnter={(e) => { if (atLimit) showTooltip("No filterable properties on this database", e); }}
     onMouseLeave={hideTooltip}
     className="flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
    >
     <PlusIcon size={12} /> Add filter
    </button>
    {filters.length > 0 && (
     <button onClick={onClear} className="ml-auto flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
      <TrashIcon size={12} /> Clear all
     </button>
    )}
   </div>
   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
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
 // The Name column has no `database_properties` row — it's the entry's own
 // page title — so it's prepended as a synthetic option under the same
 // `__title__` id the entries API already sorts by. Only id/name are read here.
 const props: { id: string; name: string }[] = [
  { id: TITLE_SORT_ID, name: "Name" },
  ...properties.filter((p) => !SYSTEM_TYPES.has(p.type)).map((p) => ({ id: p.id, name: p.name })),
 ];
 const atLimit = sorts.length >= props.length;
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 // Properties already used by OTHER rules — excluded from a row's own
 // dropdown (except its current selection) so the same property can't be
 // picked twice, and from `addSort`'s default pick.
 function usedElsewhere(excludeId?: string) {
  return new Set(sorts.filter((s) => s.id !== excludeId).map((s) => s.propertyId));
 }

 function addSort() {
  const used = usedElsewhere();
  const p = props.find((pr) => !used.has(pr.id));
  if (!p) return;
  onChange([...sorts, { id: crypto.randomUUID(), propertyId: p.id, direction: "asc" }]);
 }

 function update(id: string, patch: Partial<SortRule>) {
  onChange(sorts.map((s) => s.id === id ? { ...s, ...patch } : s));
 }

 function remove(id: string) { onChange(sorts.filter((s) => s.id !== id)); }

 return (
  <div className="absolute right-0 top-full z-400 mt-1 w-75 rounded-md border border-border bg-popover">
   <div className="flex items-center justify-between border-b border-border px-4 py-3">
    <span className="text-sm font-semibold">Sort</span>
    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={14} /></button>
   </div>
   <div className="max-h-70 overflow-y-auto p-3 space-y-2">
    {sorts.length === 0 && (
     <p className="py-4 text-center text-xs text-muted-foreground">No sorts applied.</p>
    )}
    {sorts.map((s) => {
     const used = usedElsewhere(s.id);
     return (
     <div key={s.id} className="flex items-center gap-2">
      <Select value={s.propertyId} onValueChange={(v) => update(s.id, { propertyId: v })}>
       <SelectTrigger size="sm" className="flex-1">
        <SelectValue />
       </SelectTrigger>
       <SelectContent>
        {props.filter((p) => !used.has(p.id)).map((p) => (
         <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
       </SelectContent>
      </Select>
      <Select value={s.direction} onValueChange={(v) => update(s.id, { direction: v as "asc" | "desc" })}>
       <SelectTrigger size="sm" className="w-24">
        <SelectValue />
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="asc">A → Z</SelectItem>
        <SelectItem value="desc">Z → A</SelectItem>
       </SelectContent>
      </Select>
      <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
       <XIcon size={13} />
      </button>
     </div>
     );
    })}
   </div>
   <div className="flex items-center gap-2 border-t border-border px-4 py-3">
    <button
     onClick={addSort}
     disabled={atLimit}
     onMouseEnter={(e) => { if (atLimit) showTooltip("All properties are already sorted", e); }}
     onMouseLeave={hideTooltip}
     className="flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
    >
     <PlusIcon size={12} /> Add sort
    </button>
    {sorts.length > 0 && (
     <button onClick={onClear} className="ml-auto flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
      <TrashIcon size={12} /> Clear all
     </button>
    )}
   </div>
   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
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
  <div className="absolute right-0 top-full z-400 mt-1 w-60 rounded-md border border-border bg-popover">
   <div className="flex items-center justify-between border-b border-border px-4 py-3">
    <span className="text-sm font-semibold">Properties</span>
    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={14} /></button>
   </div>
   <div className="max-h-80 overflow-y-auto p-2">
    {visible.map((p) => (
     <button
      key={p.id}
      onClick={() => onToggle(p.id, !p.isHidden)}
      className="flex w-full items-center gap-3 rounded-sm px-3 py-2 hover:bg-accent transition-colors"
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

// ── Main client ───────────────────────────────────────────────────────────────

const VIEW_ICON: Record<string, React.ElementType> = {
 table:  TableIcon,
 board:  SquaresFourIcon,
 calendar: CalendarIcon,
 gallery: GridFourIcon,
 gantt:  GanttIcon,
};

interface Props {
 page: {
  id: string; shortId: string; title: string;
  icon: string | null; coverUrl: string | null; kind: string;
  updatedAt: string | null;
 };
 properties:  DatabaseProperty[];
 views:     DatabaseView[];
 entries:    TemplateEntry[];
 values:    TemplateValue[];
 workspaceSlug: string;
 workspaceName: string;
 workspaceId:  string;
 breadcrumbs:  { id: string; shortId: string; title: string }[];
 navSource?:  PageNavSource;
 /** Nearest other top-level item (previous, or next if this was first) —
  *  used as the delete fallback destination when this page has no parent. */
 rootFallbackShortId?: string | null;
 defaultViewId: string | null;
 currentUserId: string;
 currentUserName: string | null;
 currentUserEmail: string | null;
 currentUserImage: string | null;
 isPrivate:   boolean;
 isFavorited:  boolean;
 isEditor:   boolean;
 isAdmin:    boolean;
 isLocked:   boolean;
 isDeleted:   boolean;
 lockedBanner?: React.ReactNode;
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
 breadcrumbs: initBreadcrumbs,
 navSource,
 rootFallbackShortId,
 defaultViewId,
 currentUserId,
 currentUserName,
 currentUserEmail,
 currentUserImage,
 isPrivate,
 isFavorited,
 isEditor,
 isAdmin,
 isLocked,
 isDeleted,
 lockedBanner,
}: Props) {
 const locked = isLocked && !isDeleted;
 const [properties, setProperties] = useState<DatabaseProperty[]>(initProps);
 const [views, setViews]      = useState<DatabaseView[]>(initViews);
 const [entries,  setEntries]  = useState<TemplateEntry[]>(initEntries);
 const [values,   setValues]   = useState<TemplateValue[]>(initValues);

 // Property values can also be edited from an entry's own page (EntryPropertiesPanel)
 // or the row context menu — neither shares state with this list, so without this
 // listener a value edited elsewhere only shows up here after a full page reload.
 useEffect(() => {
  function onValueChanged(e: Event) {
   const detail = (e as CustomEvent<{ entryId: string; propertyId: string; value: unknown }>).detail;
   if (!detail) return;
   setValues((prev) => {
    const idx = prev.findIndex((v) => v.entryId === detail.entryId && v.propertyId === detail.propertyId);
    if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], value: detail.value }; return n; }
    return [...prev, { id: crypto.randomUUID(), entryId: detail.entryId, propertyId: detail.propertyId, value: detail.value }];
   });
  }
  window.addEventListener("workflik:entry-value-changed", onValueChanged);
  return () => window.removeEventListener("workflik:entry-value-changed", onValueChanged);
 }, []);

 const [breadcrumbs, setBreadcrumbs] = useState(initBreadcrumbs);

 // Ancestor titles are otherwise frozen server props — renaming an ancestor
 // page elsewhere (or this page's own title, handled by pageTitle below)
 // would only show up here after a full reload without this listener.
 useEffect(() => {
  function onTitleChanged(e: Event) {
   const detail = (e as CustomEvent<{ pageId: string; title?: string }>).detail;
   if (!detail || detail.title === undefined) return;
   setBreadcrumbs((prev) => prev.map((c) => c.id === detail.pageId ? { ...c, title: detail.title! } : c));
  }
  window.addEventListener("workflik:page-title-changed", onTitleChanged);
  return () => window.removeEventListener("workflik:page-title-changed", onTitleChanged);
 }, []);

 const router = useRouter();

 // Server-seeded useState never re-reads new props on navigation-back, and router.refresh() doesn't retroactively feed an already-run
 // initializer — so explicitly refetch entries/props here, same as database-page.tsx's own live refresh.
 useEffect(() => {
  if (page.kind !== "database") return;
  let cancelled = false;
  async function refetch() {
   const [entriesRes, propsRes] = await Promise.all([
    fetch(`/api/databases/${page.id}/entries`),
    fetch(`/api/databases/${page.id}/properties`),
   ]);
   if (cancelled) return;
   if (entriesRes.ok) {
    const data = await entriesRes.json() as { entries: TemplateEntry[]; propertyValues: TemplateValue[] };
    if (!cancelled) { setEntries(data.entries); setValues(data.propertyValues); }
   }
   if (propsRes.ok) {
    const props = await propsRes.json() as DatabaseProperty[];
    if (!cancelled) setProperties(props);
   }
  }
  // Also runs immediately on mount: a plain breadcrumb navigation can land here with stale router/prefetch-cached props.
  refetch();
  function onVisibilityChange() { if (document.visibilityState === "visible") refetch(); }
  function onPageShow(e: PageTransitionEvent) { if (e.persisted) refetch(); }
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pageshow", onPageShow);
  return () => {
   cancelled = true;
   document.removeEventListener("visibilitychange", onVisibilityChange);
   window.removeEventListener("pageshow", onPageShow);
  };
 }, [page.id, page.kind]);

 const searchParams = useSearchParams();
 const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
 const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

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
 const [removeCoverConfirm, setRemoveCoverConfirm] = useState(false);
 const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
 const [deletingSelected, setDeletingSelected] = useState(false);

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
 // Shared by both icon-trigger buttons so IconPicker's outside-click-to-close doesn't treat a re-click on the button as "outside".
 const iconBtnRef = useRef<HTMLButtonElement>(null);

 const [showFilter,   setShowFilter]   = useState(false);
 const [showSort,    setShowSort]    = useState(false);
 const [showProperties, setShowProperties] = useState(false);
 const [showAddView,  setShowAddView]  = useState(false);
 const [showLayoutPicker, setShowLayoutPicker] = useState(false);
 // Hydrated from the view's stored filters/sorts inline (rather than via `initView` below) since state initializers must be self-contained.
 function initViewFor() {
  return initViews.find((v) => v.id === searchParams.get("view"))
   ?? initViews.find((v) => v.id === defaultViewId)
   ?? initViews[0];
 }
 const [filterRules,  setFilterRules]  = useState<FilterRule[]>(() => (initViewFor()?.filters as unknown as FilterRule[] | undefined) ?? []);
 const [sortRules,   setSortRules]   = useState<SortRule[]>(() => (initViewFor()?.sorts as unknown as SortRule[] | undefined) ?? []);

 // Only one toolbar popup (Filter / Sort / Properties / Add view / view "⋮" menu)
 // should ever be open at once — call before opening any of them.
 function closeAllToolbarPopups() {
  setShowFilter(false);
  setShowSort(false);
  setShowProperties(false);
  setShowAddView(false);
  setViewMenuTarget(null);
  setViewMenuRect(null);
  setShowLayoutPicker(false);
 }

 // The URL's ?view= param (kept in sync by switchView below) takes priority over the
 // database's stored default so that returning via browser back lands on the tab the
 // user was actually looking at, not always the first-created view.
 const urlView  = initViews.find((v) => v.id === searchParams.get("view"));
 const initView  = urlView ?? initViews.find((v) => v.id === defaultViewId) ?? initViews[0];
 const [activeViewId, setActiveViewId] = useState(initView?.id ?? "");
 const [viewSwitching, setViewSwitching] = useState(false);
 const activeView = views.find((v) => v.id === activeViewId) ?? views[0];

 // Lifted calendar navigation state so the "+New" button can target the viewed month
 const [calYear, setCalYear] = useState(() => new Date().getFullYear());
 const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

 const pageTitleRef  = useRef<HTMLInputElement>(null);
 const addViewRef   = useRef<HTMLDivElement>(null);
 const viewMenuRef  = useRef<HTMLDivElement>(null);
 const filterPanelRef = useRef<HTMLDivElement>(null);
 const sortPanelRef  = useRef<HTMLDivElement>(null);
 const propertiesPanelRef = useRef<HTMLDivElement>(null);
 const tableViewRef = useRef<HTMLDivElement>(null);
 const scrollAreaRef = useRef<HTMLDivElement>(null);
 const viewToolbarRef = useRef<HTMLDivElement>(null);
 // Measured (not calc(100dvh-Nrem)) since the cover/title/description above the toolbar are variable height; re-measured on resize.
 const [viewHeight, setViewHeight] = useState<number | null>(null);

 useLayoutEffect(() => {
  if (!["calendar", "gantt", "board"].includes(activeView?.type ?? "")) return;
  const scrollEl = scrollAreaRef.current;
  const toolbarEl = viewToolbarRef.current;
  if (!scrollEl || !toolbarEl) return;
  function measure() {
   // Add back scrollTop since getBoundingClientRect() deltas are viewport-relative, not relative to scroll content.
   const headerBottom = toolbarEl!.getBoundingClientRect().bottom
    - scrollEl!.getBoundingClientRect().top
    + scrollEl!.scrollTop;
   // Floor at 240 so a very short viewport still gets a usable board instead of collapsing to 0/negative.
   setViewHeight(Math.max(240, scrollEl!.clientHeight - headerBottom));
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

 // Select's dropdown and MultiOptionPicker (filter-bar.tsx) both portal to document.body,
 // so clicks inside were never `contains`ed by filterPanelRef/sortPanelRef — exclude both by data-slot.
 function isInsideSelectPortal(target: Node) {
  return target instanceof HTMLElement
   && !!target.closest('[data-slot="select-content"], [data-slot="multi-option-picker"]');
 }

 // While a Radix Select is open it sets pointer-events:none on body, so outside-click e.target resolves to <html> instead of the
 // panel — bail out here and let Radix's own pointerdown listener handle dismissing the Select without also closing the panel.
 function isRadixModalLayerOpen() {
  return document.body.style.pointerEvents === "none";
 }

 useEffect(() => {
  if (!showFilter) return;
  function h(e: MouseEvent) {
   const target = e.target as Node;
   if (isInsideSelectPortal(target) || isRadixModalLayerOpen()) return;
   if (filterPanelRef.current && !filterPanelRef.current.contains(target)) setShowFilter(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [showFilter]);

 useEffect(() => {
  if (!showSort) return;
  function h(e: MouseEvent) {
   const target = e.target as Node;
   if (isInsideSelectPortal(target) || isRadixModalLayerOpen()) return;
   if (sortPanelRef.current && !sortPanelRef.current.contains(target)) setShowSort(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [showSort]);

 useEffect(() => {
  if (!showProperties) return;
  function h(e: MouseEvent) {
   if (propertiesPanelRef.current && !propertiesPanelRef.current.contains(e.target as Node)) setShowProperties(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [showProperties]);

 // Lock scroll while the view menu is open: its position is a one-time snapshot, not re-measured on scroll.
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
   const target = e.target as HTMLElement;
   // Exclude the trigger button: mousedown fires before its own onClick toggle, so without this the menu would blink instead of closing.
   if (target.closest("[data-view-menu-trigger]")) return;
   if (viewMenuRef.current && !viewMenuRef.current.contains(target)) {
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

 // ── Auto-wire gantt start/end properties ──────────────────────────────────
 // When switching to a gantt view missing either date property, find or
 // create two DISTINCT Date properties ("Start date"/"End date") — reusing
 // the same property for both would collapse every bar to a single day.
 useEffect(() => {
  const view = activeView as unknown as { ganttStartPropertyId?: string | null; ganttEndPropertyId?: string | null } | null;
  if (activeView?.type !== "gantt") return;
  if (view?.ganttStartPropertyId && view?.ganttEndPropertyId) return;

  let cancelled = false;
  async function wire() {
   const dateProps = properties.filter((p) => p.type === "date");
   let startProp = dateProps[0] ?? null;
   let endProp = dateProps.find((p) => p.id !== startProp?.id) ?? null;

   if (!startProp) {
    const pRes = await fetch(`/api/databases/${page.id}/properties`, {
     method: "POST", headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name: "Start date", type: "date", config: {} }),
    });
    if (!pRes.ok || cancelled) return;
    startProp = await pRes.json() as DatabaseProperty;
    if (cancelled) return;
    setProperties((prev) => [...prev, startProp!]);
   }
   if (!endProp) {
    const pRes = await fetch(`/api/databases/${page.id}/properties`, {
     method: "POST", headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ name: "End date", type: "date", config: {} }),
    });
    if (!pRes.ok || cancelled) return;
    endProp = await pRes.json() as DatabaseProperty;
    if (cancelled) return;
    setProperties((prev) => [...prev, endProp!]);
   }

   const vRes = await fetch(`/api/databases/${page.id}/views/${activeView!.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ganttStartPropertyId: startProp!.id, ganttEndPropertyId: endProp!.id }),
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
   // Rules on the same property OR together (else two ANDed conditions on one property could never both be true); different properties still AND.
   const groups = new Map<string, FilterRule[]>();
   for (const rule of filterRules) {
    const group = groups.get(rule.propertyId);
    if (group) group.push(rule); else groups.set(rule.propertyId, [rule]);
   }
   result = result.filter((entry) => {
    const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
    return [...groups.entries()].every(([propertyId, rules]) => {
     const prop = properties.find((p) => p.id === propertyId);
     return rules.some((rule) => applyFilter(valMap.get(propertyId), rule, prop?.type ?? "text"));
    });
   });
  }
  if (sortRules.length > 0) {
   result.sort((a, b) => {
    for (const rule of sortRules) {
     const prop = properties.find((p) => p.id === rule.propertyId);
     const config = (prop?.config ?? {}) as { options?: { id: string; name: string }[] };
     // Name sorts off the entry's page title — it has no propertyValues row,
     // so there's nothing in entryValueMap to compare.
     const cmp = rule.propertyId === TITLE_SORT_ID
      ? compareVals({ text: a.title }, { text: b.title }, "text")
      : compareVals(
       entryValueMap.get(a.id)?.get(rule.propertyId),
       entryValueMap.get(b.id)?.get(rule.propertyId),
       prop?.type ?? "text",
       config.options,
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
  const targetView = views.find((v) => v.id === viewId);
  setFilterRules((targetView?.filters as unknown as FilterRule[] | undefined) ?? []);
  setSortRules((targetView?.sorts as unknown as SortRule[] | undefined) ?? []);
  setViewSwitching(true);
  const url = new URL(window.location.href);
  url.searchParams.set("view", viewId);
  router.replace(url.pathname + url.search, { scroll: false });
  try {
   const res = await fetch(`/api/databases/${page.id}/entries?viewId=${viewId}`);
   if (res.ok) {
    const data = await res.json() as {
     entries:    { id: string; shortId: string; title: string; orderIndex: number; icon: string | null; updatedAt: string | null; commentCount?: number }[];
     propertyValues: TemplateValue[];
    };
    setEntries(data.entries.map((e) => ({
     id: e.id, shortId: e.shortId, title: e.title, orderIndex: e.orderIndex, icon: e.icon, updatedAt: e.updatedAt, commentCount: e.commentCount,
    })));
    setValues(data.propertyValues);
   }
  } catch { /* keep current data */ }
  finally { setViewSwitching(false); }
 }

 // ── Entry actions ──────────────────────────────────────────────────────────

 const addEntry = useCallback(async (defaultValues?: Record<string, unknown>, title?: string) => {
  if (locked) return;
  const t = title?.trim() ?? "";
  let res: Response;
  try {
   res = await fetch(`/api/databases/${page.id}/entries`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body:  JSON.stringify({ title: t, defaultValues }),
   });
  } catch {
   toast.error("Failed to add entry — network error");
   return;
  }
  if (!res.ok) {
   toast.error("Failed to add entry");
   return;
  }
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
  return { id: e.id, shortId: e.shortId };
 }, [page.id, locked]);

 const saveTitle = useCallback(async (entryId: string, title: string) => {
  if (locked) return;
  const t = title.trim() || "Untitled";
  setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, title: t } : e));
  setEditingTitleId(null);
  await fetch(`/api/pages/${entryId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ title: t }),
  });
  window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: entryId, title: t } }));
  window.dispatchEvent(new CustomEvent("pages:refresh"));
  router.refresh();
 }, [router, locked]);

 const savePanelTitle = useCallback(async (entryId: string, title: string) => {
  if (locked) return;
  const t = title.trim() || "Untitled";
  setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, title: t } : e));
  await fetch(`/api/pages/${entryId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ title: t }),
  });
  window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: entryId, title: t } }));
  window.dispatchEvent(new CustomEvent("pages:refresh"));
  router.refresh();
 }, [router, locked]);

 const saveEntryIcon = useCallback(async (entryId: string, icon: string) => {
  if (locked) return;
  setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, icon } : e));
  await fetch(`/api/pages/${entryId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ icon }),
  });
  window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: entryId, icon } }));
  window.dispatchEvent(new CustomEvent("pages:refresh"));
  router.refresh();
 }, [router, locked]);

 const deleteEntry = useCallback(async (entryId: string) => {
  if (locked) return;
  setEntries((prev) => prev.filter((e) => e.id !== entryId));
  setSelectedIds((prev) => { const n = new Set(prev); n.delete(entryId); return n; });
  await fetch(`/api/pages/${entryId}`, { method: "DELETE" });
 }, [locked]);

 const deleteSelected = useCallback(async () => {
  if (locked) return;
  const ids = [...selectedIds];
  setDeletingSelected(true);
  try {
   await Promise.all(ids.map((id) => fetch(`/api/pages/${id}`, { method: "DELETE" })));
   setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
   setSelectedIds(new Set());
  } finally {
   setDeletingSelected(false);
   setConfirmDeleteSelected(false);
  }
 }, [selectedIds, locked]);

 const duplicateEntry = useCallback(async (entryId: string) => {
  if (locked) return;
  const res = await fetch(`/api/pages/${entryId}/duplicate`, { method: "POST" });
  if (!res.ok) return;
  const dup = await res.json() as { id: string; shortId: string; title: string; orderIndex: number; icon: string | null; updatedAt: string | null };
  setEntries((prev) => [...prev, { id: dup.id, shortId: dup.shortId, title: dup.title, orderIndex: dup.orderIndex, icon: dup.icon, updatedAt: dup.updatedAt }]);
  const dupValues = values
   .filter((v) => v.entryId === entryId)
   .map((v) => ({ ...v, id: crypto.randomUUID(), entryId: dup.id }));
  if (dupValues.length) setValues((prev) => [...prev, ...dupValues]);
 }, [values, locked]);

 const updatePropValue = useCallback(async (entryId: string, propId: string, value: unknown) => {
  if (locked) return;
  setValues((prev) => {
   const idx = prev.findIndex((v) => v.entryId === entryId && v.propertyId === propId);
   if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], value }; return n; }
   return [...prev, { id: crypto.randomUUID(), entryId, propertyId: propId, value }];
  });
  await fetch(`/api/entries/${entryId}/property-values/${propId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ value }),
  });
  window.dispatchEvent(new CustomEvent("workflik:entry-value-changed", { detail: { entryId, propertyId: propId, value } }));
  // Busts the Next.js client router cache so a page navigated to next (e.g.
  // this entry's own page) re-fetches fresh server data instead of reusing
  // whatever was cached before this edit.
  router.refresh();
 }, [router, locked]);

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

 const addProperty = useCallback(async (name: string, type: string, config?: Record<string, unknown>, twoWay?: boolean) => {
  if (locked) return;
  const resolvedConfig = config ?? ((type === "select" || type === "multi_select") ? { options: [] } : {});
  const res = await fetch(`/api/databases/${page.id}/properties`, {
   method: "POST", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ name, type, config: resolvedConfig, twoWay }),
  });
  if (!res.ok) return;
  const prop = await res.json() as DatabaseProperty;
  setProperties((prev) => [...prev, prop]);
 }, [page.id, locked]);

 const renameProperty = useCallback(async (propId: string, name: string) => {
  if (locked) return;
  setProperties((prev) => prev.map((p) => p.id === propId ? { ...p, name } : p));
  await fetch(`/api/databases/${page.id}/properties/${propId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ name }),
  });
 }, [page.id, locked]);

 const updateProperty = useCallback(async (propId: string, patch: Record<string, unknown>) => {
  if (locked) return;
  setProperties((prev) => prev.map((p) => p.id === propId ? { ...p, ...patch } as DatabaseProperty : p));
  await fetch(`/api/databases/${page.id}/properties/${propId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify(patch),
  });
  // A type change reshapes the stored value, so refetch — otherwise cells render blank (stale shape) until the next full page load.
  if (patch.type && activeView) {
   try {
    const res = await fetch(`/api/databases/${page.id}/entries?viewId=${activeView.id}`);
    if (res.ok) {
     const data = await res.json() as {
      entries:    { id: string; shortId: string; title: string; orderIndex: number; icon: string | null; updatedAt: string | null; commentCount?: number }[];
      propertyValues: TemplateValue[];
     };
     setEntries(data.entries.map((e) => ({
      id: e.id, shortId: e.shortId, title: e.title, orderIndex: e.orderIndex, icon: e.icon, updatedAt: e.updatedAt, commentCount: e.commentCount,
     })));
     setValues(data.propertyValues);
    }
   } catch { /* keep current data */ }
  }
 }, [page.id, locked, activeView]);

 const deleteProperty = useCallback(async (propId: string) => {
  if (locked) return;
  setProperties((prev) => prev.filter((p) => p.id !== propId));
  setValues((prev) => prev.filter((v) => v.propertyId !== propId));
  await fetch(`/api/databases/${page.id}/properties/${propId}`, { method: "DELETE" });
 }, [page.id, locked]);

 const updateView = useCallback(async (patch: Record<string, unknown>) => {
  if (locked) return;
  if (!activeView) return;
  const viewId = activeView.id;
  setViews((prev) => prev.map((v) => v.id === viewId ? { ...v, ...patch } as DatabaseView : v));
  await fetch(`/api/databases/${page.id}/views/${viewId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify(patch),
  });
 }, [page.id, activeView, locked]);

 const addView = useCallback(async (name: string, type: string) => {
  if (locked) return;
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
 }, [page.id, properties, locked]);

 const deleteView = useCallback(async (viewId: string) => {
  if (locked) return;
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
 }, [page.id, views, activeViewId, locked]);

 const renameView = useCallback(async (viewId: string, name: string) => {
  if (locked) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  setViews((prev) => prev.map((v) => v.id === viewId ? { ...v, name: trimmed } : v));
  setRenamingViewId(null);
  await fetch(`/api/databases/${page.id}/views/${viewId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ name: trimmed }),
  });
 }, [page.id, locked]);

 // Changes an existing view's layout (distinct from addView, which creates a fresh one). Board grouping is auto-wired by the effect above.
 const changeViewType = useCallback(async (viewId: string, type: string) => {
  if (locked) return;
  setViews((prev) => prev.map((v) => v.id === viewId ? { ...v, type } as DatabaseView : v));
  setShowLayoutPicker(false);
  setViewMenuTarget(null);
  setViewMenuRect(null);
  await fetch(`/api/databases/${page.id}/views/${viewId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ type }),
  });
 }, [page.id, locked]);

 const duplicateView = useCallback(async (viewId: string) => {
  if (locked) return;
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
 }, [page.id, views, locked]);

 const togglePropertyVisibility = useCallback(async (propId: string, hidden: boolean) => {
  if (locked) return;
  setProperties((prev) => prev.map((p) => p.id === propId ? { ...p, isHidden: hidden } : p));
  await fetch(`/api/databases/${page.id}/properties/${propId}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ isHidden: hidden }),
  });
 }, [page.id, locked]);

 // ── Page meta ──────────────────────────────────────────────────────────────

 async function savePageTitle(title: string) {
  if (locked) return;
  const t = title.trim() || "Untitled";
  setPageTitle(t);
  setEditingPageTitle(false);
  await fetch(`/api/pages/${page.id}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ title: t }),
  });
  window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: page.id, title: t } }));
  window.dispatchEvent(new CustomEvent("pages:refresh"));
  router.refresh();
 }

 async function savePageIcon(icon: string) {
  if (locked) return;
  setPageIcon(icon || null);
  await fetch(`/api/pages/${page.id}`, {
   method: "PATCH", headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ icon: icon || null }),
  });
  window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: page.id, icon: icon || null } }));
  window.dispatchEvent(new CustomEvent("pages:refresh"));
  router.refresh();
 }

 async function savePageCover(coverUrl: string) {
  if (locked) return;
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
  <div className={"flex h-full flex-col overflow-hidden bg-card"}>

   {/* Breadcrumbs + actions */}
   <PagePrivacyProvider initialIsPrivate={isPrivate}>
   <div className="flex h-11 shrink-0 items-center justify-between bg-background px-3">
    <nav className="flex min-w-0 items-center gap-0.5 text-xs">
     <Link
      href={`/app/${workspaceSlug}`}
      className="flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
     >
      <HouseIcon size={13} />
      <span className="font-medium">{workspaceName}</span>
     </Link>

     {navSource && (() => {
      const label = pageNavSourceLabel(navSource);
      const href  = pageNavSourceHref(navSource, workspaceSlug);
      return (
       <span className="flex min-w-0 items-center gap-0.5">
        <CaretRightIcon size={11} className="shrink-0 text-foreground/30" />
        {href ? (
         <Link
          href={href}
          className="max-w-30 truncate rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
         >
          {label}
         </Link>
        ) : (
         <span className="max-w-30 truncate px-2 py-1 text-xs text-muted-foreground">
          {label}
         </span>
        )}
       </span>
      );
     })()}

     {breadcrumbs.map((crumb) => (
      <span key={crumb.shortId} className="flex min-w-0 items-center gap-0.5">
       <CaretRightIcon size={11} className="shrink-0 text-foreground/30" />
       <Link
        href={`/app/${workspaceSlug}/${crumb.shortId}`}
        className="max-w-30 truncate rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
       >
        {crumb.title}
       </Link>
      </span>
     ))}

     <span className="flex min-w-0 items-center gap-0.5">
      <CaretRightIcon size={11} className="shrink-0 text-foreground/30" />
      <span className="max-w-60 truncate px-2 py-1 text-xs font-semibold text-foreground/80">
       {pageTitle || "Untitled"}
      </span>
     </span>
     <PagePrivacyPill />
    </nav>

    {/* Action buttons — same as page editor */}
    <div className="ml-2 flex shrink-0 items-center gap-1">
     {page.updatedAt && (
      <span className="mr-1.5 whitespace-nowrap text-xs text-muted-foreground">
       Edited <TimeAgo iso={page.updatedAt} />
      </span>
     )}
     <ShareButton
      pageId={page.id}
      pageShortId={page.shortId}
      workspaceSlug={workspaceSlug}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserEmail={currentUserEmail}
      currentUserImage={currentUserImage}
      isEditor={isEditor}
     />
     <CopyLinkButton pageId={page.id} />
     <PageSearchButton />
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
       parentShortId={breadcrumbs[breadcrumbs.length - 1]?.shortId ?? null}
       rootFallbackShortId={rootFallbackShortId}
       iconOnly
      />
     )}
    </div>
   </div>
   </PagePrivacyProvider>

   {/* Scrollable area: cover + header + sticky toolbar + view */}
   <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">

   {/* Cover */}
   {pageCoverUrl && (
    <div className="group/cover relative h-70 w-full">
     {isCoverGradient
      ? <div className="h-full w-full" style={{ background: pageCoverUrl }} />
      // eslint-disable-next-line @next/next/no-img-element
      : <img src={pageCoverUrl} alt="" className="h-full w-full object-cover" />
     }
     {!locked && (
     <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 transition-opacity group-hover/cover:opacity-100">
      <div className="relative">
       <button
        onClick={() => { setShowCoverPicker((p) => !p); setShowIconPicker(false); }}
        className="rounded-sm bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
       >
        Change cover
       </button>
       {showCoverPicker && (
        <CoverPicker
         pageId={page.id}
         workspaceId={workspaceId}
         onSelect={(url) => { setShowCoverPicker(false); savePageCover(url); }}
         onRemove={() => { setShowCoverPicker(false); setRemoveCoverConfirm(true); }}
         onClose={() => setShowCoverPicker(false)}
        />
       )}
      </div>
      <button onClick={() => setRemoveCoverConfirm(true)}
       className="rounded-sm bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition-colors">
       Remove
      </button>
     </div>
     )}
    </div>
   )}

   {/* Page header */}
   <div className="relative mx-auto w-full max-w-275 px-8 pb-2 pt-6">

    {lockedBanner}

    {/* Subtle action buttons row (Add icon / Add cover) */}
    <div className="mb-2 flex items-center gap-1">
     {!pageIcon && !locked && (
      <div className="relative">
       <button
        ref={iconBtnRef}
        onClick={() => { setShowIconPicker((p) => !p); setShowCoverPicker(false); }}
        className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
       >
        <SmileyStickerIcon size={13} /> Add icon
       </button>
       {showIconPicker && (
        <IconPicker
         onSelect={(v) => { savePageIcon(v); setShowIconPicker(false); }}
         onIconPreview={(v) => savePageIcon(v)}
         onClose={() => setShowIconPicker(false)}
         workspaceId={workspaceId}
         pageId={page.id}
         triggerRef={iconBtnRef}
        />
       )}
      </div>
     )}
     {!pageCoverUrl && !locked && (
      <div className="relative">
       <button
        onClick={() => { setShowCoverPicker((p) => !p); setShowIconPicker(false); }}
        className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
       >
        <ImageIcon size={13} /> Add cover
       </button>
       {showCoverPicker && (
        <CoverPicker
         pageId={page.id}
         workspaceId={workspaceId}
         onSelect={(url) => { setShowCoverPicker(false); savePageCover(url); }}
         onRemove={() => { setShowCoverPicker(false); setRemoveCoverConfirm(true); }}
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
        ref={iconBtnRef}
        onClick={() => { if (locked) return; setShowIconPicker((p) => !p); setShowCoverPicker(false); }}
        className="flex size-12 items-center justify-center rounded-md transition-all hover:bg-muted/50"
       >
        <PageIcon icon={pageIcon} size={48} />
       </button>
       {showIconPicker && (
        <IconPicker
         onSelect={(v) => { savePageIcon(v); setShowIconPicker(false); }}
         onIconPreview={(v) => savePageIcon(v)}
         onRemove={() => { savePageIcon(""); setShowIconPicker(false); }}
         onClose={() => setShowIconPicker(false)}
         workspaceId={workspaceId}
         pageId={page.id}
         triggerRef={iconBtnRef}
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
        onChange={(e) => {
         setPageTitle(e.target.value);
         window.dispatchEvent(new CustomEvent("workflik:page-title-changed", { detail: { pageId: page.id, title: e.target.value } }));
        }}
        onBlur={(e) => savePageTitle(e.target.value)}
        onKeyDown={(e) => {
         if (e.key === "Enter") savePageTitle((e.target as HTMLInputElement).value);
         if (e.key === "Escape") setEditingPageTitle(false);
        }}
        className="w-full bg-transparent text-4xl font-bold tracking-tight text-foreground outline-none"
       />
      ) : (
       <h1
        onClick={() => { if (!locked) setEditingPageTitle(true); }}
        className={`-mx-1 rounded px-1 text-4xl font-bold tracking-tight text-foreground transition-colors ${locked ? "" : "cursor-text hover:bg-muted/30"}`}
       >
        {pageTitle || <span className="text-muted-foreground">Untitled</span>}
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
        className="mt-1 w-full resize-none overflow-hidden bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground-subtle"
       />
      ) : (
       <p
        onClick={() => setEditingDescription(true)}
        className="-mx-1 mt-1 cursor-text rounded px-1 text-sm text-muted-foreground transition-colors hover:bg-muted/30"
       >
        {pageDescription || <span className="text-muted-foreground">Add a description…</span>}
       </p>
      )}
     </div>
    </div>
   </div>

   {/* View tabs + toolbar — sticky so it stays visible as cover/header scroll away */}
   <div ref={viewToolbarRef} className="sticky top-0 z-20 bg-card">
   <div className="mx-auto flex max-w-275 items-end justify-between border-b border-border px-8">
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
           className="h-7 w-28 rounded-sm border border-primary/40 bg-background px-2 text-sm focus:outline-none"
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
         data-view-menu-trigger
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
          "flex size-5 items-center justify-center rounded-xs transition-colors",
          menuOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
         ].join(" ")}>
          <MoreVerticalIcon size={13} />
         </span>
        </button>
       </div>
      );
     })}

     {/* Add a view */}
     {!locked && (
     <div ref={addViewRef} className="relative mb-1 ml-1">
      <button
       onClick={() => { const next = !showAddView; closeAllToolbarPopups(); setShowAddView(next); }}
       onMouseEnter={(e) => showTooltip("Add a view", e)}
       onMouseLeave={hideTooltip}
       className={[
        "flex size-6.5 items-center justify-center rounded-sm border transition-all",
        showAddView
         ? "border-primary bg-primary/10 text-primary"
         : "border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
       ].join(" ")}
      >
       <PlusIcon size={14} />
      </button>
      {showAddView && (
       <div className="absolute left-0 top-full z-400 mt-1.5 w-[calc(100vw-24px)] max-w-80 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
         <PlusIcon size={13} className="text-primary" />
         <span className="text-sm font-semibold text-foreground">Add a new view</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-3">
         {([
          { type: "table",  label: "Table",  Icon: TableIcon },
          { type: "board",  label: "Board",  Icon: SquaresFourIcon },
          { type: "calendar", label: "Calendar", Icon: CalendarIcon },
          { type: "gallery", label: "Gallery", Icon: GridFourIcon },
         ] as const).map(({ type, label, Icon }) => {
          // Each view type can only exist once — a second view of the same
          // type would render with the same default name (two indistinguishable
          // "Board" tabs), so block re-adding a type that's already present
          // instead of letting that happen.
          const alreadyAdded = views.some((v) => v.type === type);
          return (
          <button
           key={type}
           disabled={alreadyAdded}
           onClick={() => { if (alreadyAdded) return; addView(label, type); setShowAddView(false); }}
           onMouseEnter={(e) => { if (alreadyAdded) showTooltip(`${label} view already added`, e); }}
           onMouseLeave={hideTooltip}
           className={[
            "group flex flex-col items-center gap-2 rounded-md px-2 py-3 text-center transition-all",
            alreadyAdded ? "cursor-not-allowed opacity-40" : "hover:bg-primary/5 active:scale-[0.96]",
           ].join(" ")}
          >
           <div className={[
            "flex size-12 items-center justify-center rounded-md border border-border bg-muted/50 transition-all",
            alreadyAdded ? "" : "group-hover:border-primary/40 group-hover:bg-primary/10",
           ].join(" ")}>
            <Icon size={24} className={`text-foreground/70 transition-colors ${alreadyAdded ? "" : "group-hover:text-primary"}`} />
           </div>
           <span className={`text-xs font-medium leading-tight text-muted-foreground transition-colors ${alreadyAdded ? "" : "group-hover:text-primary"}`}>
            {label}
           </span>
          </button>
          );
         })}
        </div>
       </div>
      )}
     </div>
     )}
    </div>

    <div className="mb-1 flex shrink-0 items-center gap-0.5">
     <div ref={filterPanelRef} className="relative">
      <button
       onClick={() => { const next = !showFilter; closeAllToolbarPopups(); setShowFilter(next); }}
       className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors ${activeFilterCount > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
      >
       <FunnelIcon size={13} />
       Filter
       {activeFilterCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{activeFilterCount}</span>}
      </button>
      {showFilter && (
       <FilterPanel
        properties={properties}
        filters={filterRules}
        onChange={(next) => { setFilterRules(next); updateView({ filters: next }); }}
        onClear={() => { setFilterRules([]); updateView({ filters: [] }); }}
        onClose={() => setShowFilter(false)}
       />
      )}
     </div>

     <div ref={sortPanelRef} className="relative">
      <button
       onClick={() => { const next = !showSort; closeAllToolbarPopups(); setShowSort(next); }}
       className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors ${activeSortCount > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
      >
       <SortAscendingIcon size={13} />
       Sort
       {activeSortCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{activeSortCount}</span>}
      </button>
      {showSort && (
       <SortPanel
        properties={properties}
        sorts={sortRules}
        onChange={(next) => { setSortRules(next); updateView({ sorts: next }); }}
        onClear={() => { setSortRules([]); updateView({ sorts: [] }); }}
        onClose={() => setShowSort(false)}
       />
      )}
     </div>

     <div ref={propertiesPanelRef} className="relative">
      <button
       onClick={() => { const next = !showProperties; closeAllToolbarPopups(); setShowProperties(next); }}
       className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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

     <div className="mx-1 h-4 w-px bg-border" />

     <button
      ref={newButtonRef}
      data-new-entry-button
      onClick={async () => {
       let defaultValues: Record<string, unknown> | undefined;
       if (activeView?.type === "calendar") {
        const calPropId = activeView.calendarPropertyId
         ?? properties.find((p) => p.type === "date")?.id;
        if (calPropId) {
         const now = new Date();
         const pad = (n: number) => String(n).padStart(2, "0");
         // If user is viewing the current month use today; otherwise use 1st of viewed month
         const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();
         const day = isCurrentMonth ? now.getDate() : 1;
         defaultValues = { [calPropId]: { date: `${calYear}-${pad(calMonth + 1)}-${pad(day)}` } };
        }
       } else if (activeView?.type === "gantt") {
        const view = activeView as unknown as { ganttStartPropertyId?: string | null; ganttEndPropertyId?: string | null };
        const startPropId = view.ganttStartPropertyId ?? properties.find((p) => p.type === "date")?.id;
        const endPropId = view.ganttEndPropertyId ?? startPropId;
        if (startPropId && endPropId) {
         const now = new Date();
         const pad = (n: number) => String(n).padStart(2, "0");
         const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
         defaultValues = { [startPropId]: { date: today }, [endPropId]: { date: today } };
        }
       }
       const entry = await addEntry(defaultValues);
       if (entry) router.push(`/app/${workspaceSlug}/${entry.shortId}`);
      }}
      disabled={locked}
      className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
     >
      <PlusIcon size={12} />
      New
     </button>
    </div>
   </div>
   </div>

   {/* Bulk action bar */}
   {selectedIds.size > 0 && (
    <div className="border-b border-border bg-primary/5">
    <div className="mx-auto flex max-w-275 items-center gap-3 px-6 py-2">
     <span className="text-sm font-medium">
      {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
     </span>
     <button
      onClick={() => setConfirmDeleteSelected(true)}
      className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
     >
      <TrashIcon size={12} /> Delete
     </button>
     <button
      onClick={() => setSelectedIds(new Set())}
      className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
     >
      <XIcon size={12} /> Cancel
     </button>
    </div>
    </div>
   )}

   {/* View */}
   {/* Calendar gets minHeight, not height: viewHeight is "whatever is left
       below the header", which a cover banner (or zooming in) can squeeze to
       almost nothing — as a hard height that squashed every week row until the
       day cells clipped their own contents. As a minimum it still fills the
       space exactly when there's room, but lets the month grow taller than the
       viewport and the page scroll when there isn't. Gantt/board keep the hard
       height: they scroll internally instead. */}
   <div
    className={`relative ${activeView?.type === "board" ? "flex flex-col overflow-hidden" : ""} ${activeView?.type === "calendar" ? "flex flex-col" : ""}`}
    style={
     activeView?.type === "calendar"
      ? { minHeight: viewHeight ?? "calc(100dvh - 6rem)" }
      : ["gantt", "board"].includes(activeView?.type ?? "")
      ? { height: viewHeight ?? "calc(100dvh - 6rem)" }
      : undefined
    }
   >
    {viewSwitching && (
     <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
     </div>
    )}
    <div
     ref={tableViewRef}
     className={`mx-auto w-full max-w-275 ${activeView?.type === "table" ? "overflow-x-auto template-hscroll" : ""} ${activeView?.type === "calendar" ? "flex flex-1 flex-col" : ""} ${activeView?.type === "gantt" ? "h-full" : ""} ${activeView?.type === "board" ? "flex min-h-0 flex-1 flex-col" : ""}`}
    >
    {activeView?.type === "board" ? (
     <TemplateBoardView
      entries={displayedEntries}
      properties={properties}
      activeView={activeView}
      entryValueMap={entryValueMap}
      databaseId={page.id}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      locked={locked}
      onAddEntry={async (dv, t) => addEntry(dv, t)}
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
      locked={locked}
      year={calYear}
      month={calMonth}
      onYearChange={setCalYear}
      onMonthChange={setCalMonth}
      onAddEntry={async (dv) => { await addEntry(dv); }}
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
      locked={locked}
      onAddEntry={async (dv) => { await addEntry(dv); }}
      onDeleteEntry={deleteEntry}
      onDuplicateEntry={duplicateEntry}
      onClickEntry={handleClickEntry}
      onSaveTitle={saveTitle}
      onUpdateEntryIcon={saveEntryIcon}
      onUpdatePropValue={updatePropValue}
      onUpdateProperty={updateProperty}
      onUpdateView={updateView}
     />
    ) : activeView?.type === "gantt" ? (
     <TemplateGanttView
      entries={displayedEntries}
      properties={properties}
      activeView={activeView}
      entryValueMap={entryValueMap}
      databaseId={page.id}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      locked={locked}
      onAddEntry={async (dv) => { await addEntry(dv); }}
      onDeleteEntry={deleteEntry}
      onDuplicateEntry={duplicateEntry}
      onUpdateEntryIcon={saveEntryIcon}
      onClickEntry={handleClickEntry}
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
      databaseId={page.id}
      locked={locked}
      selectedIds={selectedIds}
      editingTitleId={editingTitleId}
      onToggleSelect={toggleSelect}
      onToggleSelectAll={toggleSelectAll}
      onAddEntry={async (dv) => { await addEntry(dv); }}
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
   showLayoutPicker ? (
    <div
     ref={viewMenuRef}
     style={{
      position: "fixed",
      top: getClampedTop(viewMenuRect, 200),
      left: getClampedLeft(viewMenuRect, 320, { align: "start" }),
      zIndex: 500,
     }}
     className="w-[calc(100vw-24px)] max-w-80 overflow-hidden rounded-lg border border-border bg-card"
    >
     <button
      onClick={() => setShowLayoutPicker(false)}
      className="flex w-full items-center gap-2 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent"
     >
      <ChevronLeftIcon size={14} className="text-muted-foreground" />
      <span className="truncate text-sm font-semibold text-foreground">Layout — {viewMenuTarget.name}</span>
     </button>
     <div className="grid grid-cols-4 gap-1.5 p-3">
      {([
       { type: "table",  label: "Table",  Icon: TableIcon },
       { type: "board",  label: "Board",  Icon: SquaresFourIcon },
       { type: "calendar", label: "Calendar", Icon: CalendarIcon },
       { type: "gallery", label: "Gallery", Icon: GridFourIcon },
      ] as const).map(({ type, label, Icon }) => {
       const isActive = viewMenuTarget.type === type;
       return (
        <button
         key={type}
         onClick={() => changeViewType(viewMenuTarget.id, type)}
         className="group flex flex-col items-center gap-2 rounded-md px-2 py-3 text-center transition-all hover:bg-primary/5 active:scale-[0.96]"
        >
         <div className={[
          "flex size-12 items-center justify-center rounded-md border transition-all",
          isActive ? "border-primary/40 bg-primary/10" : "border-border bg-muted/50 group-hover:border-primary/40 group-hover:bg-primary/10",
         ].join(" ")}>
          <Icon size={24} className={isActive ? "text-primary" : "text-foreground/70 transition-colors group-hover:text-primary"} />
         </div>
         <span className={[
          "flex items-center gap-1 text-xs font-medium leading-tight transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary",
         ].join(" ")}>
          {isActive && <CheckIcon size={10} />}
          {label}
         </span>
        </button>
       );
      })}
     </div>
    </div>
   ) : (
   <div
    ref={viewMenuRef}
    style={{
     position: "fixed",
     top: getClampedTop(viewMenuRect, views.length > 1 ? 174 : 121),
     left: getClampedLeft(viewMenuRect, 192, { align: "start" }),
     zIndex: 500,
    }}
    className="w-48 overflow-hidden rounded-md border border-border bg-popover p-1"
   >
    <button
     onClick={() => {
      setRenamingViewId(viewMenuTarget.id);
      setRenamingViewName(viewMenuTarget.name);
      setViewMenuTarget(null); setViewMenuRect(null);
     }}
     className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    >
     <PencilIcon size={13} className="shrink-0 text-muted-foreground" /> Rename
    </button>
    <button
     onClick={() => setShowLayoutPicker(true)}
     className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    >
     <SquaresFourIcon size={13} className="shrink-0 text-muted-foreground" /> Layout
    </button>
    <button
     onClick={() => { duplicateView(viewMenuTarget.id); setViewMenuTarget(null); setViewMenuRect(null); }}
     className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
    >
     <CopyIcon size={13} className="shrink-0 text-muted-foreground" /> Duplicate view
    </button>
    {views.length > 1 && (
     <>
      <div className="my-1 h-px bg-border" />
      <button
       onClick={() => { setDeleteViewTarget(viewMenuTarget); setViewMenuTarget(null); setViewMenuRect(null); }}
       className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
       <TrashIcon size={13} className="shrink-0" /> Delete view
      </button>
     </>
    )}
   </div>
   ),
   document.body
  )}

  {/* ── Remove cover confirmation ── */}
  <ConfirmDialog
   open={removeCoverConfirm}
   onOpenChange={setRemoveCoverConfirm}
   title="Remove cover image?"
   description="This removes the cover photo from this page. You can add a new one anytime."
   confirmLabel="Remove"
   onConfirm={() => savePageCover("")}
  />

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

  {/* ── Delete selected entries confirmation ── */}
  <ConfirmDialog
   open={confirmDeleteSelected}
   onOpenChange={(o) => !o && setConfirmDeleteSelected(false)}
   title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? "entry" : "entries"}?`}
   description="They will be moved to Trash and permanently deleted after 30 days."
   confirmLabel="Delete"
   confirmLoadingLabel="Deleting…"
   loading={deletingSelected}
   onConfirm={deleteSelected}
  />
  {tooltip && typeof document !== "undefined" && createPortal(
   <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
   document.body,
  )}
  </>
 );
}
