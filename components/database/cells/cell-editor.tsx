"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { Check, Plus, Settings2, X, UserPlus, ChevronRight, Loader2, ArrowLeft, MoreHorizontal, GripVertical } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OPTION_COLORS, getOptionColor, groupOptions } from "@/components/database/property-registry";
import { OptionSubmenu } from "@/components/database/option-submenu";
import { Calendar } from "@/components/ui/calendar";
import type { DbProperty, DbPropertyConfig, SelectOption, StatusGroupKey, WorkspaceMember } from "@/components/database/types";
import { createId } from "@paralleldrive/cuid2";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";

interface CellEditorProps {
 property: DbProperty;
 value: unknown;
 cellRect: DOMRect;
 workspaceId: string;
 onSave: (value: unknown) => void;
 onClose: () => void;
 onPropertyConfigChange?: (propId: string, config: DbPropertyConfig) => void;
 onEditProperty?: (rect: DOMRect) => void;
 /** Overrides the popover's stacking order — used when it's cascaded beside
  *  another already-open, higher-z-indexed menu (e.g. the calendar entry
  *  context menu's "Edit property" flyout) so it doesn't render behind it. */
 zIndex?: number;
 /** Hides the select/multi-select search-or-create input — used in the
  *  calendar entry context menu's cascading flyout, which just needs quick
  *  value toggling, not search/creation. */
 hideSearch?: boolean;
}

export function CellEditorPopover(props: CellEditorProps) {
 const [mounted, setMounted] = useState(false);
 useEffect(() => { setMounted(true); }, []);
 if (!mounted) return null;
 return createPortal(<CellEditorInner {...props} />, document.body);
}

function CellEditorInner({ property, value, cellRect, workspaceId, onSave, onClose, onPropertyConfigChange, onEditProperty, zIndex = 200, hideSearch }: CellEditorProps) {
 const ref = useRef<HTMLDivElement>(null);

 const winH = window.innerHeight;
 const winW = window.innerWidth;
 const MARGIN = 8;
 const spaceBelow = winH - cellRect.bottom - MARGIN;
 const spaceAbove = cellRect.top - MARGIN;
 // Prefer below; flip above if significantly more space there
 const openBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
 // Capped, not just floored — most editors here (date/person/relation) have a
 // small, fixed content height and never actually grow to fill all available
 // space the way SelectEditor's scrollable list can. Using the full
 // `spaceAbove` when flipping above a trigger near the bottom of a tall page
 // pinned `top` to ~0 regardless of the editor's real height, since `top` is
 // computed as if the editor WILL be `maxH` tall.
 const maxH = Math.min(Math.max(openBelow ? spaceBelow : spaceAbove, 160), 420);
 const top  = openBelow
  ? cellRect.bottom + 4
  : Math.max(MARGIN, cellRect.top - Math.min(maxH, spaceAbove) - 4);
 const left = Math.min(Math.max(MARGIN, cellRect.left), winW - 260 - MARGIN);

 useEffect(() => {
  function handler(e: MouseEvent) {
   const target = e.target as HTMLElement;
   // OptionSubmenu (rename/delete/recolor) is its own separate createPortal
   // call, not a DOM descendant of this popover's own ref — without this
   // exemption, any click inside it (or any alertdialog it opens) reads as
   // "outside" and closes this whole popover out from under it.
   if (target.closest?.('[role="alertdialog"], [data-edit-property-exempt]')) return;
   if (ref.current && !ref.current.contains(target)) onClose();
  }
  function keyHandler(e: KeyboardEvent) {
   if (e.key === "Escape") onClose();
  }
  document.addEventListener("mousedown", handler);
  document.addEventListener("keydown", keyHandler);
  return () => {
   document.removeEventListener("mousedown", handler);
   document.removeEventListener("keydown", keyHandler);
  };
 }, [onClose]);

 // `cellRect` is a one-time snapshot of the trigger cell, which almost always
 // lives inside a scrollable table/board/panel — lock scroll while open so
 // this can't drift away from the cell it's editing.
 useScrollLockWhileOpen(true, (target) =>
  !!ref.current?.contains(target) || !!target.closest?.('[data-edit-property-exempt]'));

 const baseStyle: React.CSSProperties = {
  position: "fixed",
  top,
  left,
  maxHeight: maxH,
  zIndex,
  minWidth: 240,
  maxWidth: 320,
  display: "flex",
  flexDirection: "column",
 };

 return (
  <div ref={ref} data-edit-property-exempt style={baseStyle} className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background">
   {(property.type === "select" || property.type === "status" || property.type === "multi_select") && (
    <SelectEditor
     property={property}
     value={value}
     multi={property.type === "multi_select"}
     onSave={onSave}
     onClose={onClose}
     onConfigChange={onPropertyConfigChange ? (cfg) => onPropertyConfigChange(property.id, cfg) : undefined}
     onEditProperty={onEditProperty ? (rect) => { onEditProperty(rect); onClose(); } : undefined}
     hideSearch={hideSearch}
    />
   )}
   {property.type === "date" && (
    <DateEditor value={value} property={property} onSave={onSave} onClose={onClose} />
   )}
   {property.type === "person" && (
    <PersonEditor value={value} workspaceId={workspaceId} onSave={onSave} />
   )}
   {property.type === "relation" && (
    <RelationEditor value={value} property={property} onSave={onSave} />
   )}
  </div>
 );
}

// ── Select / Multi-select ────────────────────────────────────────────────────

interface SelectEditorProps {
 property: DbProperty;
 value: unknown;
 multi: boolean;
 onSave: (value: unknown) => void;
 onClose: () => void;
 onConfigChange?: (config: DbPropertyConfig) => void;
 onEditProperty?: (rect: DOMRect) => void;
 hideSearch?: boolean;
}

function SelectEditor({ property, value, multi, onSave, onClose, onConfigChange, onEditProperty, hideSearch }: SelectEditorProps) {
 const currentId = multi ? null : ((value as { optionId?: string } | null)?.optionId ?? null);
 const currentIds = multi ? ((value as { optionIds?: string[] } | null)?.optionIds ?? []) : [];
 const [options, setOptions]  = useState<SelectOption[]>((property.config?.options ?? []) as SelectOption[]);
 const [search, setSearch]   = useState("");
 const [optionMenu, setOptionMenu] = useState<{ opt: SelectOption; rect: DOMRect } | null>(null);
 const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

 const filtered = options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));
 const canCreate = search.trim() && !options.some((o) => o.name.toLowerCase() === search.trim().toLowerCase());

 function toggle(optId: string) {
  if (multi) {
   const next = currentIds.includes(optId)
    ? currentIds.filter((id) => id !== optId)
    : [...currentIds, optId];
   onSave({ optionIds: next });
  } else {
   onSave({ optionId: optId === currentId ? null : optId });
   onClose();
  }
 }

 function saveOptionsConfig(newOptions: SelectOption[]) {
  const newConfig = { ...property.config, options: newOptions };
  fetch(`/api/databases/${property.databaseId}/properties/${property.id}`, {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ config: newConfig }),
  }).catch(() => {});
  onConfigChange?.(newConfig);
 }

 function createOption(group?: StatusGroupKey) {
  const name = search.trim();
  if (!name) return;
  const newOpt: SelectOption = { id: createId(), name, color: "gray", group };
  const newOptions = [...options, newOpt];
  setOptions(newOptions);
  saveOptionsConfig(newOptions);
  if (multi) {
   onSave({ optionIds: [...currentIds, newOpt.id] });
  } else {
   onSave({ optionId: newOpt.id });
   onClose();
  }
  setSearch("");
 }

 function quickAddOption(group?: StatusGroupKey) {
  const newOpt: SelectOption = { id: createId(), name: "Option", color: OPTION_COLORS[options.length % OPTION_COLORS.length].id, group };
  const newOptions = [...options, newOpt];
  setOptions(newOptions);
  saveOptionsConfig(newOptions);
 }

 function recolorOption(optId: string, color: string) {
  const newOptions = options.map((o) => (o.id === optId ? { ...o, color } : o));
  setOptions(newOptions);
  saveOptionsConfig(newOptions);
 }

 function renameOption(optId: string, newName: string) {
  const newOptions = options.map((o) => (o.id === optId ? { ...o, name: newName } : o));
  setOptions(newOptions);
  saveOptionsConfig(newOptions);
 }

 function deleteOption(optId: string) {
  const newOptions = options.filter((o) => o.id !== optId);
  setOptions(newOptions);
  saveOptionsConfig(newOptions);
  // Clear it from this entry's own value too, if it was set — otherwise the
  // value would keep pointing at an option id that no longer exists.
  if (multi) {
   if (currentIds.includes(optId)) onSave({ optionIds: currentIds.filter((id) => id !== optId) });
  } else if (currentId === optId) {
   onSave({ optionId: null });
  }
 }

 // Reordering only makes real sense against the FULL option set — while
 // actively searching, the visible subset's positions don't map cleanly onto
 // it, so dragging is disabled until the search is cleared.
 function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIndex = options.findIndex((o) => o.id === active.id);
  const newIndex = options.findIndex((o) => o.id === over.id);
  if (oldIndex === -1 || newIndex === -1) return;
  const newOptions = arrayMove(options, oldIndex, newIndex);
  setOptions(newOptions);
  saveOptionsConfig(newOptions);
 }

 function renderOptionRow(opt: SelectOption) {
  const selected = multi ? currentIds.includes(opt.id) : currentId === opt.id;
  return (
   <SortableOptionRow
    key={opt.id}
    option={opt}
    selected={selected}
    draggable={!search.trim()}
    onToggle={() => toggle(opt.id)}
    onOpenMenu={(rect) => setOptionMenu({ opt, rect })}
   />
  );
 }

 const grouped = !!property.config?.groupedByStatus;
 const sections = groupOptions(filtered, grouped);

 const selectedOptions = multi ? currentIds.map((id) => options.find((o) => o.id === id)).filter(Boolean) as SelectOption[] : [];

 return (
  <div className="flex min-h-0 flex-1 flex-col">
   {/* Selected chips + search, combined into one row like Notion's own
       popup — the chips are the current value (each with its own × to
       deselect), not just search UI, so they show even when hideSearch
       hides the actual filter/create input below them. */}
   {(!hideSearch || selectedOptions.length > 0) && (
    <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
     {selectedOptions.map((opt) => {
      const color = getOptionColor(opt.color);
      return (
       <span key={opt.id} className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
        {opt.name}
        <button type="button" onClick={() => toggle(opt.id)} className="opacity-70 hover:opacity-100" aria-label={`Remove ${opt.name}`}>
         <X size={11} />
        </button>
       </span>
      );
     })}
     {!hideSearch && (
      <input
       autoFocus
       value={search}
       onChange={(e) => setSearch(e.target.value)}
       onKeyDown={(e) => {
        if (e.key === "Enter" && canCreate) createOption();
        if (e.key === "Enter" && filtered.length === 1) { toggle(filtered[0].id); if (!multi) onClose(); }
        if (e.key === "Backspace" && !search && selectedOptions.length > 0) toggle(selectedOptions[selectedOptions.length - 1].id);
       }}
       placeholder={selectedOptions.length > 0 ? "" : "Search or create…"}
       className="min-w-[60px] flex-1 bg-transparent text-xs placeholder:text-muted-foreground/40 focus:outline-none"
      />
     )}
    </div>
   )}

   {/* Options list — the ONLY part that scrolls/shrinks; "Edit property"
       below (Status only) stays outside this so it's never pushed past the
       popover's own height cap and clipped, no matter how many options
       there are. */}
   <div className="min-h-0 flex-1 overflow-y-auto p-1">
    {!hideSearch && !grouped && (
     <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
      Select an option or create one
     </p>
    )}
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
     <SortableContext items={filtered.map((o) => o.id)} strategy={verticalListSortingStrategy}>
      {sections.map((section) => (
       <div key={section.key} className="mb-1 last:mb-0">
        {section.label && (
         <div className="mb-0.5 flex items-center justify-between px-2 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">{section.label}</span>
          <button
           onClick={() => quickAddOption(section.key as StatusGroupKey)}
           className="flex size-4 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground/60 hover:bg-accent hover:text-foreground"
           title={`Add option to ${section.label}`}
          >
           <Plus size={11} />
          </button>
         </div>
        )}
        {section.options.map(renderOptionRow)}
       </div>
      ))}
     </SortableContext>
    </DndContext>

    {canCreate && (
     <button
      onClick={() => createOption()}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
     >
      <Plus size={12} />
      Create <span className="font-medium text-foreground">"{search}"</span>
     </button>
    )}

    {/* A property with zero options and no search box (hideSearch, the
        Calendar/Gallery/Board quick-popup) had no way to ever create a first
        option — "No options" was a dead end. Offer a direct add button here
        too, not just next to grouped section headers. */}
    {!options.length && !search.trim() && (
     <button
      onClick={() => quickAddOption()}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
     >
      <Plus size={12} />
      Add option
     </button>
    )}

    {!!options.length && !filtered.length && !canCreate && (
     <p className="px-3 py-2 text-xs text-muted-foreground/60">No options</p>
    )}
   </div>

   {onEditProperty && (
    <button
     onClick={(e) => onEditProperty((e.currentTarget as HTMLElement).getBoundingClientRect())}
     className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
    >
     <Settings2 size={12} />
     Edit property
    </button>
   )}

   {optionMenu && (
    <OptionSubmenu
     option={optionMenu.opt}
     anchorRect={optionMenu.rect}
     onRename={(name) => renameOption(optionMenu.opt.id, name)}
     onDelete={() => deleteOption(optionMenu.opt.id)}
     onRecolor={(color) => recolorOption(optionMenu.opt.id, color)}
     onClose={() => setOptionMenu(null)}
    />
   )}
  </div>
 );
}

// ── SortableOptionRow ────────────────────────────────────────────────────────
// Drag-reorder is only meaningful against the full, unfiltered option set, so
// `draggable` is false while search is active (see the comment above
// handleDragEnd) — in that case the drag handle/listeners are simply omitted.

function SortableOptionRow({ option, selected, draggable, onToggle, onOpenMenu }: { option: SelectOption; selected: boolean; draggable: boolean; onToggle: () => void; onOpenMenu: (rect: DOMRect) => void }) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id, disabled: !draggable });
 const style: React.CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.4 : 1,
 };
 const color = getOptionColor(option.color);

 return (
  <div ref={setNodeRef} style={style} className="group/opt flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-1 hover:bg-accent">
   {draggable && (
    <span
     {...attributes}
     {...listeners}
     style={{ touchAction: "none" }}
     className="flex size-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground/40 opacity-0 group-hover/opt:opacity-100"
    >
     <GripVertical size={12} />
    </span>
   )}
   <button
    type="button"
    onClick={onToggle}
    className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-xs)] px-1 py-0.5 text-left"
   >
    <span className="inline-flex min-w-0 items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
     <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
     <span className="truncate">{option.name}</span>
    </span>
    {selected && <Check size={13} className="ml-auto shrink-0 text-foreground" />}
   </button>
   <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onOpenMenu((e.currentTarget as HTMLElement).getBoundingClientRect()); }}
    className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground/60 opacity-0 hover:bg-accent group-hover/opt:opacity-100"
   >
    <MoreHorizontal size={13} />
   </button>
  </div>
 );
}

// ── Date ─────────────────────────────────────────────────────────────────────

interface DateEditorProps {
 property: DbProperty;
 value: unknown;
 onSave: (value: unknown) => void;
 onClose: () => void;
}

function DateEditor({ value, onSave, onClose }: DateEditorProps) {
 const raw = (value as { date?: string | null } | null)?.date ?? "";
 const selected = raw ? new Date(`${raw.slice(0, 10)}T00:00:00`) : undefined;

 function select(date: Date | undefined) {
  onSave({ date: date ? format(date, "yyyy-MM-dd") : null });
  onClose();
 }

 return (
  <div className="flex flex-col">
   <Calendar mode="single" selected={selected} onSelect={select} defaultMonth={selected ?? new Date()} autoFocus />
   <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
    <button
     type="button"
     disabled={!raw}
     onClick={() => { onSave({ date: null }); onClose(); }}
     className="text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
     Clear
    </button>
    <button
     type="button"
     onClick={() => select(new Date())}
     className="text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
    >
     Today
    </button>
   </div>
  </div>
 );
}

// ── Person ───────────────────────────────────────────────────────────────────

interface PersonEditorProps {
 value: unknown;
 workspaceId: string;
 onSave: (value: unknown) => void;
}

function PersonEditor({ value, workspaceId, onSave }: PersonEditorProps) {
 const selectedIds = (value as { userIds?: string[] } | null)?.userIds ?? [];
 const cachedMembers = (value as { _members?: { id: string; name: string; email: string }[] } | null)?._members ?? [];
 const [members, setMembers]  = useState<WorkspaceMember[]>([]);
 const [search, setSearch]   = useState("");
 const [loading, setLoading]  = useState(true);
 const [inviting, setInviting] = useState(false);
 const [inviteEmail, setInviteEmail] = useState("");
 const [inviteSubmitting, setInviteSubmitting] = useState(false);
 const [inviteError, setInviteError] = useState<string | null>(null);
 const [inviteSuccess, setInviteSuccess] = useState(false);

 useEffect(() => {
  fetch(`/api/workspaces/${workspaceId}/members`)
   .then((r) => r.json())
   .then((data: WorkspaceMember[]) => setMembers(data.filter((m) => m.status === "active")))
   .catch(() => {})
   .finally(() => setLoading(false));
 }, [workspaceId]);

 const filtered = members.filter((m) => {
  const q = search.toLowerCase();
  return (m.userName ?? "").toLowerCase().includes(q) || (m.userEmail ?? "").toLowerCase().includes(q);
 });

 function toggle(userId: string) {
  const next = selectedIds.includes(userId)
   ? selectedIds.filter((id) => id !== userId)
   : [...selectedIds, userId];
  // Build updated _members cache — keep existing + add/remove the toggled member
  const toggled = members.find((m) => m.userId === userId);
  let nextMembers = cachedMembers.filter((m) => next.includes(m.id));
  if (toggled && next.includes(userId) && !nextMembers.some((m) => m.id === userId)) {
   nextMembers = [...nextMembers, {
    id: userId,
    name: toggled.userName || toggled.userEmail || "Unknown member",
    email: toggled.userEmail ?? "",
   }];
  }
  onSave({ userIds: next, _members: nextMembers });
 }

 async function sendInvite() {
  const email = inviteEmail.trim();
  if (!email || inviteSubmitting) return;
  setInviteSubmitting(true);
  setInviteError(null);
  try {
   const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role: "editor" }),
   });
   if (!res.ok) {
    const d = await res.json().catch(() => null);
    setInviteError(d?.error ?? "Couldn't send invite");
    return;
   }
   setInviteSuccess(true);
   setInviteEmail("");
  } finally {
   setInviteSubmitting(false);
  }
 }

 // Prefer the live member list (fresher name/email) — fall back to the value's
 // own cached snapshot for anyone not in that (already active-only) list, so a
 // selection made before a member's status changed doesn't just disappear.
 const selectedMembers = selectedIds.map((id) => {
  const m = members.find((mm) => mm.userId === id);
  if (m) return { id, name: m.userName ?? m.userEmail ?? id, email: m.userEmail ?? "" };
  return cachedMembers.find((c) => c.id === id) ?? { id, name: id, email: "" };
 });

 if (inviting) {
  return (
   <div className="flex flex-col">
    <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
     <button
      onClick={() => { setInviting(false); setInviteError(null); setInviteSuccess(false); }}
      className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground hover:bg-accent"
     >
      <ArrowLeft size={13} />
     </button>
     <span className="text-xs font-semibold text-foreground">Invite people</span>
    </div>
    <div className="flex flex-col gap-2 p-2.5">
     {inviteSuccess ? (
      <p className="text-xs text-primary">Invite sent — they’ll appear here once they join.</p>
     ) : (
      <>
       <input
        autoFocus
        type="email"
        value={inviteEmail}
        onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
        onKeyDown={(e) => { if (e.key === "Enter") sendInvite(); }}
        placeholder="Email address"
        className="w-full rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
       />
       {inviteError && <p className="text-[11px] text-destructive">{inviteError}</p>}
       <button
        onClick={sendInvite}
        disabled={!inviteEmail.trim() || inviteSubmitting}
        className="flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
       >
        {inviteSubmitting ? <Loader2 size={12} className="animate-spin" /> : "Send invite"}
       </button>
      </>
     )}
    </div>
   </div>
  );
 }

 return (
  <div className="flex flex-col">
   {selectedMembers.length > 0 && (
    <div className="flex flex-wrap gap-1 border-b border-border px-2.5 py-2">
     {selectedMembers.map((m) => (
      <span key={m.id} className="flex items-center gap-1 rounded-full bg-accent py-0.5 pl-1 pr-1.5 text-xs text-foreground">
       <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
        {(m.name || "?").slice(0, 1).toUpperCase()}
       </span>
       {m.name}
       <button onClick={() => toggle(m.id)} className="ml-0.5 text-muted-foreground hover:text-foreground">
        <X size={11} />
       </button>
      </span>
     ))}
    </div>
   )}
   <div className="border-b border-border px-3 py-2">
    <input
     autoFocus
     value={search}
     onChange={(e) => setSearch(e.target.value)}
     placeholder="Search people…"
     className="w-full bg-transparent text-xs placeholder:text-muted-foreground/40 focus:outline-none"
    />
   </div>
   <div className="max-h-48 overflow-y-auto p-1">
    {loading && <p className="px-3 py-2 text-xs text-muted-foreground/60">Loading…</p>}
    {!loading && filtered.length > 0 && (
     <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">People</p>
    )}
    {!loading && filtered.map((m) => {
     const selected = selectedIds.includes(m.userId);
     // `??` only falls through on null/undefined — a member with a genuinely
     // empty-string name/email (not just a missing one) was leaking through
     // as blank initials and a blank row instead of falling back.
     const displayName = m.userName || m.userEmail || "Unknown member";
     const initials = displayName.slice(0, 1).toUpperCase();
     const showEmailLine = !!m.userName && !!m.userEmail;
     return (
      <button
       key={m.userId}
       onClick={() => toggle(m.userId)}
       className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent"
      >
       <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {initials}
       </span>
       <span className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
        {showEmailLine && <p className="truncate text-xs text-muted-foreground">{m.userEmail}</p>}
       </span>
       {selected && <Check size={13} className="shrink-0 text-primary"/>}
      </button>
     );
    })}
    {!loading && search.trim() && !filtered.length && (
     <p className="px-3 py-2 text-xs text-muted-foreground/60">No matches in “{search}”…</p>
    )}
    {!loading && !search.trim() && !filtered.length && (
     <p className="px-3 py-2 text-xs text-muted-foreground/60">No members found</p>
    )}
   </div>
   <div className="border-t border-border p-1">
    <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">More</p>
    <button
     onClick={() => setInviting(true)}
     className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-foreground hover:bg-accent"
    >
     <UserPlus size={13} className="shrink-0 text-muted-foreground" />
     <span className="flex-1 text-left">Invite people</span>
     <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
    </button>
   </div>
  </div>
 );
}

// ── Relation ─────────────────────────────────────────────────────────────────

interface RelationEditorProps {
 value: unknown;
 property: DbProperty;
 onSave: (value: unknown) => void;
}

function RelationEditor({ value, property, onSave }: RelationEditorProps) {
 const selectedIds = (value as { entryIds?: string[] } | null)?.entryIds ?? [];
 const relDbId   = property.config?.relatedDatabaseId;
 const [entries, setEntries] = useState<{ id: string; title: string | null }[]>([]);
 const [search, setSearch]  = useState("");
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  if (!relDbId) { setLoading(false); return; }
  fetch(`/api/databases/${relDbId}/entries`)
   .then((r) => r.json())
   .then((data: { entries: { id: string; title: string | null }[] }) => setEntries(data.entries ?? []))
   .catch(() => {})
   .finally(() => setLoading(false));
 }, [relDbId]);

 const filtered = entries.filter((e) =>
  (e.title ?? "Untitled").toLowerCase().includes(search.toLowerCase())
 );

 function toggle(entryId: string) {
  const next = selectedIds.includes(entryId)
   ? selectedIds.filter((id) => id !== entryId)
   : [...selectedIds, entryId];
  onSave({ entryIds: next });
 }

 return (
  <div className="flex flex-col">
   <div className="border-b border-border px-3 py-2">
    <input
     autoFocus
     value={search}
     onChange={(e) => setSearch(e.target.value)}
     placeholder="Search entries…"
     className="w-full bg-transparent text-xs placeholder:text-muted-foreground/40 focus:outline-none"
    />
   </div>
   <div className="max-h-48 overflow-y-auto p-1">
    {loading && <p className="px-3 py-2 text-xs text-muted-foreground/60">Loading…</p>}
    {!relDbId && !loading && <p className="px-3 py-2 text-xs text-muted-foreground/60">No related database configured</p>}
    {!loading && relDbId && filtered.map((entry) => {
     const selected = selectedIds.includes(entry.id);
     return (
      <button
       key={entry.id}
       onClick={() => toggle(entry.id)}
       className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent"
      >
       <span className="min-w-0 flex-1 truncate text-left text-xs text-foreground">
        {entry.title || "Untitled"}
       </span>
       {selected && <Check size={13} className="shrink-0 text-primary"/>}
      </button>
     );
    })}
    {!loading && relDbId && !filtered.length && (
     <p className="px-3 py-2 text-xs text-muted-foreground/60">No entries found</p>
    )}
   </div>
  </div>
 );
}
