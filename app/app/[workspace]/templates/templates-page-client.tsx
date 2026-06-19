"use client";

import { useState } from "react";
import { PlusIcon, CopyIcon, TrashIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { TemplateGalleryModal } from "@/components/templates/template-gallery-modal";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isBuiltIn: boolean;
  createdAt: string;
};

interface Props {
  workspaceId:   string;
  workspaceSlug: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  productivity: "Productivity",
  project_mgmt: "Project Mgmt",
  marketing:    "Marketing & Content",
  engineering:  "Engineering & Docs",
  sales:        "Sales & Finance",
};

export function TemplatesPageClient({ workspaceId, workspaceSlug }: Props) {
  const [showGallery, setShowGallery] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="mx-auto w-full max-w-3xl px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse built-in templates or use one saved in this workspace
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGallery(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <PlusIcon size={14} weight="bold" />
            Browse Templates
          </button>
        </div>

        {/* Empty workspace templates hint */}
        <div
          onClick={() => setShowGallery(true)}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/50 p-12 text-center transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50">
            <SquaresFourIcon size={26} className="text-muted-foreground/40" weight="duotone" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Browse the template gallery</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Pick from 16 built-in templates or your workspace templates
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-muted px-4 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted/80"
          >
            Open Gallery
          </button>
        </div>

        {/* Quick action cards */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <QuickCard
            icon="✅"
            title="Tasks Tracker"
            category="productivity"
            description="Stay organized with tasks, your way."
            onClick={() => setShowGallery(true)}
          />
          <QuickCard
            icon="📅"
            title="Meeting Notes"
            category="productivity"
            description="Capture every meeting, stay on top of every decision."
            onClick={() => setShowGallery(true)}
          />
          <QuickCard
            icon="🔵"
            title="Projects"
            category="project_mgmt"
            description="Manage and execute projects from start to finish."
            onClick={() => setShowGallery(true)}
          />
          <QuickCard
            icon="🚩"
            title="Campaign Management"
            category="marketing"
            description="Plan and track your campaigns."
            onClick={() => setShowGallery(true)}
          />
        </div>
      </div>

      {showGallery && (
        <TemplateGalleryModal
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}

function QuickCard({
  icon, title, description, onClick,
}: {
  icon: string;
  title: string;
  category: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
