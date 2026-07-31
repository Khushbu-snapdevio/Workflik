"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Database as DatabaseIcon, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getClampedLeft, getClampedTop } from "@/lib/ui/clamp-to-viewport";

interface DatabaseOption {
  id: string;
  title: string | null;
  shortId: string;
}

interface RelationDatabasePickerProps {
  rect: DOMRect;
  workspaceId: string;
  onBack: () => void;
  onClose: () => void;
  /** Self-relations (relating a database to itself, for hierarchies like
   *  "Sub-tasks") are valid in Notion, so the current database is never
   *  excluded from the results — only the workspace's own set of databases
   *  scopes the search. */
  onPick: (relatedDatabaseId: string, twoWay: boolean) => void;
}

// Reuses the same workspace-database search endpoint InlineDatabase's
// "link existing" flow already uses (components/editor/extensions/reference-blocks.tsx),
// rather than a second bespoke search implementation.
export function RelationDatabasePicker({ rect, workspaceId, onBack, onClose, onPick }: RelationDatabasePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DatabaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DatabaseOption | null>(null);
  const [twoWay, setTwoWay] = useState(true);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/workspaces/${workspaceId}/databases?q=${encodeURIComponent(search)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: DatabaseOption[]) => setResults(Array.isArray(rows) ? rows : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(t);
  }, [search, workspaceId]);

  const width = 260;
  const height = selected ? 220 : 320;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      data-edit-property-exempt
      style={{ position: "fixed", top: getClampedTop(rect, height), left: getClampedLeft(rect, width, { align: "end" }), zIndex: 500, width }}
      className="flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
        <button
          type="button"
          onClick={selected ? () => setSelected(null) : onBack}
          className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft size={13} />
        </button>
        <p className="text-xs font-semibold text-foreground/80">
          {selected ? "Relate to a database" : "Select related database"}
        </p>
      </div>

      {!selected ? (
        <>
          <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
            <Search size={12} className="shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search databases…"
              className="w-full bg-transparent text-xs placeholder:text-muted-foreground-subtle focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {loading && <p className="px-3 py-2.5 text-xs text-muted-foreground">Loading…</p>}
            {!loading && results.length === 0 && (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">No databases found</p>
            )}
            {!loading && results.map((db) => (
              <button
                key={db.id}
                type="button"
                onClick={() => setSelected(db)}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent"
              >
                <DatabaseIcon size={13} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{db.title || "Untitled"}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-muted/30 px-2.5 py-2">
            <DatabaseIcon size={13} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{selected.title || "Untitled"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-foreground">Show on related database</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Adds a matching property there too</p>
            </div>
            <Switch checked={twoWay} onCheckedChange={(v) => setTwoWay(!!v)} aria-label="Two-way relation" />
          </div>
          <button
            type="button"
            onClick={() => onPick(selected.id, twoWay)}
            className="flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Check size={12} />
            Create relation
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
