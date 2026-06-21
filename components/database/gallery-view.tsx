"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowSquareOut, Trash, SquaresFour } from "@phosphor-icons/react";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { getOptionColor } from "@/components/database/property-registry";
import type { SharedViewProps, SelectOption, DbEntry } from "@/components/database/types";

const ENTRY_BG_COLORS = [
  "from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-950/10",
  "from-violet-100 to-violet-50 dark:from-violet-950/40 dark:to-violet-950/10",
  "from-emerald-100 to-emerald-50 dark:from-emerald-950/40 dark:to-emerald-950/10",
  "from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-amber-950/10",
  "from-rose-100 to-rose-50 dark:from-rose-950/40 dark:to-rose-950/10",
  "from-cyan-100 to-cyan-50 dark:from-cyan-950/40 dark:to-cyan-950/10",
  "from-orange-100 to-orange-50 dark:from-orange-950/40 dark:to-orange-950/10",
  "from-teal-100 to-teal-50 dark:from-teal-950/40 dark:to-teal-950/10",
];
function entryBgColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ENTRY_BG_COLORS[h % ENTRY_BG_COLORS.length];
}

const SIZE_COVER: Record<string, string> = {
  small:  "h-28",
  medium: "h-44",
  large:  "h-60",
};
const SIZE_GRID: Record<string, string> = {
  small:  "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  medium: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  large:  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

export function GalleryView({
  workspaceSlug, entries, properties, valueMap, activeView, isEditor,
  onCreateEntry, onDeleteEntry, onOpenEntry,
}: SharedViewProps) {
  const cardSize           = activeView?.galleryCardSize ?? "medium";
  const cardDisplayPropIds = (activeView?.cardDisplayProps ?? []) as string[];
  const entryOpenMode      = activeView?.entryOpenMode ?? "side_panel";

  const displayProps = cardDisplayPropIds.length > 0
    ? cardDisplayPropIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as typeof properties
    : properties.filter((p) => !p.isSystem).slice(0, 3);

  // Grouping
  const groupPropId = activeView?.groupByPropertyId;
  const groupProp   = groupPropId ? properties.find((p) => p.id === groupPropId && p.type === "select") : null;

  type Group = { id: string | null; label: string; color: string | null; entries: DbEntry[] };
  let groups: Group[] = [];
  if (groupProp) {
    const options = (groupProp.config?.options ?? []) as SelectOption[];
    groups = [
      { id: null, label: `No ${groupProp.name}`, color: null, entries: [] },
      ...options.map((o) => ({ id: o.id, label: o.name, color: o.color, entries: [] as DbEntry[] })),
    ];
    for (const entry of entries) {
      const val = valueMap.get(entry.id)?.get(groupPropId!) as { optionId?: string } | null;
      const g   = groups.find((gr) => gr.id === (val?.optionId ?? null)) ?? groups[0];
      g.entries.push(entry);
    }
    groups = groups.filter((g) => g.entries.length > 0 || g.id === null);
  }

  function renderCards(list: DbEntry[]) {
    return list.map((entry) => (
      <GalleryCard
        key={entry.id}
        entry={entry}
        displayProps={displayProps}
        valueMap={valueMap}
        workspaceSlug={workspaceSlug}
        cardSize={cardSize}
        isEditor={isEditor}
        onDeleteEntry={onDeleteEntry}
        onOpenEntry={onOpenEntry}
        entryOpenMode={entryOpenMode}
      />
    ));
  }

  if (groupProp) {
    return (
      <div className="h-full overflow-auto px-5 py-4">
        {groups.map((group) => {
          const color = group.color ? getOptionColor(group.color) : null;
          return (
            <div key={group.id ?? "no-group"} className="mb-6">
              <div className="mb-3 flex items-center gap-2.5">
                {group.id && color ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide ${color.bg} ${color.text}`}>
                    <span className={`size-1.5 rounded-full ${color.dot}`} />
                    {group.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                    {group.label}
                  </span>
                )}
                <span className="text-xs text-muted-foreground/40">{group.entries.length}</span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
              <div className={`grid gap-4 ${SIZE_GRID[cardSize]}`}>
                {renderCards(group.entries)}
                {isEditor && (
                  <button
                    onClick={() => onCreateEntry(group.id ? { [groupPropId!]: { optionId: group.id } } : {})}
                    className={[
                      "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-border/40 bg-muted/20",
                      "text-muted-foreground/40 transition-colors hover:border-primary/30 hover:bg-primary/[0.03] hover:text-primary",
                      "h-24",
                    ].join(" ")}
                  >
                    <Plus size={16} />
                    <span className="text-xs font-medium">New entry</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className={`grid gap-4 ${SIZE_GRID[cardSize]}`}>
        {renderCards(entries)}

        {/* Add entry card */}
        {isEditor && (
          <button
            onClick={() => onCreateEntry()}
            className={[
              "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-border/40 bg-muted/20",
              "text-muted-foreground/40 transition-colors hover:border-primary/30 hover:bg-primary/[0.03] hover:text-primary",
              SIZE_COVER[cardSize],
            ].join(" ")}
          >
            <Plus size={20} />
            <span className="text-xs font-medium">New entry</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Gallery card ──────────────────────────────────────────────────────────────

interface GalleryCardProps {
  entry: SharedViewProps["entries"][number];
  displayProps: SharedViewProps["properties"];
  valueMap: Map<string, Map<string, unknown>>;
  workspaceSlug: string;
  cardSize: string;
  isEditor: boolean;
  onDeleteEntry: SharedViewProps["onDeleteEntry"];
  onOpenEntry?: SharedViewProps["onOpenEntry"];
  entryOpenMode?: "side_panel" | "full_page";
}

function GalleryCard({ entry, displayProps, valueMap, workspaceSlug, cardSize, isEditor, onDeleteEntry, onOpenEntry, entryOpenMode }: GalleryCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const filledProps = displayProps.filter((prop) => {
    const raw = valueMap.get(entry.id)?.get(prop.id) ?? null;
    if (raw == null) return false;
    if (typeof raw !== "object") return true;
    return Object.values(raw as Record<string, unknown>).some(
      (v) => v != null && !(Array.isArray(v) && v.length === 0) && v !== "" && v !== false
    );
  });

  if (confirming) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-red-200 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <Trash size={16} className="text-red-600 dark:text-red-400" />
        </div>
        <div className="w-full text-center">
          <p className="text-sm font-semibold text-foreground">Delete entry?</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            <span className="font-medium">{entry.title || "Untitled"}</span> will be removed.
          </p>
        </div>
        <div className="flex w-full flex-col gap-1.5">
          <button
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onDeleteEntry(entry.id);
              setDeleting(false);
              setConfirming(false);
            }}
            className="w-full whitespace-nowrap rounded-[var(--radius-md)] bg-red-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="w-full whitespace-nowrap rounded-[var(--radius-md)] border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const isSidePanel = entryOpenMode === "side_panel" && !!onOpenEntry;

  return (
    <div className="group/card relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]">
      {/* Action buttons — top-right, visible on hover */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
        <Link
          href={`/app/${workspaceSlug}/${entry.shortId}`}
          onClick={(e) => e.stopPropagation()}
          title="Open full page"
          className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-background/80 text-foreground/60 shadow-[var(--shadow-card)] backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
        >
          <ArrowSquareOut size={13} />
        </Link>
        {isEditor && (
          <button
            onClick={() => setConfirming(true)}
            title="Delete entry"
            className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-background/80 text-foreground/60 shadow-[var(--shadow-card)] backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
          >
            <Trash size={13} />
          </button>
        )}
      </div>

      {/* Cover area */}
      {isSidePanel ? (
        <button
          onClick={() => onOpenEntry!(entry)}
          className={`relative block w-full shrink-0 overflow-hidden ${SIZE_COVER[cardSize]}`}
        >
          {entry.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.coverUrl}
              alt={entry.title ?? "Entry cover"}
              className="size-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            />
          ) : (
            <div className={`flex size-full items-center justify-center bg-gradient-to-br ${entryBgColor(entry.id)}`}>
              {entry.icon ? (
                <span className="text-4xl">{entry.icon}</span>
              ) : (
                <SquaresFour size={28} className="text-muted-foreground/15" weight="duotone" />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 transition-all group-hover/card:bg-black/10" />
        </button>
      ) : (
        <Link
          href={`/app/${workspaceSlug}/${entry.shortId}`}
          className={`relative block w-full shrink-0 overflow-hidden ${SIZE_COVER[cardSize]}`}
        >
          {entry.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.coverUrl}
              alt={entry.title ?? "Entry cover"}
              className="size-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            />
          ) : (
            <div className={`flex size-full items-center justify-center bg-gradient-to-br ${entryBgColor(entry.id)}`}>
              {entry.icon ? (
                <span className="text-4xl">{entry.icon}</span>
              ) : (
                <SquaresFour size={28} className="text-muted-foreground/15" weight="duotone" />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 transition-all group-hover/card:bg-black/10" />
        </Link>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
        {isSidePanel ? (
          <button onClick={() => onOpenEntry!(entry)} className="text-left">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground transition-colors hover:text-primary">
              {entry.title || <span className="font-normal text-muted-foreground/35">Untitled</span>}
            </p>
          </button>
        ) : (
          <Link href={`/app/${workspaceSlug}/${entry.shortId}`}>
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground transition-colors hover:text-primary">
              {entry.title || <span className="font-normal text-muted-foreground/35">Untitled</span>}
            </p>
          </Link>
        )}

        {filledProps.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {filledProps.map((prop) => {
              const raw = valueMap.get(entry.id)?.get(prop.id) ?? null;
              return (
                <div key={prop.id} className="flex items-center gap-1.5 overflow-hidden">
                  <span className="shrink-0 text-[10px] font-medium text-muted-foreground/50">
                    {prop.name}
                  </span>
                  <div className="min-w-0 overflow-hidden">
                    <CellDisplay property={prop} value={raw} compact />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
