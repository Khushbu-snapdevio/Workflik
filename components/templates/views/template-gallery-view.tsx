"use client";

import { PlusIcon, TrashIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";

// ── Gradient fallbacks (cycle by index when no cover) ─────────────────────────

const CARD_GRADIENTS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#ffecd2,#fcb69f)",
  "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
];

function cardGradient(index: number) {
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
}

// ── Option color badges ───────────────────────────────────────────────────────

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
  default:    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function optionCls(color: string) {
  return OPTION_COLORS[color] ?? OPTION_COLORS.default;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PropOption     = { id: string; name: string; color: string };
type PropConfig     = { options?: PropOption[] };
type SelectVal      = { optionId?: string };
type MultiSelectVal = { optionIds?: string[] };

// ── Main gallery view ─────────────────────────────────────────────────────────

interface Props {
  entries:          TemplateEntry[];
  properties:       DatabaseProperty[];
  activeView:       DatabaseView;
  entryValueMap:    Map<string, Map<string, unknown>>;
  workspaceSlug:    string;
  onAddEntry:       (defaultValues?: Record<string, unknown>) => void;
  onDeleteEntry:    (entryId: string) => void;
  onClickEntry:     (entryId: string) => void;
}

export function TemplateGalleryView({
  entries, properties, entryValueMap, workspaceSlug, onAddEntry, onDeleteEntry, onClickEntry,
}: Props) {
  // Show first 2 non-hidden select/multi-select props as badges
  const badgeProps = properties
    .filter((p) => !p.isHidden && (p.type === "select" || p.type === "multi_select"))
    .slice(0, 2);

  return (
    <div className="h-full overflow-auto p-6">
      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {entries.map((entry, i) => {
          const valMap = entryValueMap.get(entry.id) ?? new Map<string, unknown>();

          return (
            <div
              key={entry.id}
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border/50 bg-background shadow-sm transition-all hover:border-border hover:shadow-md"
              onClick={() => onClickEntry(entry.id)}
            >
              {/* Card cover / gradient header */}
              <div
                className="h-[100px] w-full shrink-0"
                style={{ background: cardGradient(i) }}
              />

              {/* Card body */}
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
                  {entry.title || <span className="text-muted-foreground/40">Untitled</span>}
                </p>

                {/* Property badges */}
                {badgeProps.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {badgeProps.flatMap((prop) => {
                      const config = (prop.config ?? {}) as PropConfig;
                      const raw    = valMap.get(prop.id);
                      if (!raw) return [];

                      if (prop.type === "select") {
                        const sv  = raw as SelectVal;
                        const opt = config.options?.find((o) => o.id === sv.optionId);
                        if (!opt) return [];
                        return [
                          <span key={prop.id} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${optionCls(opt.color)}`}>
                            {opt.name}
                          </span>,
                        ];
                      }

                      if (prop.type === "multi_select") {
                        const msv  = raw as MultiSelectVal;
                        const opts = (msv.optionIds ?? [])
                          .map((id) => config.options?.find((o) => o.id === id))
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
              </div>

              {/* Hover actions */}
              <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
                <Link
                  href={`/app/${workspaceSlug}/${entry.shortId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex size-6 items-center justify-center rounded-md bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                  title="Open page"
                >
                  <ArrowSquareOutIcon size={12} />
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                  className="flex size-6 items-center justify-center rounded-md bg-black/40 text-white backdrop-blur-sm hover:bg-destructive/80 transition-colors"
                  title="Delete"
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add card */}
        <button
          onClick={() => onAddEntry()}
          className="flex h-[185px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-muted">
            <PlusIcon size={18} weight="bold" />
          </div>
          <span className="text-[13px] font-medium">New entry</span>
        </button>
      </div>
    </div>
  );
}
