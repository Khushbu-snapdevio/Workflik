"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon, ArrowSquareOutIcon, TrashIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";

// ── Colors ────────────────────────────────────────────────────────────────────

type ColStyle = { header: string; dot: string; badge: string };

const OPTION_STYLES: Record<string, ColStyle> = {
  red:        { header: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/40",         dot: "bg-red-500",    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"         },
  orange:     { header: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/40", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
  yellow:     { header: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/40", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
  green:      { header: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900/40",  dot: "bg-green-500",  badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"   },
  blue:       { header: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/40",     dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"       },
  purple:     { header: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/40", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  pink:       { header: "bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-900/40",     dot: "bg-pink-500",   badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400"       },
  brown:      { header: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40", dot: "bg-amber-600",  badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400"   },
  light_gray: { header: "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800",        dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"          },
  gray:       { header: "bg-gray-100 border-gray-300 dark:bg-gray-800/30 dark:border-gray-700",       dot: "bg-gray-500",   badge: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"          },
};

const OPTION_COLORS: Record<string, string> = {
  red:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  orange:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  yellow:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  green:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blue:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  pink:       "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  brown:      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  light_gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  gray:       "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

function getStyle(color: string): ColStyle {
  return OPTION_STYLES[color] ?? OPTION_STYLES.gray;
}

function optionCls(color: string) {
  return OPTION_COLORS[color] ?? OPTION_COLORS.gray;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PropOption     = { id: string; name: string; color: string };
type PropConfig     = { options?: PropOption[] };
type SelectVal      = { optionId?: string };
type MultiSelectVal = { optionIds?: string[] };

type Column = { optionId: string | null; label: string; color: string; entries: TemplateEntry[] };

// ── Inline card create input ──────────────────────────────────────────────────

function InlineCardInput({
  onConfirm, onCancel,
}: {
  onConfirm: (title: string) => void;
  onCancel:  () => void;
}) {
  const [val, setVal] = useState("");
  const ref           = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="rounded-lg border border-primary/50 bg-background p-3 shadow-sm">
      <textarea
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onConfirm(val.trim()); }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Card title…"
        rows={2}
        className="w-full resize-none bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => onConfirm(val.trim())}
          className="rounded-md bg-primary px-3 py-1 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Add card
        </button>
        <button
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main board view ───────────────────────────────────────────────────────────

interface Props {
  entries:          TemplateEntry[];
  properties:       DatabaseProperty[];
  activeView:       DatabaseView;
  entryValueMap:    Map<string, Map<string, unknown>>;
  workspaceSlug:    string;
  onAddEntry:       (defaultValues?: Record<string, unknown>, title?: string) => void;
  onDeleteEntry:    (entryId: string) => void;
  onClickEntry:     (entryId: string) => void;
  onUpdatePropValue:(entryId: string, propId: string, value: unknown) => void;
}

export function TemplateBoardView({
  entries, properties, activeView, entryValueMap, workspaceSlug, onAddEntry, onDeleteEntry, onClickEntry,
}: Props) {
  const [addingTo, setAddingTo] = useState<string | null>(null); // column optionId | "none"

  // Try configured groupBy first; fall back to first select property in the database
  const groupProp = properties.find((p) => p.id === activeView.groupByPropertyId)
    ?? properties.find((p) => p.type === "select");
  const groupConfig  = (groupProp?.config ?? {}) as PropConfig;
  const groupOptions = groupConfig.options ?? [];

  // Extra display properties (first 2 select/multi-select that aren't groupBy)
  const displayProps = properties
    .filter((p) => p.id !== groupProp?.id && (p.type === "select" || p.type === "multi_select") && !p.isHidden)
    .slice(0, 2);

  // Bucket entries by group option
  const buckets = new Map<string | null, TemplateEntry[]>();
  buckets.set(null, []);
  for (const opt of groupOptions) buckets.set(opt.id, []);

  for (const entry of entries) {
    const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();
    const raw    = groupProp ? valMap.get(groupProp.id) : undefined;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const sv = raw as SelectVal;
      if (sv.optionId && buckets.has(sv.optionId)) {
        buckets.get(sv.optionId)!.push(entry);
        continue;
      }
    }
    buckets.get(null)!.push(entry);
  }

  const columns: Column[] = [
    ...groupOptions.map((opt) => ({
      optionId: opt.id, label: opt.name, color: opt.color, entries: buckets.get(opt.id) ?? [],
    })),
    // Always show "No Status" column for unmatched entries
    { optionId: null, label: groupProp ? "No Status" : "All Items", color: "gray", entries: buckets.get(null)! },
  ].filter((col) => col.entries.length > 0 || groupOptions.length > 0);

  async function handleAddCard(optionId: string | null, title: string) {
    setAddingTo(null);
    const defaultValues: Record<string, unknown> = {};
    if (groupProp && optionId) {
      defaultValues[groupProp.id] = { optionId };
    }
    await onAddEntry(
      Object.keys(defaultValues).length ? defaultValues : undefined,
      title.trim() || undefined,
    );
  }

  return (
    <div className="flex h-full items-start gap-3 overflow-x-auto p-6">
      {columns.map((col) => {
        const style      = getStyle(col.color);
        const isAddingHere = addingTo === (col.optionId ?? "none");

        return (
          <div
            key={col.optionId ?? "none"}
            className="flex w-[272px] flex-shrink-0 flex-col rounded-xl border border-border/40 bg-muted/10 overflow-hidden"
          >
            {/* Column header */}
            <div className={`flex items-center justify-between border-b px-3 py-2.5 ${style.header}`}>
              <div className="flex items-center gap-2">
                <span className={`size-2 flex-shrink-0 rounded-full ${style.dot}`} />
                <span className="text-[13px] font-semibold text-foreground">{col.label}</span>
                <span className="flex min-w-[18px] items-center justify-center rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {col.entries.length}
                </span>
              </div>
              <button
                onClick={() => setAddingTo(col.optionId ?? "none")}
                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors"
              >
                <PlusIcon size={13} weight="bold" />
              </button>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
              {col.entries.map((entry) => {
                const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();

                return (
                  <div
                    key={entry.id}
                    className="group relative rounded-lg border border-border/50 bg-background p-3 shadow-sm transition-all hover:border-border hover:shadow-md cursor-pointer"
                    onClick={() => onClickEntry(entry.id)}
                  >
                    <p className="pr-5 text-[13px] font-medium leading-snug text-foreground">
                      {entry.title || <span className="text-muted-foreground/40">Untitled</span>}
                    </p>

                    {/* Property badges */}
                    {displayProps.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {displayProps.flatMap((dp) => {
                          const dpConfig = (dp.config ?? {}) as PropConfig;
                          const raw      = valMap.get(dp.id);
                          if (!raw) return [];

                          if (dp.type === "select") {
                            const sv  = raw as SelectVal;
                            const opt = dpConfig.options?.find((o) => o.id === sv.optionId);
                            if (!opt) return [];
                            return [
                              <span key={dp.id} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${optionCls(opt.color)}`}>
                                {opt.name}
                              </span>,
                            ];
                          }
                          if (dp.type === "multi_select") {
                            const msv  = raw as MultiSelectVal;
                            const opts = (msv.optionIds ?? [])
                              .map((id) => dpConfig.options?.find((o) => o.id === id))
                              .filter(Boolean)
                              .slice(0, 2) as PropOption[];
                            return opts.map((opt) => (
                              <span key={opt.id} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${optionCls(opt.color)}`}>
                                {opt.name}
                              </span>
                            ));
                          }
                          return [];
                        })}
                      </div>
                    )}

                    {/* Card actions */}
                    <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
                      <Link
                        href={`/app/${workspaceSlug}/${entry.shortId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Open page"
                      >
                        <ArrowSquareOutIcon size={11} />
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                        className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <TrashIcon size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Inline add card input */}
              {isAddingHere && (
                <InlineCardInput
                  onConfirm={(title) => handleAddCard(col.optionId, title)}
                  onCancel={() => setAddingTo(null)}
                />
              )}

              {col.entries.length === 0 && !isAddingHere && (
                <p className="py-4 text-center text-[12px] text-muted-foreground/40">No items</p>
              )}

              {/* Add card button at bottom of column */}
              {!isAddingHere && (
                <button
                  onClick={() => setAddingTo(col.optionId ?? "none")}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground/50 hover:bg-muted/30 hover:text-muted-foreground transition-colors"
                >
                  <PlusIcon size={12} weight="bold" />
                  Add card
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
