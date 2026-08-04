"use client";

import { useEffect, useRef, useState } from "react";
import { Popover, PopoverPanel, Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from "@headlessui/react";
import { ArrowLeft, Check, Database as DatabaseIcon, Search, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RectAnchorTrigger } from "@/components/database/rect-popover-anchor";
import { cn } from "@/lib/utils";

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
    function h(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest?.('[role="alertdialog"], [data-edit-property-exempt]')) return;
      if (ref.current && !ref.current.contains(target)) onClose();
    }
    function keyHandler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", keyHandler);
    };
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

  return (
    <Popover>
      <RectAnchorTrigger rect={rect} />
      <PopoverPanel
        ref={ref}
        static
        data-edit-property-exempt
        anchor={{ to: "bottom end", gap: 4 }}
        style={{ width }}
        className="z-500 flex flex-col overflow-hidden rounded-md border border-border bg-background"
      >
        <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
          <button
            type="button"
            onClick={selected ? () => setSelected(null) : onBack}
            aria-label="Back"
            className="flex size-5 shrink-0 items-center justify-center rounded-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft size={13} />
          </button>
          <p className="text-xs font-semibold text-foreground/80">
            {selected ? "Relate to a database" : "Select related database"}
          </p>
        </div>

        {!selected ? (
          <Combobox value={null} onChange={(db: DatabaseOption | null) => db && setSelected(db)}>
            <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
              <Search size={12} className="shrink-0 text-muted-foreground" />
              <ComboboxInput
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search databases…"
                className="w-full bg-transparent text-xs placeholder:text-muted-foreground-subtle focus:outline-none"
              />
            </div>
            <ComboboxOptions static className="max-h-56 overflow-y-auto p-1">
              {loading && (
                <p className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Loading…
                </p>
              )}
              {!loading && results.length === 0 && (
                <p className="px-3 py-2.5 text-xs text-muted-foreground">No databases found</p>
              )}
              {!loading && results.map((db) => (
                <ComboboxOption
                  key={db.id}
                  value={db}
                  className={({ focus }) => cn(
                    "flex w-full cursor-default items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm text-foreground",
                    focus && "bg-accent",
                  )}
                >
                  <DatabaseIcon size={13} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{db.title || "Untitled"}</span>
                </ComboboxOption>
              ))}
            </ComboboxOptions>
          </Combobox>
        ) : (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex items-center gap-2.5 rounded-sm bg-muted/30 px-2.5 py-2">
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
              className="flex items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Check size={12} />
              Create relation
            </button>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}
