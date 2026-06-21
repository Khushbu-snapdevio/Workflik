"use client";

import { PlusIcon, TrashIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";

interface Props {
  entries:       TemplateEntry[];
  properties:    DatabaseProperty[];
  activeView:    DatabaseView;
  entryValueMap: Map<string, Map<string, unknown>>;
  workspaceSlug: string;
  onAddEntry:    (defaultValues?: Record<string, unknown>) => void;
  onDeleteEntry: (entryId: string) => void;
  onClickEntry:  (entryId: string) => void;
}

export function TemplateGalleryView({
  entries, workspaceSlug, onAddEntry, onDeleteEntry, onClickEntry,
}: Props) {
  return (
    <div className="h-full overflow-auto p-4 pb-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group relative flex flex-col cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border border-border/50 bg-card transition-all hover:border-border hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
            onClick={() => onClickEntry(entry.id)}
          >
            {/* Cover area — light primary tint consistent with the app color scheme */}
            <div className="h-[140px] w-full shrink-0 bg-primary/[0.08]" />

            {/* Title + actions row */}
            <div className="flex min-h-[40px] items-center gap-1 px-3 py-2.5">
              <p className="flex-1 truncate text-[13px] font-medium text-foreground">
                {entry.title || <span className="text-muted-foreground/40">Untitled</span>}
              </p>

              {/* Hover actions */}
              <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                <Link
                  href={`/app/${workspaceSlug}/${entry.shortId}`}
                  onClick={(e) => e.stopPropagation()}
                  title="Open page"
                  className="flex size-[22px] items-center justify-center rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ArrowSquareOutIcon size={12} />
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                  title="Delete"
                  className="flex size-[22px] items-center justify-center rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* New page card */}
        <button
          onClick={() => onAddEntry()}
          className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border/50 text-muted-foreground/40 transition-all hover:border-primary/40 hover:bg-primary/[0.02] hover:text-primary/60"
        >
          <PlusIcon size={18} weight="bold" />
          <span className="text-[13px] font-medium">New page</span>
        </button>
      </div>
    </div>
  );
}
