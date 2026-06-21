"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, X } from "@phosphor-icons/react";
import { OPTION_COLORS, getOptionColor } from "@/components/database/property-registry";
import type { DbProperty, DbPropertyConfig, SelectOption, WorkspaceMember } from "@/components/database/types";
import { createId } from "@paralleldrive/cuid2";

interface CellEditorProps {
  property: DbProperty;
  value: unknown;
  cellRect: DOMRect;
  workspaceId: string;
  onSave: (value: unknown) => void;
  onClose: () => void;
  onPropertyConfigChange?: (propId: string, config: DbPropertyConfig) => void;
}

export function CellEditorPopover(props: CellEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<CellEditorInner {...props} />, document.body);
}

function CellEditorInner({ property, value, cellRect, workspaceId, onSave, onClose, onPropertyConfigChange }: CellEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Position: prefer below cell, flip up if off-screen
  const top = Math.min(cellRect.bottom + 4, window.innerHeight - 320);
  const left = Math.min(cellRect.left, window.innerWidth - 260);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
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

  const baseStyle: React.CSSProperties = {
    position: "fixed",
    top,
    left,
    zIndex: 200,
    minWidth: 240,
    maxWidth: 320,
  };

  return (
    <div ref={ref} style={baseStyle} className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background shadow-[var(--shadow-raised)]">
      {(property.type === "select" || property.type === "multi_select") && (
        <SelectEditor
          property={property}
          value={value}
          multi={property.type === "multi_select"}
          onSave={onSave}
          onClose={onClose}
          onConfigChange={onPropertyConfigChange ? (cfg) => onPropertyConfigChange(property.id, cfg) : undefined}
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
}

function SelectEditor({ property, value, multi, onSave, onClose, onConfigChange }: SelectEditorProps) {
  const currentId  = multi ? null : ((value as { optionId?: string } | null)?.optionId ?? null);
  const currentIds = multi ? ((value as { optionIds?: string[] } | null)?.optionIds ?? []) : [];
  const [options, setOptions]   = useState<SelectOption[]>((property.config?.options ?? []) as SelectOption[]);
  const [search, setSearch]     = useState("");
  const [colorPick, setColorPick] = useState<string | null>(null);

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

  function createOption() {
    const name = search.trim();
    if (!name) return;
    const newOpt: SelectOption = { id: createId(), name, color: "gray" };
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

  function recolorOption(optId: string, color: string) {
    const newOptions = options.map((o) => (o.id === optId ? { ...o, color } : o));
    setOptions(newOptions);
    saveOptionsConfig(newOptions);
    setColorPick(null);
  }

  return (
    <div className="flex flex-col">
      {/* Search input */}
      <div className="border-b border-border px-3 py-2">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) createOption();
            if (e.key === "Enter" && filtered.length === 1) { toggle(filtered[0].id); if (!multi) onClose(); }
          }}
          placeholder="Search or create…"
          className="w-full bg-transparent text-xs placeholder:text-muted-foreground/40 focus:outline-none"
        />
      </div>

      {/* Options list */}
      <div className="max-h-52 overflow-y-auto p-1">
        {filtered.map((opt) => {
          const color    = getOptionColor(opt.color);
          const selected = multi ? currentIds.includes(opt.id) : currentId === opt.id;
          return (
            <div key={opt.id} className="group/opt relative flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent">
              <button
                onClick={() => toggle(opt.id)}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>
                  <span className={`size-1.5 shrink-0 rounded-full ${color.dot}`} />
                  {opt.name}
                </span>
              </button>
              {selected && <Check size={13} className="shrink-0 text-primary" weight="bold" />}

              {/* Color picker trigger */}
              <button
                onClick={(e) => { e.stopPropagation(); setColorPick(colorPick === opt.id ? null : opt.id); }}
                className="ml-auto hidden size-5 items-center justify-center rounded text-muted-foreground/40 hover:bg-muted group-hover/opt:flex"
                title="Change color"
              >
                <span className={`size-3 rounded-full ${color.dot}`} />
              </button>

              {/* Color palette */}
              {colorPick === opt.id && (
                <div className="absolute right-8 top-0 z-10 flex gap-1 rounded-[var(--radius-md)] border border-border bg-background p-2 shadow-[var(--shadow-float)]">
                  {OPTION_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={(e) => { e.stopPropagation(); recolorOption(opt.id, c.id); }}
                      className={`size-4 rounded-full ${c.dot} ring-offset-1 hover:ring-2 hover:ring-primary/50`}
                      title={c.id}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {canCreate && (
          <button
            onClick={createOption}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            <Plus size={12} />
            Create <span className="font-medium text-foreground">"{search}"</span>
          </button>
        )}

        {!filtered.length && !canCreate && (
          <p className="px-3 py-2 text-xs text-muted-foreground/60">No options</p>
        )}
      </div>
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
  // Convert ISO to yyyy-mm-dd for <input type="date">
  const [dateStr, setDateStr] = useState(raw ? raw.slice(0, 10) : "");

  function save() {
    onSave({ date: dateStr || null });
    onClose();
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-xs font-medium text-muted-foreground">Select date</p>
      <input
        type="date"
        autoFocus
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }}
        className="rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex gap-2">
        {dateStr && (
          <button
            onClick={() => { onSave({ date: null }); onClose(); }}
            className="flex-1 rounded-[var(--radius-sm)] border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Clear
          </button>
        )}
        <button
          onClick={save}
          className="flex-1 rounded-[var(--radius-sm)] bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Apply
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
  const [members, setMembers]   = useState<WorkspaceMember[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);

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
        name: toggled.userName ?? toggled.userEmail ?? userId,
        email: toggled.userEmail ?? "",
      }];
    }
    onSave({ userIds: next, _members: nextMembers });
  }

  return (
    <div className="flex flex-col">
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
        {!loading && filtered.map((m) => {
          const selected = selectedIds.includes(m.userId);
          const initials = (m.userName ?? m.userEmail ?? "?").slice(0, 1).toUpperCase();
          return (
            <button
              key={m.userId}
              onClick={() => toggle(m.userId)}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-accent"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {initials}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-medium text-foreground">{m.userName ?? m.userEmail}</p>
                {m.userName && <p className="truncate text-xs text-muted-foreground">{m.userEmail}</p>}
              </span>
              {selected && <Check size={13} className="shrink-0 text-primary" weight="bold" />}
            </button>
          );
        })}
        {!loading && !filtered.length && (
          <p className="px-3 py-2 text-xs text-muted-foreground/60">No members found</p>
        )}
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
  const relDbId     = property.config?.relatedDatabaseId;
  const [entries, setEntries] = useState<{ id: string; title: string | null }[]>([]);
  const [search, setSearch]   = useState("");
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
              {selected && <Check size={13} className="shrink-0 text-primary" weight="bold" />}
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
