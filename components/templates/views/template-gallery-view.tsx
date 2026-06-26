"use client";

import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { DatabaseView, DatabaseProperty } from "@/lib/db/schema";
import type { TemplateEntry } from "../template-page-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <>
      <div className="h-full overflow-auto p-4 pb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group relative flex flex-col cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border border-border/50 bg-card transition-all hover:border-border"
              onClick={() => onClickEntry(entry.id)}
            >
              {/* Cover area */}
              <div className="h-[140px] w-full shrink-0 bg-primary/10" />

              {/* Title + actions row */}
              <div className="flex min-h-[40px] items-center gap-1 px-3 py-2.5">
                <p className="flex-1 truncate text-sm font-medium text-foreground">
                  {entry.title || <span className="text-muted-foreground/70">Untitled</span>}
                </p>

                {/* Hover actions */}
                <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                  <Link
                    href={`/app/${workspaceSlug}/${entry.shortId}`}
                    onClick={(e) => e.stopPropagation()}
                    title="Open page"
                    className="flex size-[22px] items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <ExternalLink size={12} />
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry.id); }}
                    title="Delete"
                    className="flex size-[22px] items-center justify-center rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* New page card */}
          <button
            onClick={() => onAddEntry()}
            className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border/50 text-muted-foreground/70 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary/60"
          >
            <Plus size={18} />
            <span className="text-sm font-medium">New page</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete entry?"
        description="This entry will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { onDeleteEntry(deleteTarget); setDeleteTarget(null); } }}
      />
    </>
  );
}
