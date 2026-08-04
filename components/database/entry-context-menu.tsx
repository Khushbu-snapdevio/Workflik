"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ExternalLink, Link2, Copy, Trash2, Star, Smile, ListChecks, MessageSquare, ChevronRight, Check,
} from "lucide-react";
import { IconPicker } from "@/components/pages/icon-picker";
import { PageIcon } from "@/components/pages/page-icon";
import { CellCommentPopover } from "@/components/database/cell-comment-popover";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import { EditPropertySidePanel } from "@/components/database/edit-property-panel";
import { PROPERTY_TYPE_ICON } from "@/components/database/property-registry";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import type { DbProperty, DbView } from "@/components/database/types";

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const itemClass = "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm text-foreground hover:bg-accent transition-colors";

// Matches CellEditorPopover's own supported types (select/status/multi_select/
// date/person/relation/files) — everything else (text/number/url/email/phone/checkbox)
// has no popover UI there and would render blank if routed through it.
const POPOVER_TYPES = new Set(["select", "status", "multi_select", "date", "person", "relation", "files"]);

interface EntryContextMenuProps {
  entryId: string;
  entryShortId: string;
  entryIcon: string | null;
  updatedAt: string | null;
  databaseId: string;
  workspaceId: string;
  workspaceSlug: string;
  forcePos: { x: number; y: number } | null;
  /** The trigger entry's own card/row rect, when available — used to anchor
   *  the Comment view against a stable element instead of the raw click
   *  point, so it renders cleanly below the card instead of overlapping it. */
  entryRect?: DOMRect | null;
  onClose: () => void;
  onIconChange: (icon: string) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onOpenEntry?: () => void;
  onCommentAdded?: () => void;
  /** Called whenever a property value is saved via the "Edit property"
   *  flyout — lets the caller's own entry list/valueMap state update too, so
   *  e.g. changing the calendar's date property actually moves the entry to
   *  its new day instead of only updating this flyout's own local copy. */
  onValueChange?: (propId: string, value: unknown) => void | Promise<void>;
  /** Propagates config changes (e.g. a new select option) beyond this flyout's own
   *  fetched property list, so other cards for the same entry don't render stale. */
  onPropertyConfigChange?: (propId: string, patch: Record<string, unknown>) => void | Promise<void>;
  /** The calling view and its updater, so "Edit property"'s Display As/Wrap content
   *  writes this view's own override instead of the property's global config. */
  activeView?: DbView | null;
  onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
}

export function EntryContextMenu({
  entryId, entryShortId, entryIcon, updatedAt, databaseId, workspaceId, workspaceSlug,
  forcePos, entryRect, onClose, onIconChange, onDelete, onDuplicate, onOpenEntry, onCommentAdded, onValueChange,
  onPropertyConfigChange, activeView, onUpdateView,
}: EntryContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [favorited, setFavorited] = useState(false);
  const [favPending, setFavPending] = useState(false);
  const [view, setView] = useState<"main" | "icon" | "comment">("main");
  const [propAnchor, setPropAnchor] = useState<DOMRect | null>(null);
  // True once the cascade reaches a property's own value editor (or its "Edit
  // property" side panel) — at that point the top-level Page menu hides too,
  // leaving exactly one popup on screen, matching Notion.
  const [editingProperty, setEditingProperty] = useState(false);

  useEffect(() => {
    if (forcePos) { setView("main"); setPropAnchor(null); setEditingProperty(false); }
  }, [forcePos]);

  useEffect(() => {
    if (!forcePos) return;
    let cancelled = false;
    fetch(`/api/user/favorites?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: Array<{ pageId: string }> | null) => {
        if (cancelled || !rows) return;
        setFavorited(rows.some((f) => f.pageId === entryId));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [forcePos, entryId, workspaceId]);

  useEffect(() => {
    // The comment popover is its own document.body portal (not nested inside
    // menuRef's actual DOM), so this containment check can't see clicks inside
    // it — and it already manages its own outside-click dismissal. Skip ours
    // entirely while it's showing, instead of misfiring "outside" on every click.
    if (!forcePos || view === "comment") return;
    function h(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest?.('[role="alertdialog"], [data-edit-property-exempt]')) return;
      if (!menuRef.current?.contains(target)) onClose();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [forcePos, view, onClose]);

  // Positioned once via forcePos, so scroll is locked instead of repositioning.
  // Exempts the property flyout/editor/side-panel chain so option lists can still scroll.
  useScrollLockWhileOpen(!!forcePos, (target) =>
    !!menuRef.current?.contains(target) || !!target.closest?.('[data-edit-property-exempt]'));

  if (!forcePos || typeof document === "undefined") return null;

  async function toggleFavorite() {
    if (favPending) return;
    setFavPending(true);
    const next = !favorited;
    setFavorited(next);
    try {
      if (next) {
        await fetch("/api/user/favorites", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: entryId, workspaceId }),
        });
      } else {
        await fetch(`/api/user/favorites/${entryId}`, { method: "DELETE" });
      }
      window.dispatchEvent(new CustomEvent("workflik:favorites-changed", { detail: { pageId: entryId, isFavorited: next } }));
    } catch {
      setFavorited(!next);
    } finally {
      setFavPending(false);
    }
  }

  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const url = `/app/${workspaceSlug}/${entryShortId}`;

  // The icon picker fully replaces the menu (matches Notion — it's a distinct,
  // wider panel, not nested inside the still-visible actions list) rather than
  // expanding underneath the "Edit icon" row.
  if (view === "icon") {
    const IW = 352;
    const iLeft = Math.max(8, Math.min(forcePos.x, VW - IW - 8));
    const iTop = Math.max(8, Math.min(forcePos.y, VH - 420));
    return createPortal(
      <div
        ref={menuRef}
        data-edit-property-exempt
        style={{ position: "fixed", top: iTop, left: iLeft, zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <IconPicker
            workspaceId={workspaceId}
            pageId={entryId}
            onSelect={(v) => { onIconChange(v); onClose(); }}
            onIconPreview={(v) => onIconChange(v)}
            onRemove={entryIcon ? () => { onIconChange(""); onClose(); } : undefined}
            onClose={onClose}
          />
        </div>
      </div>,
      document.body,
    );
  }

  // Comment fully replaces the menu (self-contained popover, no wrapper needed).
  // Anchors to the card rect when available, not the raw click point, to avoid overlap.
  if (view === "comment") {
    return (
      <CellCommentPopover
        pageId={entryId}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        entryShortId={entryShortId}
        anchorRect={entryRect ?? new DOMRect(forcePos.x, forcePos.y, 0, 0)}
        onClose={onClose}
        onCommentAdded={onCommentAdded}
      />
    );
  }

  const W = 224;
  const left = Math.max(8, Math.min(forcePos.x, VW - W - 8));
  const estimatedH = 360;
  const top = forcePos.y + estimatedH > VH ? Math.max(8, forcePos.y - estimatedH) : forcePos.y + 4;

  return (
    <>
    {/* Hidden once the cascade reaches a value editor / side panel — only one
        popup on screen at a time past that point. The property LIST itself
        (opened by "Edit property" below) stays alongside this menu, though —
        that's an intentional two-panel cascade, not a full replace. */}
    {!editingProperty && createPortal(
    <div
      ref={menuRef}
      data-edit-property-exempt
      style={{ position: "fixed", top, left, zIndex: 9999, width: W }}
      className="overflow-hidden rounded-md border border-border bg-popover"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-1">
        <p className="px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground-subtle">Page</p>

        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(); }} className={itemClass}>
          <Star size={13} className={`shrink-0 ${favorited ? "text-warning" : "text-muted-foreground"}`} fill={favorited ? "currentColor" : "none"} />
          {favorited ? "Remove from Favorites" : "Add to Favorites"}
        </button>

        <button onClick={(e) => { e.stopPropagation(); setView("icon"); }} className={itemClass}>
          <Smile size={13} className="shrink-0 text-muted-foreground" />
          Edit icon
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            // Anchor to the menu's own known position, not this button's rect, which
            // can reflect stale/mid-scroll layout for a nested row.
            setPropAnchor(new DOMRect(left + W + 4, top, 0, 0));
          }}
          className={`${itemClass} justify-between ${propAnchor ? "bg-accent" : ""}`}
        >
          <span className="flex items-center gap-2.5"><ListChecks size={13} className="shrink-0 text-muted-foreground" />Edit property</span>
          <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
        </button>

        <div className="my-0.5 h-px bg-border" />

        {onOpenEntry ? (
          <button onClick={(e) => { e.stopPropagation(); onClose(); onOpenEntry(); }} className={itemClass}>
            <ExternalLink size={13} className="shrink-0 text-muted-foreground" />
            Open full page
          </button>
        ) : (
          <Link href={url} onClick={() => onClose()} className={itemClass}>
            <ExternalLink size={13} className="shrink-0 text-muted-foreground" />
            Open full page
          </Link>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setView("comment");
          }}
          className={itemClass}
        >
          <MessageSquare size={13} className="shrink-0 text-muted-foreground" />
          Comment
        </button>

        <div className="my-0.5 h-px bg-border" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (typeof window !== "undefined" && navigator.clipboard) {
              navigator.clipboard.writeText(`${window.location.origin}${url}`).catch(() => {});
            }
            onClose();
          }}
          className={itemClass}
        >
          <Link2 size={13} className="shrink-0 text-muted-foreground" />
          Copy link
        </button>

        {onDuplicate && (
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); onClose(); }}
            className={`${itemClass} justify-between`}
          >
            <span className="flex items-center gap-2.5"><Copy size={13} className="shrink-0 text-muted-foreground" />Duplicate</span>
            <span className="text-2xs text-muted-foreground-subtle">Ctrl+D</span>
          </button>
        )}

        <div className="my-0.5 h-px bg-border" />

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
          className="flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <span className="flex items-center gap-2.5"><Trash2 size={13} className="shrink-0" />Move to Trash</span>
          <span className="text-2xs text-destructive/40">Del</span>
        </button>
      </div>

      {updatedAt && (
        <div className="border-t border-border px-3 py-2">
          <p className="text-2xs text-muted-foreground">Last edited {fmtRelative(updatedAt)}</p>
        </div>
      )}
    </div>,
    document.body,
    )}
    {propAnchor && (
      <PropertyFlyout
        entryId={entryId}
        databaseId={databaseId}
        workspaceId={workspaceId}
        anchorRect={propAnchor}
        entryPos={forcePos}
        onClose={() => { setPropAnchor(null); setEditingProperty(false); }}
        onEditingChange={setEditingProperty}
        onValueChange={onValueChange}
        onPropertyConfigChange={onPropertyConfigChange}
        activeView={activeView}
        onUpdateView={onUpdateView}
      />
    )}
    </>
  );
}

// ── Edit-property flyout ─────────────────────────────────────────────────────
// Fetches this entry's properties + values on demand — no preloaded data required
// from the caller, matching the pattern already used by EntryPropertiesPanel.

function PropertyFlyout({
  entryId, databaseId, workspaceId, anchorRect, entryPos, onClose, onEditingChange, onValueChange, onPropertyConfigChange,
  activeView, onUpdateView,
}: {
  entryId: string;
  databaseId: string;
  workspaceId: string;
  anchorRect: DOMRect;
  /** The original right-click point on the entry — used to re-anchor the value
   *  editor near the entry once the list (and its own cascaded-right position)
   *  is gone, instead of inheriting the list's further-right position. */
  entryPos: { x: number; y: number };
  onClose: () => void;
  onEditingChange?: (editing: boolean) => void;
  onValueChange?: (propId: string, value: unknown) => void | Promise<void>;
  onPropertyConfigChange?: (propId: string, patch: Record<string, unknown>) => void | Promise<void>;
  activeView?: DbView | null;
  onUpdateView?: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [values, setValues] = useState<Map<string, unknown>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ prop: DbProperty; rect: DOMRect } | null>(null);
  const [editPropPanel, setEditPropPanel] = useState<{ propId: string; anchorRect: DOMRect } | null>(null);
  // "Edit property" calls onEditProperty(rect) then onClose() in the same tick;
  // onClose would unmount this flyout and destroy the editPropPanel state just set, so
  // suppress that one call (ref updates synchronously in time to catch it).
  const suppressCloseRef = useRef(false);

  useEffect(() => {
    onEditingChange?.(!!editor || !!editPropPanel);
  }, [editor, editPropPanel, onEditingChange]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/databases/${databaseId}/properties`),
      fetch(`/api/entries/${entryId}/property-values`),
    ]).then(async ([propsRes, valsRes]) => {
      if (cancelled || !propsRes.ok || !valsRes.ok) { setLoading(false); return; }
      const props = await propsRes.json() as DbProperty[];
      const vals = await valsRes.json() as Array<{ propertyId: string; value: unknown }>;
      const map = new Map<string, unknown>();
      for (const v of vals) map.set(v.propertyId, v.value);
      setProperties(props);
      setValues(map);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [databaseId, entryId]);

  async function save(propId: string, value: unknown) {
    setValues((prev) => new Map(prev).set(propId, value));
    // Routes through the caller's own value-update path when given — that's
    // what keeps the caller's entry list/valueMap (and thus e.g. the
    // calendar's own re-render onto the new date) in sync, not just this
    // flyout's local copy.
    if (onValueChange) { await onValueChange(propId, value); return; }
    await fetch(`/api/entries/${entryId}/property-values/${propId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  }

  async function updatePropertyConfig(propId: string, patch: Record<string, unknown>) {
    setProperties((prev) => prev.map((p) => (p.id === propId ? { ...p, ...patch } as DbProperty : p)));
    // Route through the caller's own update path so a newly-created option isn't
    // stuck in this flyout's local copy, leaving other cards unable to resolve it.
    if (onPropertyConfigChange) { await onPropertyConfigChange(propId, patch); return; }
    await fetch(`/api/databases/${databaseId}/properties/${propId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deletePropertyLocal(propId: string) {
    const res = await fetch(`/api/databases/${databaseId}/properties/${propId}`, { method: "DELETE" });
    if (!res.ok) return;
    setProperties((prev) => prev.filter((p) => p.id !== propId));
  }

  async function duplicatePropertyLocal(prop: DbProperty) {
    const res = await fetch(`/api/databases/${databaseId}/properties`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${prop.name} (copy)`, type: prop.type, config: prop.config }),
    });
    if (!res.ok) return;
    const newProp = await res.json() as DbProperty;
    setProperties((prev) => [...prev, newProp]);
  }

  const visibleProps = properties.filter((p) => !p.isSystem && !p.isBackRelation);
  const editPropProp = editPropPanel ? properties.find((p) => p.id === editPropPanel.propId) ?? null : null;

  // Self-positioned (not CSS-absolute nested inside the menu) so it can't be
  // clipped by the menu's own overflow-hidden — flips to the left side of the
  // trigger when there isn't room on the right.
  const FW = 224;
  const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;
  const spaceRight = winW - anchorRect.right - 8;
  const left = spaceRight >= FW
    ? anchorRect.right + 4
    : Math.max(8, anchorRect.left - FW - 4);
  const top = Math.max(8, Math.min(anchorRect.top, winH - 320 - 8));

  // The full side panel replaces the cascade (one-popup convention) and anchors to the
  // stable "+New" toolbar button rather than the triggering entry, for a predictable spot.
  if (editPropPanel && editPropProp) {
    return (
      <EditPropertySidePanel
        key={editPropProp.id}
        property={editPropProp}
        properties={properties}
        workspaceId={workspaceId}
        getAnchorRect={() => {
          const btn = document.querySelector("[data-new-entry-button]")?.getBoundingClientRect();
          if (!btn) return editPropPanel.anchorRect;
          // Collapse to the button's right edge so EditPropertySidePanel's cramped-viewport
          // right-align logic triggers deterministically, flush below the button.
          return new DOMRect(btn.right, btn.top, 0, btn.height);
        }}
        canDelete={!editPropProp.isSystem}
        onUpdateProperty={(patch) => updatePropertyConfig(editPropProp.id, patch)}
        onDeleteProperty={() => deletePropertyLocal(editPropProp.id)}
        onDuplicateProperty={() => duplicatePropertyLocal(editPropProp)}
        onBack={() => setEditPropPanel(null)}
        onClose={() => { setEditPropPanel(null); onClose(); }}
        showCardToggle
        viewContext={activeView && onUpdateView ? {
          override: activeView.propertyOverrides?.[editPropProp.id] ?? {},
          onUpdateOverride: (patch) => onUpdateView({
            propertyOverrides: { ...activeView.propertyOverrides, [editPropProp.id]: { ...(activeView.propertyOverrides?.[editPropProp.id] ?? {}), ...patch } },
          }),
        } : undefined}
      />
    );
  }

  // Clicking a property replaces this list with its value editor; re-anchor to
  // entryPos (not the cascaded-right position) to avoid landing far away on narrow layouts.
  if (editor && POPOVER_TYPES.has(editor.prop.type)) {
    // Only a grouped Status property gets the "Edit property" link to the full side
    // panel — other select types are fully editable inline via hideSearch={isStatus}.
    const isStatus = !!editor.prop.config?.groupedByStatus;
    return (
      <CellEditorPopover
        property={editor.prop}
        value={values.get(editor.prop.id) ?? null}
        cellRect={new DOMRect(entryPos.x, entryPos.y, 0, 0)}
        workspaceId={workspaceId}
        hideSearch={isStatus}
        onSave={(v) => save(editor.prop.id, v)}
        onClose={() => {
          if (suppressCloseRef.current) { suppressCloseRef.current = false; return; }
          onClose();
        }}
        onPropertyConfigChange={(propId, config) => updatePropertyConfig(propId, { config })}
        onEditProperty={isStatus ? (rect) => {
          suppressCloseRef.current = true;
          setEditPropPanel({ propId: editor.prop.id, anchorRect: rect });
        } : undefined}
      />
    );
  }

  // Text/number/url/email/phone have no popover UI in CellEditorPopover
  // (that component only handles the types above) — they're edited inline
  // elsewhere in the app, so give them the same plain-input treatment here.
  if (editor) {
    return (
      <InlineValueEditor
        property={editor.prop}
        value={values.get(editor.prop.id) ?? null}
        cellRect={new DOMRect(entryPos.x, entryPos.y, 0, 0)}
        onSave={(v) => save(editor.prop.id, v)}
        onClose={onClose}
      />
    );
  }

  return createPortal(
    <div
      data-edit-property-exempt
      style={{ position: "fixed", top, left, zIndex: 9999, width: FW }}
      className="max-h-80 overflow-y-auto rounded-md border border-border bg-popover p-1"
      onClick={(e) => e.stopPropagation()}
    >
      {loading && <p className="px-2.5 py-2 text-xs text-muted-foreground">Loading…</p>}
      {!loading && visibleProps.length === 0 && (
        <p className="px-2.5 py-2 text-xs text-muted-foreground">No properties</p>
      )}
      {visibleProps.map((prop) => {
        const TypeIcon = PROPERTY_TYPE_ICON[prop.type as keyof typeof PROPERTY_TYPE_ICON];
        const customIcon = prop.config?.icon;
        return (
          <button
            key={prop.id}
            onClick={(e) => {
              e.stopPropagation();
              if (prop.type === "checkbox") {
                // No further UI needed — toggle in place and stay on the list.
                const checked = !((values.get(prop.id) as { checked?: boolean } | null)?.checked ?? false);
                save(prop.id, { checked });
                return;
              }
              setEditor({ prop, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
            }}
            className={itemClass}
          >
            {customIcon ? (
              <PageIcon icon={customIcon} size={13} className="shrink-0" />
            ) : (
              <TypeIcon size={13} className="shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{prop.name}</span>
            {prop.type === "checkbox" && (values.get(prop.id) as { checked?: boolean } | null)?.checked && (
              <Check size={13} className="ml-auto shrink-0 text-primary" />
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

// ── Inline value editor (text / number / url / email / phone) ──────────────
// CellEditorPopover has no branch for these types (they're edited as a plain
// input elsewhere in the app, not a dropdown) — a small self-contained
// counterpart so every property type in the flyout has a working editor.

function InlineValueEditor({
  property, value, cellRect, onSave, onClose,
}: {
  property: DbProperty;
  value: unknown;
  cellRect: DOMRect;
  onSave: (value: unknown) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = (() => {
    if (!value) return "";
    const v = value as Record<string, unknown>;
    return String(v[property.type] ?? v.text ?? "");
  })();
  const [text, setText] = useState(initial);
  const committedRef = useRef(false);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) commit();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit() {
    if (committedRef.current) return;
    committedRef.current = true;
    let v: unknown;
    if (property.type === "number") {
      const n = parseFloat(text);
      v = { number: text.trim() === "" ? null : (isNaN(n) ? null : n) };
    } else if (property.type === "url") v = { url: text };
    else if (property.type === "email") v = { email: text };
    else if (property.type === "phone") v = { phone: text };
    else v = { text };
    onSave(v);
    onClose();
  }

  if (typeof document === "undefined") return null;

  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const W = 240;
  const left = Math.min(Math.max(8, cellRect.left), winW - W - 8);
  const top = Math.min(cellRect.bottom + 4, winH - 60);
  const inputType = property.type === "number" ? "text" : property.type === "email" ? "email" : "text";

  return createPortal(
    <div
      ref={ref}
      data-edit-property-exempt
      style={{ position: "fixed", top, left, zIndex: 9999, width: W }}
      className="rounded-md border border-border bg-popover p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        type={inputType}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { committedRef.current = true; onClose(); }
        }}
        placeholder={property.name}
        className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
      />
    </div>,
    document.body,
  );
}
