"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Settings2, MessageSquare } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { toggleSelfVote } from "@/lib/databases/vote";
import { PROPERTY_TYPE_ICON } from "@/components/database/property-registry";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { CellEditorPopover, FilesPropertyValue } from "@/components/database/cells/cell-editor";
import { CellCommentPopover } from "@/components/database/cell-comment-popover";
import { EditPropertySidePanel } from "@/components/database/edit-property-panel";
import { PageIcon } from "@/components/pages/page-icon";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import type { DbProperty, DbPropertyValue, FileItem } from "@/components/database/types";

// Plain-text snapshot of a property's current value, frozen onto a comment at
// creation time (mirrors the same helper in template-table-view.tsx) so a
// comment still shows what the property said even if the value changes later.
function getPropertyValueText(prop: DbProperty, raw: unknown): string {
  if (!raw) return "";
  const v = raw as Record<string, unknown>;
  const config = (prop.config ?? {}) as { options?: { id: string; name: string }[] };
  switch (prop.type) {
    case "text":     return String(v.text ?? "");
    case "number":   return v.number != null ? String(v.number) : "";
    case "url":      return String(v.url ?? "");
    case "email":    return String(v.email ?? "");
    case "phone":    return String(v.phone ?? "");
    case "checkbox": return v.checked ? "Yes" : "No";
    case "person": {
      const members = (v._members as { name?: string; email?: string }[] | undefined) ?? [];
      return members.map((m) => m.name || m.email).filter(Boolean).join(", ");
    }
    case "date": {
      const d = v.date as string | undefined;
      return d ? new Date(`${d}T00:00:00`).toLocaleDateString() : "";
    }
    case "select":
    case "status": {
      const optId = v.optionId as string | undefined;
      if (!optId) return "";
      return (config.options ?? []).find((o) => o.id === optId)?.name ?? "";
    }
    case "multi_select": {
      const ids = (v.optionIds as string[] | undefined) ?? [];
      const opts = config.options ?? [];
      return ids.map((id) => opts.find((o) => o.id === id)?.name ?? "").filter(Boolean).join(", ");
    }
    case "files": {
      const files = (v.files as { name?: string }[] | undefined) ?? [];
      return files.map((f) => f.name).filter(Boolean).join(", ");
    }
    default: return "";
  }
}

interface EntryPropertiesPanelProps {
  entryId:       string;
  entryShortId:  string;
  databaseId:    string;
  workspaceId:   string;
  workspaceSlug: string;
  isEditor:      boolean;
}

const INLINE_TYPES = new Set(["text", "number", "url", "email", "phone"]);
const POPOVER_TYPES = new Set(["select", "status", "multi_select", "date", "person", "relation", "files"]);

export function EntryPropertiesPanel({ entryId, entryShortId, databaseId, workspaceId, workspaceSlug, isEditor }: EntryPropertiesPanelProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [values, setValues]         = useState<Map<string, unknown>>(new Map());
  const [loading, setLoading]       = useState(true);

  // Inline editing (text/number/url/email/phone)
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editText, setEditText]     = useState("");
  const inputRef                    = useRef<HTMLInputElement>(null);

  // Popover editing (select/multi_select/date/person/relation)
  const [popover, setPopover]       = useState<{ propId: string; rect: DOMRect } | null>(null);

  // Edit-property side panel (select/status only)
  const [editPropPanel, setEditPropPanel] = useState<{ propId: string; anchorRect: DOMRect } | null>(null);

  // Property-scoped comments (e.g. commenting on "Category: Retro") — kept
  // separate from the page-level Comments section further down the page.
  const [rowComments, setRowComments] = useState<Array<{ blockId: string | null; deletedAt: string | null; propertyId: string | null }> | null>(null);
  const [commentPopover, setCommentPopover] = useState<{ propId: string; rect: DOMRect; propName: string; valueLabel: string } | null>(null);

  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pages/${entryId}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setRowComments(data.comments as Array<{ blockId: string | null; deletedAt: string | null; propertyId: string | null }>);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [entryId]);

  function commentCountFor(propId: string): number {
    if (!rowComments) return 0;
    return rowComments.filter((c) => !c.blockId && !c.deletedAt && c.propertyId === propId).length;
  }

  // Lets the topbar "Comments" panel jump to a specific property's comment
  // popover without prop-drilling — triggers the exact same button click a
  // user would make on that property row's own comment icon.
  useEffect(() => {
    function onJumpToComment(e: Event) {
      const detail = (e as CustomEvent<{ pageId: string; blockId?: string; propertyId?: string }>).detail;
      if (!detail || detail.pageId !== entryId || !detail.propertyId) return;
      const btn = document.querySelector<HTMLButtonElement>(`[data-property-comment-id="${detail.propertyId}"]`);
      btn?.click();
    }
    window.addEventListener("workflik:jump-to-page-comment", onJumpToComment);
    return () => window.removeEventListener("workflik:jump-to-page-comment", onJumpToComment);
  }, [entryId]);

  // `popover`/`editPropPanel` are one-time DOMRect snapshots of a property row's
  // trigger, and `getAnchorRect={() => editPropPanel.anchorRect}` below always
  // returns that same frozen value — so EditPropertySidePanel's own
  // reposition-on-scroll effect has nothing fresh to reposition to. Lock scroll
  // while either popover is open instead, so the frozen anchor never goes stale.
  useScrollLockWhileOpen(!!popover || !!editPropPanel || !!commentPopover, (target) =>
   !!target.closest?.('[role="alertdialog"], [data-edit-property-exempt], [data-comment-exempt]'));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [propsRes, valsRes] = await Promise.all([
        fetch(`/api/databases/${databaseId}/properties`),
        fetch(`/api/entries/${entryId}/property-values`),
      ]);
      if (cancelled || !propsRes.ok || !valsRes.ok) { setLoading(false); return; }
      const props = await propsRes.json() as DbProperty[];
      const vals  = await valsRes.json() as DbPropertyValue[];
      const map   = new Map<string, unknown>();
      for (const v of vals) map.set(v.propertyId, v.value);
      setProperties(props);
      setValues(map);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [databaseId, entryId]);

  const saveValue = useCallback(async (propId: string, value: unknown) => {
    setValues((prev) => new Map(prev).set(propId, value));
    await fetch(`/api/entries/${entryId}/property-values/${propId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ value }),
    });
    window.dispatchEvent(new CustomEvent("workflik:entry-value-changed", { detail: { entryId, propertyId: propId, value } }));
    // Busts the Next.js client router cache so a page navigated to next (e.g.
    // this entry's containing database view) re-fetches fresh server data
    // instead of reusing whatever was cached before this edit.
    router.refresh();
  }, [entryId, router]);

  // Values can also change from a database view's inline cell edit or the row
  // context menu — neither shares state with this panel, so without this
  // listener a value edited elsewhere only shows up here after a full reload.
  useEffect(() => {
    function onValueChanged(e: Event) {
      const detail = (e as CustomEvent<{ entryId: string; propertyId: string; value: unknown }>).detail;
      if (!detail || detail.entryId !== entryId) return;
      setValues((prev) => new Map(prev).set(detail.propertyId, detail.value));
    }
    window.addEventListener("workflik:entry-value-changed", onValueChanged);
    return () => window.removeEventListener("workflik:entry-value-changed", onValueChanged);
  }, [entryId]);

  const commitInline = useCallback((prop: DbProperty) => {
    const text = editText.trim();
    let value: unknown;
    if (prop.type === "number") {
      const n = parseFloat(text);
      value = { number: text === "" ? null : (isNaN(n) ? null : n) };
    } else if (prop.type === "url")   value = { url:   text };
    else if (prop.type === "email")   value = { email: text };
    else if (prop.type === "phone")   value = { phone: text };
    else                              value = { text };
    saveValue(prop.id, value);
    setEditingId(null);
  }, [editText, saveValue]);

  const updatePropertyConfig = useCallback(async (propId: string, patch: Record<string, unknown>) => {
    setProperties((prev) => prev.map((p) => (p.id === propId ? { ...p, ...patch } as DbProperty : p)));
    await fetch(`/api/databases/${databaseId}/properties/${propId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }, [databaseId]);

  const deletePropertyLocal = useCallback(async (propId: string) => {
    const res = await fetch(`/api/databases/${databaseId}/properties/${propId}`, { method: "DELETE" });
    if (!res.ok) return;
    setProperties((prev) => prev.filter((p) => p.id !== propId));
  }, [databaseId]);

  const duplicatePropertyLocal = useCallback(async (prop: DbProperty) => {
    const res = await fetch(`/api/databases/${databaseId}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${prop.name} (copy)`, type: prop.type, config: prop.config }),
    });
    if (!res.ok) return;
    const newProp = await res.json() as DbProperty;
    setProperties((prev) => [...prev, newProp]);
  }, [databaseId]);

  const visibleProps = properties.filter((p) => !p.isSystem && !p.isBackRelation);
  if (loading || !visibleProps.length) return null;

  const popoverProp = popover ? properties.find((p) => p.id === popover.propId) ?? null : null;
  const editPropProp = editPropPanel ? properties.find((p) => p.id === editPropPanel.propId) ?? null : null;

  return (
    <>
      <div className="mb-5 mt-3 space-y-0.5">
        {visibleProps.map((prop) => {
          const TypeIcon = PROPERTY_TYPE_ICON[prop.type as keyof typeof PROPERTY_TYPE_ICON];
          const val = values.get(prop.id) ?? null;
          const isEditing = editingId === prop.id;

          return (
            <div
              key={prop.id}
              className="group/row flex min-h-[32px] items-start gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 hover:bg-muted/50"
            >
              {/* Label column */}
              <div className="flex w-[180px] shrink-0 items-center gap-2 pt-1">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border/60 bg-background text-muted-foreground">
                  {prop.config?.icon ? <PageIcon icon={prop.config.icon} size={12} /> : <TypeIcon size={12} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {prop.name}
                </span>
                {isEditor && (
                  <button
                    type="button"
                    onClick={(e) => setEditPropPanel({ propId: prop.id, anchorRect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                    onMouseEnter={(e) => showTooltip("Edit property", e)}
                    onMouseLeave={hideTooltip}
                    className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/50 opacity-0 transition-opacity duration-150 hover:bg-accent hover:text-foreground group-hover/row:opacity-100"
                  >
                    <Settings2 size={12} />
                  </button>
                )}
              </div>

              {/* Value column */}
              <div className="min-w-0 flex-1 pt-0.5">

                {/* Checkbox — always visible toggle */}
                {prop.type === "checkbox" && (
                  <button
                    type="button"
                    disabled={!isEditor}
                    onClick={() => {
                      const checked = !((val as { checked?: boolean } | null)?.checked ?? false);
                      saveValue(prop.id, { checked });
                    }}
                    className="flex items-center"
                  >
                    {(val as { checked?: boolean } | null)?.checked ? (
                      <svg className="size-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <rect x="2" y="2" width="16" height="16" rx="4" />
                        <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    ) : (
                      <svg className="size-4 text-muted-foreground/60" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Inline text input types */}
                {INLINE_TYPES.has(prop.type) && (
                  isEditing ? (
                    <input
                      ref={inputRef}
                      type={prop.type === "number" ? "text" : prop.type === "email" ? "email" : "text"}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => commitInline(prop)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); inputRef.current?.blur(); }
                        if (e.key === "Escape") { setEditingId(null); }
                      }}
                      className="w-full rounded border-none bg-transparent text-sm text-foreground outline-none ring-0 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={!isEditor}
                      onClick={() => {
                        const cur = (() => {
                          if (!val) return "";
                          const v = val as Record<string, unknown>;
                          return String(v[prop.type] ?? v.text ?? "");
                        })();
                        setEditText(cur);
                        setEditingId(prop.id);
                      }}
                      className="flex min-h-[22px] w-full items-center text-left disabled:cursor-default"
                    >
                      {val && <CellDisplay property={prop} value={val} workspaceId={workspaceId} />}
                      {!val && (
                        <span className="text-sm text-muted-foreground/70 opacity-0 transition-opacity group-hover/row:opacity-100">
                          Empty
                        </span>
                      )}
                    </button>
                  )
                )}

                {/* Files — a stack of thumbnail cards + a trailing "+ Add a
                    file or image" row once at least one file exists, instead
                    of the generic single-line button below. */}
                {prop.type === "files" && !!(val as { files?: FileItem[] } | null)?.files?.length && (
                  <FilesPropertyValue
                    files={(val as { files?: FileItem[] }).files ?? []}
                    isEditor={isEditor}
                    onChange={(v) => saveValue(prop.id, v)}
                    onAddClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setPopover({ propId: prop.id, rect });
                    }}
                  />
                )}

                {/* Vote-mode person: clicking toggles the current viewer's own
                    vote directly — never opens the full people picker, so
                    there's no path from this row to editing anyone else's
                    vote. The server enforces the same self-only rule
                    independently (app/api/entries/[id]/property-values/[propId]/route.ts),
                    this is purely about not offering the picker in the UI. */}
                {prop.type === "person" && prop.config?.voteMode && (
                  <button
                    type="button"
                    disabled={!isEditor || !session?.user?.id}
                    onClick={() => {
                      if (!session?.user?.id) return;
                      saveValue(prop.id, toggleSelfVote(val as { userIds?: string[] } | null, session.user));
                    }}
                    className="flex min-h-[22px] w-fit items-center gap-1 text-left disabled:cursor-default"
                  >
                    {val ? <CellDisplay property={prop} value={val} workspaceId={workspaceId} /> : <CellDisplay property={prop} value={{ userIds: [] }} workspaceId={workspaceId} />}
                  </button>
                )}

                {/* Popover types: select / multi_select / date / person / relation / empty files */}
                {POPOVER_TYPES.has(prop.type) && !(prop.type === "person" && prop.config?.voteMode) && !(prop.type === "files" && !!(val as { files?: FileItem[] } | null)?.files?.length) && (
                  <button
                    type="button"
                    disabled={!isEditor}
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setPopover({ propId: prop.id, rect });
                    }}
                    className="flex min-h-[22px] w-full items-center gap-1 text-left disabled:cursor-default"
                  >
                    {val && <CellDisplay property={prop} value={val} workspaceId={workspaceId} />}
                    {!val && (
                      <span className="text-sm text-muted-foreground/70 opacity-0 transition-opacity group-hover/row:opacity-100">
                        Empty
                      </span>
                    )}
                  </button>
                )}

                {/* Computed, read-only — same reasoning as Rollup/Formula:
                    no click-to-edit popover, since there's nothing to pick. */}
                {prop.type === "created_by" && (
                  <div className="flex min-h-[22px] w-full items-center gap-1">
                    {val ? (
                      <CellDisplay property={prop} value={val} workspaceId={workspaceId} />
                    ) : (
                      <span className="text-sm text-muted-foreground/70 opacity-0 transition-opacity group-hover/row:opacity-100">
                        Empty
                      </span>
                    )}
                  </div>
                )}

              </div>

              {/* Comment column — visible on row hover, or always once a
                  comment exists so past discussion stays discoverable */}
              {(() => {
                const count = commentCountFor(prop.id);
                return (
                  <button
                    type="button"
                    data-property-comment-id={prop.id}
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setCommentPopover({
                        propId: prop.id,
                        rect,
                        propName: prop.name,
                        valueLabel: getPropertyValueText(prop, val),
                      });
                    }}
                    onMouseEnter={(e) => showTooltip("Comment on this property", e)}
                    onMouseLeave={hideTooltip}
                    className={`mt-1 flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 text-muted-foreground/60 transition-opacity duration-150 hover:bg-accent hover:text-foreground ${
                      count > 0 ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
                    }`}
                  >
                    <MessageSquare size={12} />
                    {count > 0 && <span className="text-[10px] font-bold leading-none">{count}</span>}
                  </button>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Popover editor */}
      {popover && popoverProp && (
        <CellEditorPopover
          property={popoverProp}
          value={values.get(popover.propId) ?? null}
          cellRect={popover.rect}
          workspaceId={workspaceId}
          onSave={(v) => { saveValue(popover.propId, v); setPopover(null); }}
          onClose={() => setPopover(null)}
          onPropertyConfigChange={(propId, config) => updatePropertyConfig(propId, { config })}
          onEditProperty={(rect) => setEditPropPanel({ propId: popover.propId, anchorRect: rect })}
        />
      )}

      {editPropPanel && editPropProp && (
        <EditPropertySidePanel
          key={editPropProp.id}
          property={editPropProp}
          properties={properties}
          workspaceId={workspaceId}
          getAnchorRect={() => editPropPanel.anchorRect}
          canDelete={!editPropProp.isSystem}
          onUpdateProperty={(patch) => updatePropertyConfig(editPropProp.id, patch)}
          onDeleteProperty={() => deletePropertyLocal(editPropProp.id)}
          onDuplicateProperty={() => duplicatePropertyLocal(editPropProp)}
          onClose={() => setEditPropPanel(null)}
        />
      )}

      {commentPopover && (
        <CellCommentPopover
          pageId={entryId}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          entryShortId={entryShortId}
          anchorRect={commentPopover.rect}
          propertyId={commentPopover.propId}
          propertyName={commentPopover.propName}
          propertyValueLabel={commentPopover.valueLabel}
          onClose={() => setCommentPopover(null)}
          onCommentAdded={() => setRowComments((prev) => [...(prev ?? []), { blockId: null, deletedAt: null, propertyId: commentPopover.propId }])}
        />
      )}

      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </>
  );
}
