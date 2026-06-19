"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  X, ArrowSquareOut, Trash, ArrowLeft,
  TextT, Hash, CircleDashed, Tag, CalendarBlank,
  CheckSquare, Link as LinkIcon, Envelope, Phone, User, ArrowsLeftRight,
  FileText, PencilSimple, Warning,
} from "@phosphor-icons/react";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import { PageEditor } from "@/components/editor/editor";
import type { DbEntry, DbProperty } from "@/components/database/types";

const PROP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  text: TextT, number: Hash, select: CircleDashed, multi_select: Tag,
  date: CalendarBlank, checkbox: CheckSquare, url: LinkIcon,
  email: Envelope, phone: Phone, person: User, relation: ArrowsLeftRight,
};

const POPUP_TYPES = new Set(["select", "multi_select", "date", "person", "relation"]);
const TEXT_TYPES  = new Set(["text", "number", "url", "email", "phone"]);

interface EntrySidePanelProps {
  entry: DbEntry;
  properties: DbProperty[];
  valueMap: Map<string, Map<string, unknown>>;
  workspaceSlug: string;
  workspaceId: string;
  isEditor: boolean;
  onClose: () => void;
  onUpdateTitle: (entryId: string, title: string) => Promise<void>;
  onUpdateValue: (entryId: string, propId: string, value: unknown) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
}

export function EntrySidePanel({
  entry, properties, valueMap, workspaceSlug, workspaceId,
  isEditor, onClose, onUpdateTitle, onUpdateValue, onDeleteEntry,
}: EntrySidePanelProps) {
  const [title, setTitle]                 = useState(entry.title ?? "");
  const [editPop, setEditPop]             = useState<{ propId: string; rect: DOMRect } | null>(null);
  const [inlineEdit, setInlineEdit]       = useState<{ propId: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const panelRef                          = useRef<HTMLDivElement>(null);

  useEffect(() => { setTitle(entry.title ?? ""); }, [entry.id, entry.title]);

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape" && !editPop) onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, editPop]);

  const visibleProps = properties.filter((p) => !p.isSystem);
  const entryValues  = valueMap.get(entry.id) ?? new Map();
  function getVal(propId: string) { return entryValues.get(propId) ?? null; }

  function handleCellClick(prop: DbProperty, e: React.MouseEvent) {
    if (!isEditor) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (prop.type === "checkbox") {
      const cur = getVal(prop.id) as { checked?: boolean } | null;
      onUpdateValue(entry.id, prop.id, { checked: !(cur?.checked ?? false) });
      return;
    }
    if (POPUP_TYPES.has(prop.type)) { setEditPop({ propId: prop.id, rect }); return; }
    if (TEXT_TYPES.has(prop.type)) {
      const rawVal = getVal(prop.id) as Record<string, unknown> | null;
      const strVal = String(rawVal?.[prop.type as keyof typeof rawVal] ?? "");
      setInlineEdit({ propId: prop.id, value: strVal });
    }
  }

  function commitInline() {
    if (!inlineEdit) return;
    const prop = visibleProps.find((p) => p.id === inlineEdit.propId);
    if (!prop) { setInlineEdit(null); return; }
    onUpdateValue(entry.id, prop.id, { [prop.type]: inlineEdit.value });
    setInlineEdit(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col overflow-hidden bg-[#fafafa] dark:bg-[#111] shadow-[−8px_0_60px_rgba(0,0,0,0.18)]"
        style={{ animation: "sidePanelIn 0.25s cubic-bezier(0.22,1,0.36,1)" }}
      >

        {/* ── Top nav bar ─────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between bg-white/80 px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md dark:bg-white/5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-muted-foreground/60 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/8"
          >
            <ArrowLeft size={13} weight="bold" />
            Back
          </button>

          <div className="flex items-center gap-1">
            {isEditor && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                title="Delete entry"
              >
                <Trash size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-black/6 hover:text-foreground dark:hover:bg-white/8"
              title="Close  (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 overflow-hidden bg-white dark:bg-white/4">
          {/* Gradient wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-primary/[0.03] to-transparent" />
          {/* Decorative circle blur */}
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative px-6 pb-6 pt-7">
            {/* Icon */}
            <div className="mb-4">
              {entry.icon ? (
                <span className="inline-block rounded-2xl bg-white/60 p-2 text-4xl leading-none shadow-sm backdrop-blur-sm dark:bg-white/10">
                  {entry.icon}
                </span>
              ) : (
                <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-border/40 bg-white/70 shadow-sm backdrop-blur-sm dark:bg-white/8">
                  <FileText size={20} className="text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Title */}
            {isEditor ? (
              <div className="group/title relative">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { if (title !== entry.title) onUpdateTitle(entry.id, title); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") { setTitle(entry.title ?? ""); e.currentTarget.blur(); }
                  }}
                  placeholder="Untitled"
                  className="w-full bg-transparent text-[26px] font-bold leading-tight tracking-tight text-foreground placeholder:text-foreground/20 focus:outline-none"
                />
                <div className="mt-1 flex items-center gap-1.5 opacity-0 transition-opacity group-focus-within/title:opacity-100 group-hover/title:opacity-100">
                  <PencilSimple size={11} className="text-muted-foreground/40" />
                  <span className="text-[11px] text-muted-foreground/40">Editing title — press Enter to save</span>
                </div>
              </div>
            ) : (
              <h2 className="text-[26px] font-bold leading-tight tracking-tight text-foreground">
                {entry.title || <span className="text-foreground/20">Untitled</span>}
              </h2>
            )}
          </div>
        </div>

        {/* ── Properties ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {visibleProps.length > 0 ? (
            <div className="px-4 py-4">
              {/* Section label */}
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">
                  Properties
                </span>
                <div className="h-px flex-1 bg-border/40" />
                <span className="text-[10px] text-muted-foreground/30">{visibleProps.length}</span>
              </div>

              {/* Property rows */}
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm dark:bg-white/4">
                {visibleProps.map((prop, idx) => {
                  const Icon            = PROP_ICONS[prop.type] ?? TextT;
                  const raw             = getVal(prop.id);
                  const isInlineEditing = inlineEdit?.propId === prop.id;
                  const hasValue        = raw != null;
                  const isLast          = idx === visibleProps.length - 1;

                  return (
                    <div
                      key={prop.id}
                      className={[
                        "group/prop flex min-h-[44px] items-center transition-colors hover:bg-black/[0.025] dark:hover:bg-white/5",
                        !isLast ? "border-b border-border/40" : "",
                      ].join(" ")}
                    >
                      {/* Property label */}
                      <div className="flex w-[148px] shrink-0 items-center gap-2 px-3.5 py-2.5 text-[12px] font-medium text-muted-foreground/60">
                        <div className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground/60">
                          <Icon size={11} />
                        </div>
                        <span className="truncate">{prop.name}</span>
                      </div>

                      {/* Separator */}
                      <div className="h-full w-px bg-border/40 self-stretch" />

                      {/* Value */}
                      <div
                        className={[
                          "flex min-h-[44px] flex-1 cursor-pointer items-center px-3.5 py-2.5 text-[13px] transition-colors",
                          isEditor ? "hover:bg-primary/5" : "cursor-default",
                          isInlineEditing ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "",
                        ].join(" ")}
                        onClick={(e) => handleCellClick(prop, e)}
                      >
                        {isInlineEditing ? (
                          <input
                            autoFocus
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            onBlur={commitInline}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitInline();
                              if (e.key === "Escape") setInlineEdit(null);
                              e.stopPropagation();
                            }}
                            className="w-full bg-transparent text-[13px] text-foreground focus:outline-none"
                          />
                        ) : hasValue ? (
                          <CellDisplay property={prop} value={raw} compact />
                        ) : (
                          <span className="text-[12px] text-muted-foreground/25 opacity-0 transition-opacity group-hover/prop:opacity-100">
                            {isEditor ? "Click to add" : "—"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/40">
                <FileText size={20} className="text-muted-foreground/30" />
              </div>
              <p className="text-[13px] font-medium text-muted-foreground/50">No properties yet</p>
              <p className="text-[12px] text-muted-foreground/35">Add properties from the table view</p>
            </div>
          )}

          {/* ── Content / Block editor ── */}
          <div className="px-4 pb-2">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">
                Content
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="rounded-2xl border border-border/50 bg-white px-4 py-3 shadow-sm dark:bg-white/4">
              <PageEditor
                pageId={entry.id}
                isLocked={false}
                isDeleted={false}
                isEditor={isEditor}
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
              />
            </div>
          </div>

          {/* Spacer */}
          <div className="h-4" />
        </div>

        {/* ── Footer CTA ──────────────────────────────────────────────────── */}
        <div className="shrink-0 bg-white/80 px-4 pb-5 pt-3 backdrop-blur-sm shadow-[0_-1px_0_rgba(0,0,0,0.06)] dark:bg-white/4">
          <Link
            href={`/app/${workspaceSlug}/${entry.shortId}`}
            className="group flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 px-5 py-3.5 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-105"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <FileText size={15} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold text-white">Open full page</p>
              <p className="text-[11px] text-white/70">View content, comments and more</p>
            </div>
            <ArrowSquareOut
              size={15}
              className="shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        {/* ── Cell editor popover ─────────────────────────────────────────── */}
        {editPop && (() => {
          const prop = visibleProps.find((p) => p.id === editPop.propId);
          if (!prop) return null;
          return (
            <CellEditorPopover
              property={prop}
              value={getVal(prop.id)}
              cellRect={editPop.rect}
              workspaceId={workspaceId}
              onSave={(val) => { onUpdateValue(entry.id, prop.id, val); setEditPop(null); }}
              onClose={() => setEditPop(null)}
              onPropertyConfigChange={() => {}}
            />
          );
        })()}

        {/* ── Delete confirm overlay ──────────────────────────────────────── */}
        {confirmDelete && (
          <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/50 backdrop-blur-sm pb-0">
            <div
              className="w-full overflow-hidden rounded-t-3xl bg-background"
              style={{ animation: "slideUp 0.2s cubic-bezier(0.22,1,0.36,1)" }}
            >
              {/* Red bar */}
              <div className="h-1 w-full bg-gradient-to-r from-red-500 to-red-400" />
              <div className="px-6 pb-8 pt-5">
                <div className="mb-5 flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/50">
                    <Warning size={20} className="text-red-600 dark:text-red-400" weight="fill" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-foreground">Delete this entry?</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{entry.title || "Untitled"}</span> will be permanently removed. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      await onDeleteEntry(entry.id);
                      setDeleting(false);
                      onClose();
                    }}
                    className="flex-1 rounded-2xl bg-red-600 py-3 text-[14px] font-bold text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-700 hover:shadow-xl disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Delete entry"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-2xl border border-border bg-background py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes sidePanelIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
