"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus, ArrowSquareOut, Trash, EyeSlash, TextT, Hash, CircleDashed,
  Tag, CalendarBlank, CheckSquare, Link as LinkIcon, Envelope, Phone,
  User, ArrowsLeftRight, SortAscending, SortDescending, DotsThree,
} from "@phosphor-icons/react";
import { PROPERTY_REGISTRY } from "@/components/database/property-registry";
import { getOptionColor } from "@/components/database/property-registry";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import type { SharedViewProps, DbProperty, DbEntry, SelectOption } from "@/components/database/types";

// ── Constants ────────────────────────────────────────────────────────────────

const PROP_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  text: TextT, number: Hash, select: CircleDashed, multi_select: Tag,
  date: CalendarBlank, checkbox: CheckSquare, url: LinkIcon, email: Envelope,
  phone: Phone, person: User, relation: ArrowsLeftRight,
};

const TEXT_TYPES  = new Set(["text", "number", "url", "email", "phone"]);
const POPUP_TYPES = new Set(["select", "multi_select", "date", "person", "relation"]);

const IDX_COL_W     = 48;
const TITLE_COL_W   = 300;
const DEFAULT_COL_W = 180;
const MIN_COL_W     = 80;

// ── Types ────────────────────────────────────────────────────────────────────

interface ActiveCell    { entryId: string; propId: string }
interface EditPop       { entryId: string; propId: string; rect: DOMRect }
interface PropMenuState { propId: string; rect: DOMRect }
interface AddPropState  { rect: DOMRect }
interface RowMenuState  { entryId: string; shortId: string; rect: DOMRect }

// ── TableView ────────────────────────────────────────────────────────────────

export function TableView({
  workspaceId, workspaceSlug, entries, properties, valueMap, activeView, isEditor,
  onUpdateValue, onUpdateTitle, onCreateEntry, onAddProperty, onUpdateProperty,
  onDeleteProperty, onUpdateView, onDeleteEntry, selectedEntryIds, onSelectEntry, onOpenEntry,
}: SharedViewProps) {
  const [activeCell, setActiveCell]     = useState<ActiveCell | null>(null);
  const [editValue, setEditValue]       = useState("");
  const [editPop, setEditPop]           = useState<EditPop | null>(null);
  const [propMenu, setPropMenu]         = useState<PropMenuState | null>(null);
  const [addPropMenu, setAddPropMenu]   = useState<AddPropState | null>(null);
  const [propName, setPropName]         = useState("");
  const [renamingProp, setRenamingProp] = useState<string | null>(null);
  const [renameVal, setRenameVal]       = useState("");
  const [rowMenu, setRowMenu]           = useState<RowMenuState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ entryId: string } | null>(null);
  const [colWidths, setColWidths]       = useState<Record<string, number>>({});
  const cellInputRef                    = useRef<HTMLInputElement>(null);

  const hiddenIds = new Set((activeView?.hiddenPropertyIds ?? []) as string[]);
  const visible   = properties.filter((p) => !p.isSystem && !hiddenIds.has(p.id));

  const allSelected  = entries.length > 0 && entries.every((e) => selectedEntryIds.has(e.id));
  const someSelected = entries.some((e) => selectedEntryIds.has(e.id));

  function getRaw(entryId: string, propId: string) {
    return valueMap.get(entryId)?.get(propId) ?? null;
  }
  function getTextVal(entryId: string, propId: string): string {
    const v    = getRaw(entryId, propId) as Record<string, unknown> | null;
    const prop = visible.find((p) => p.id === propId);
    if (!prop) return "";
    return String(v?.[prop.type as keyof typeof v] ?? "");
  }
  function colW(id: string) { return colWidths[id] ?? DEFAULT_COL_W; }

  function activateCell(entryId: string, propId: string, e: React.MouseEvent) {
    if (!isEditor) return;
    const prop = visible.find((p) => p.id === propId);
    if (!prop) return;
    if (prop.type === "checkbox") {
      const cur = getRaw(entryId, propId) as { checked?: boolean } | null;
      onUpdateValue(entryId, propId, { checked: !(cur?.checked ?? false) });
      return;
    }
    if (TEXT_TYPES.has(prop.type)) {
      setActiveCell({ entryId, propId });
      setEditValue(getTextVal(entryId, propId));
      setTimeout(() => cellInputRef.current?.focus(), 0);
      return;
    }
    if (POPUP_TYPES.has(prop.type)) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setEditPop({ entryId, propId, rect });
    }
  }

  function commitText(entryId: string, propId: string, raw: string) {
    const prop = visible.find((p) => p.id === propId);
    if (!prop) return;
    const val = prop.type === "number"
      ? { number: raw === "" ? null : Number(raw) }
      : { [prop.type]: raw };
    onUpdateValue(entryId, propId, val);
    setActiveCell(null);
  }

  // Column resize
  function startResize(propId: string, startX: number, startW: number) {
    function onMove(e: MouseEvent) {
      const newW = Math.max(MIN_COL_W, startW + (e.clientX - startX));
      setColWidths((prev) => ({ ...prev, [propId]: newW }));
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.body.style.cursor    = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const propsW    = visible.reduce((s, p) => s + colW(p.id), 0);
  const addBtnW   = isEditor ? 52 : 0;
  const totalW    = IDX_COL_W + TITLE_COL_W + propsW + addBtnW;
  const ROW_H     = 40;

  // Grouping
  const groupPropId = activeView?.groupByPropertyId;
  const groupProp   = groupPropId ? properties.find((p) => p.id === groupPropId && p.type === "select") : null;

  type RowGroup = { id: string | null; label: string; color: string | null; entries: DbEntry[] };
  let rowGroups: RowGroup[] | null = null;
  if (groupProp) {
    const opts = (groupProp.config?.options ?? []) as SelectOption[];
    const gMap = new Map<string | null, RowGroup>();
    gMap.set(null, { id: null, label: `No ${groupProp.name}`, color: null, entries: [] });
    opts.forEach((o) => gMap.set(o.id, { id: o.id, label: o.name, color: o.color, entries: [] }));
    for (const e of entries) {
      const val = valueMap.get(e.id)?.get(groupPropId!) as { optionId?: string } | null;
      const key = val?.optionId ?? null;
      (gMap.get(key) ?? gMap.get(null)!).entries.push(e);
    }
    rowGroups = [...gMap.values()].filter((g) => g.entries.length > 0 || g.id === null);
  }

  return (
    <div className="h-full overflow-auto bg-background pb-20">
      <div style={{ minWidth: totalW, paddingRight: 32 }}>

        {/* ═══════════ HEADER ═══════════ */}
        <div className="sticky top-0 z-20 flex items-stretch db-header-b bg-background/95 backdrop-blur-[6px]">
          {/* Checkbox / select-all */}
          <div
            className="flex shrink-0 items-center justify-center bg-background/95"
            style={{ width: IDX_COL_W, minWidth: IDX_COL_W }}
          >
            {isEditor && (
              <label className="flex cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={(e) => {
                    entries.forEach((entry) => onSelectEntry(entry.id, e.target.checked));
                  }}
                  className="sr-only"
                />
                <span className={`flex size-[15px] items-center justify-center rounded border transition-all duration-150 ${
                  allSelected
                    ? "border-primary bg-primary"
                    : someSelected
                      ? "border-primary bg-primary/20"
                      : "border-border/60 bg-background hover:border-primary/50"
                }`}>
                  {allSelected && (
                    <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  )}
                  {someSelected && !allSelected && (
                    <span className="block h-0.5 w-2 rounded-full bg-primary" />
                  )}
                </span>
              </label>
            )}
          </div>

          {/* Name header */}
          <div
            className="flex shrink-0 items-center gap-2 bg-background/95 px-3 py-0"
            style={{ width: TITLE_COL_W, minWidth: TITLE_COL_W, height: 34, borderRight: "1px solid rgba(26,26,20,0.08)" }}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <svg viewBox="0 0 16 16" className="size-3 text-primary/70" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <polyline points="3 4 3 3 13 3 13 4"/><line x1="8" y1="3" x2="8" y2="13"/><line x1="5" y1="13" x2="11" y2="13"/>
              </svg>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Name</span>
          </div>

          {/* Property headers */}
          {visible.map((prop) => {
            const Icon = PROP_ICONS[prop.type] ?? TextT;
            return (
              <div
                key={prop.id}
                className="group/col relative shrink-0"
                style={{ width: colW(prop.id), minWidth: colW(prop.id), height: 34 }}
              >
                {renamingProp === prop.id ? (
                  <input
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => { if (renameVal.trim()) onUpdateProperty(prop.id, { name: renameVal.trim() }); setRenamingProp(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { if (renameVal.trim()) onUpdateProperty(prop.id, { name: renameVal.trim() }); setRenamingProp(null); }
                      if (e.key === "Escape") setRenamingProp(null);
                    }}
                    autoFocus
                    className="h-full w-full bg-transparent px-3 text-[12px] font-semibold text-foreground/70 focus:outline-none"
                  />
                ) : (
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      if (!isEditor) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setPropMenu(propMenu?.propId === prop.id ? null : { propId: prop.id, rect });
                    }}
                    className="flex h-full w-full items-center gap-2 px-3 transition-colors hover:bg-accent/60"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-md bg-muted/50">
                      <Icon size={10} />
                    </span>
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{prop.name}</span>
                  </button>
                )}
                {/* Resize handle */}
                {isEditor && (
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 transition-opacity group-hover/col:opacity-100 hover:bg-primary/40"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startResize(prop.id, e.clientX, colW(prop.id)); }}
                  />
                )}
              </div>
            );
          })}

          {/* Add property */}
          {isEditor && (
            <div className="shrink-0" style={{ width: addBtnW, minWidth: addBtnW, height: 34 }}>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setAddPropMenu(addPropMenu ? null : { rect });
                }}
                className="flex size-full items-center justify-center text-muted-foreground/30 transition-colors hover:bg-accent/60 hover:text-muted-foreground"
                title="Add property"
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ═══════════ ROWS ═══════════ */}
        {(rowGroups ?? [{ id: null, label: "", color: null, entries }] as RowGroup[]).flatMap((group, gIdx) => {
          const groupHeader = rowGroups && (
            <div
              key={`gh-${gIdx}`}
              className="flex items-center gap-2.5 border-b border-border/40 bg-muted/20 px-3 py-2"
            >
              {group.id && group.color ? (() => {
                const c = getOptionColor(group.color);
                return (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.bg} ${c.text}`}>
                    <span className={`size-1.5 rounded-full ${c.dot}`} />
                    {group.label}
                  </span>
                );
              })() : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground/70">
                  <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                  {group.label}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/40">{group.entries.length}</span>
            </div>
          );

          const rows = group.entries.map((entry, rowIdx) => {
          const isSelected = selectedEntryIds.has(entry.id);
          return (
            <div
              key={entry.id}
              className={[
                "group/row flex items-stretch db-border-b transition-colors duration-100",
                isSelected ? "bg-primary/[0.08]" : "hover:bg-[rgba(201,106,43,0.04)]",
              ].join(" ")}
            >
              {/* Checkbox / index */}
              <div
                className="flex shrink-0 items-center justify-center"
                style={{ width: IDX_COL_W, minWidth: IDX_COL_W, height: ROW_H }}
              >
                {isEditor ? (
                  <label className="relative flex size-5 cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onSelectEntry(entry.id, e.target.checked)}
                      className="sr-only"
                    />
                    {/* Row number — fades out on hover/select */}
                    <span className={`absolute select-none text-[11px] tabular-nums text-muted-foreground/30 transition-opacity duration-150 ${
                      isSelected ? "opacity-0" : "opacity-100 group-hover/row:opacity-0"
                    }`}>
                      {rowIdx + 1}
                    </span>
                    {/* Checkbox — fades in on hover/select */}
                    <span className={`flex size-[15px] items-center justify-center rounded border transition-all duration-150 ${
                      isSelected
                        ? "border-primary bg-primary opacity-100"
                        : "border-border/50 bg-background opacity-0 group-hover/row:opacity-100"
                    }`}>
                      {isSelected && (
                        <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                          <polyline points="2 6 5 9 10 3"/>
                        </svg>
                      )}
                    </span>
                  </label>
                ) : (
                  <span className="select-none text-[11px] tabular-nums text-muted-foreground/30">{rowIdx + 1}</span>
                )}
              </div>

              {/* Title cell */}
              <div
                className="group/title flex shrink-0 items-center gap-2.5 px-3"
                style={{ width: TITLE_COL_W, minWidth: TITLE_COL_W, height: ROW_H, borderRight: "1px solid rgba(26,26,20,0.08)" }}
              >
                {entry.icon ? (
                  <span className="shrink-0 text-base leading-none">{entry.icon}</span>
                ) : (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/20">
                    <svg viewBox="0 0 16 16" className="size-3 text-muted-foreground/20" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="2" y="2" width="12" height="12" rx="2"/>
                    </svg>
                  </span>
                )}

                {activeCell?.entryId === entry.id && activeCell.propId === "__title__" ? (
                  <input
                    ref={cellInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => { onUpdateTitle(entry.id, editValue); setActiveCell(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") { onUpdateTitle(entry.id, editValue); setActiveCell(null); e.preventDefault(); }
                      if (e.key === "Escape") setActiveCell(null);
                    }}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-foreground focus:outline-none"
                    placeholder="Untitled"
                  />
                ) : (
                  <span
                    onClick={() => {
                      const inPanelMode = (activeView?.entryOpenMode ?? "side_panel") === "side_panel";
                      if (inPanelMode && onOpenEntry) {
                        onOpenEntry(entry);
                      } else if (isEditor) {
                        setActiveCell({ entryId: entry.id, propId: "__title__" });
                        setEditValue(entry.title ?? "");
                      }
                    }}
                    className={`min-w-0 flex-1 truncate text-[13px] font-medium cursor-pointer ${
                      entry.title ? "text-foreground" : "text-muted-foreground/30"
                    }`}
                  >
                    {entry.title || "Untitled"}
                  </span>
                )}

                {/* Row actions: open full page + more */}
                <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/title:opacity-100">
                  <Link
                    href={`/app/${workspaceSlug}/${entry.shortId}`}
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
                    title="Open full page"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ArrowSquareOut size={12} />
                  </Link>
                  {isEditor && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setRowMenu(rowMenu?.entryId === entry.id ? null : { entryId: entry.id, shortId: entry.shortId, rect });
                      }}
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
                    >
                      <DotsThree size={13} weight="bold" />
                    </button>
                  )}
                </div>
              </div>

              {/* Property cells */}
              {visible.map((prop) => {
                const rawVal   = getRaw(entry.id, prop.id);
                const isActive = activeCell?.entryId === entry.id && activeCell.propId === prop.id;
                return (
                  <div
                    key={prop.id}
                    className={[
                      "group/cell relative flex shrink-0 cursor-pointer items-center overflow-hidden px-3 transition-colors duration-100",
                      isActive
                        ? "bg-[rgba(201,106,43,0.06)] ring-1 ring-inset ring-primary/40"
                        : "hover:bg-[rgba(201,106,43,0.04)]",
                    ].join(" ")}
                    style={{ width: colW(prop.id), minWidth: colW(prop.id), height: ROW_H }}
                    onClick={(e) => activateCell(entry.id, prop.id, e)}
                  >
                    {isActive && TEXT_TYPES.has(prop.type) ? (
                      <input
                        ref={cellInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitText(entry.id, prop.id, editValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Tab") { commitText(entry.id, prop.id, editValue); e.preventDefault(); }
                          if (e.key === "Escape") setActiveCell(null);
                        }}
                        type={prop.type === "number" ? "number" : "text"}
                        className="w-full bg-transparent text-[13px] text-foreground focus:outline-none"
                      />
                    ) : rawVal ? (
                      <CellDisplay property={prop} value={rawVal} compact />
                    ) : (
                      <>
                        <CellDisplay property={prop} value={rawVal} compact />
                        {isEditor && TEXT_TYPES.has(prop.type) && (
                          <span className="pointer-events-none select-none text-[13px] text-muted-foreground/25 opacity-0 transition-opacity duration-100 group-hover/cell:opacity-100">
                            Type…
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {isEditor && <div className="shrink-0" style={{ width: addBtnW, height: ROW_H }} />}
            </div>
          );
          });

          return groupHeader ? [groupHeader, ...rows] : rows;
        })}

        {/* ═══════════ EMPTY STATE ═══════════ */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <div className="relative">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/8">
                <svg viewBox="0 0 24 24" className="size-8 text-primary/60" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="3" y="3" width="18" height="18" rx="2.5"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[17px] font-semibold text-foreground">No entries yet</p>
              <p className="mt-1.5 text-[14px] text-muted-foreground/60">
                Add your first entry to start building your database
              </p>
            </div>
            {isEditor && (
              <button
                onClick={() => onCreateEntry()}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(201,106,43,0.30)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_4px_16px_rgba(201,106,43,0.35)] hover:-translate-y-px active:translate-y-0"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor"><path d="M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z"/></svg>
                Add first entry
              </button>
            )}
          </div>
        )}

        {/* ═══════════ ADD ROW ═══════════ */}
        {isEditor && entries.length > 0 && (
          <div className="border-b border-dashed border-border/30">
            <button
              onClick={() => onCreateEntry()}
              className="group/add flex h-10 w-full items-center gap-2 px-4 text-[13px] font-medium text-muted-foreground/40 transition-all duration-200 hover:text-primary/70"
            >
              <Plus size={13} className="transition-transform duration-200 group-hover/add:scale-110" />
              <span>New entry</span>
            </button>
          </div>
        )}

      </div>

      {/* ═══════════ PORTALS ═══════════ */}

      {rowMenu && isEditor && (
        <RowContextMenu
          menu={rowMenu}
          workspaceSlug={workspaceSlug}
          onDeleteRequest={() => { setDeleteConfirm({ entryId: rowMenu.entryId }); setRowMenu(null); }}
          onClose={() => setRowMenu(null)}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          onConfirm={async () => { await onDeleteEntry(deleteConfirm.entryId); setDeleteConfirm(null); }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {propMenu && isEditor && (
        <PropHeaderMenu
          menu={propMenu}
          prop={visible.find((p) => p.id === propMenu.propId)}
          onRename={(id) => { const p = visible.find((x) => x.id === id); if (p) { setRenamingProp(id); setRenameVal(p.name); } setPropMenu(null); }}
          onHide={(id) => { onUpdateView({ hiddenPropertyIds: [...((activeView?.hiddenPropertyIds ?? []) as string[]), id] }); setPropMenu(null); }}
          onDelete={async (id) => { await onDeleteProperty(id); setPropMenu(null); }}
          onSort={(id, dir) => { onUpdateView({ sorts: [{ propertyId: id, direction: dir }] }); setPropMenu(null); }}
          onClose={() => setPropMenu(null)}
        />
      )}

      {addPropMenu && isEditor && (
        <AddPropertyMenu
          rect={addPropMenu.rect}
          propName={propName}
          onNameChange={setPropName}
          onAdd={async (name, type) => { await onAddProperty(name, type); setAddPropMenu(null); setPropName(""); }}
          onClose={() => { setAddPropMenu(null); setPropName(""); }}
        />
      )}

      {editPop && (
        <CellEditorPopover
          property={visible.find((p) => p.id === editPop.propId)!}
          value={getRaw(editPop.entryId, editPop.propId)}
          cellRect={editPop.rect}
          workspaceId={workspaceId}
          onSave={(val) => onUpdateValue(editPop.entryId, editPop.propId, val)}
          onClose={() => setEditPop(null)}
          onPropertyConfigChange={(propId, config) => onUpdateProperty(propId, { config })}
        />
      )}
    </div>
  );
}

// ── RowContextMenu ────────────────────────────────────────────────────────────

interface RowContextMenuProps {
  menu: RowMenuState;
  workspaceSlug: string;
  onDeleteRequest: () => void;
  onClose: () => void;
}

function RowContextMenu({ menu, workspaceSlug, onDeleteRequest, onClose }: RowContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: menu.rect.bottom + 6, left: menu.rect.left, zIndex: 300 }}
      className="w-48 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-xl"
    >
      <Link
        href={`/app/${workspaceSlug}/${menu.shortId}`}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
        onClick={onClose}
      >
        <ArrowSquareOut size={13} /> Open full page
      </Link>
      <div className="my-1 h-px bg-border/60" />
      <button
        onClick={onDeleteRequest}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Trash size={13} /> Delete entry
      </button>
    </div>,
    document.body
  );
}

// ── DeleteConfirmDialog ───────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function DeleteConfirmDialog({ onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    await onConfirm();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-[340px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-6 pb-4 pt-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
            <Trash size={20} className="text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="text-[15px] font-semibold text-foreground">Delete entry?</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              This entry and all its content will be permanently deleted. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border/60 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-xl border border-border/80 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-500 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── PropHeaderMenu ────────────────────────────────────────────────────────────

interface PropHeaderMenuProps {
  menu: PropMenuState;
  prop: DbProperty | undefined;
  onRename: (id: string) => void;
  onHide: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onSort: (id: string, dir: "asc" | "desc") => void;
  onClose: () => void;
}

function PropHeaderMenu({ menu, prop, onRename, onHide, onDelete, onSort, onClose }: PropHeaderMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const sortable = prop && ["text", "number", "select", "date", "checkbox"].includes(prop.type);

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: menu.rect.bottom + 4, left: menu.rect.left, zIndex: 300 }}
      className="w-48 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-xl"
    >
      {sortable && (
        <>
          <button onClick={() => onSort(menu.propId, "asc")} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground hover:bg-accent"><SortAscending size={13} /> Sort A → Z</button>
          <button onClick={() => onSort(menu.propId, "desc")} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground hover:bg-accent"><SortDescending size={13} /> Sort Z → A</button>
          <div className="my-1 h-px bg-border/60" />
        </>
      )}
      <button onClick={() => onRename(menu.propId)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground hover:bg-accent"><TextT size={13} /> Rename</button>
      <button onClick={() => onHide(menu.propId)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground hover:bg-accent"><EyeSlash size={13} /> Hide column</button>
      <div className="my-1 h-px bg-border/60" />
      <button onClick={() => onDelete(menu.propId)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash size={13} /> Delete column</button>
    </div>,
    document.body
  );
}

// ── AddPropertyMenu ───────────────────────────────────────────────────────────

interface AddPropertyMenuProps {
  rect: DOMRect;
  propName: string;
  onNameChange: (v: string) => void;
  onAdd: (name: string, type: string) => void;
  onClose: () => void;
}

function AddPropertyMenu({ rect, propName, onNameChange, onAdd, onClose }: AddPropertyMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const types = Object.values(PROPERTY_REGISTRY).filter((t) => t.type !== "relation");

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: rect.bottom + 6, left: Math.max(8, rect.right - 240), zIndex: 300, width: 240 }}
      className="overflow-hidden rounded-xl border border-border bg-background shadow-xl"
    >
      <div className="border-b border-border px-3 py-2.5">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">New property</p>
        <input
          autoFocus
          value={propName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Property name…"
          className="w-full bg-transparent text-[13px] placeholder:text-muted-foreground/40 focus:outline-none"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-1.5">
        {types.map((def) => {
          const Icon = PROP_ICONS[def.type] ?? TextT;
          return (
            <button
              key={def.type}
              onClick={() => onAdd(propName.trim() || def.label, def.type)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-foreground hover:bg-accent"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                <Icon size={12} />
              </span>
              {def.label}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
