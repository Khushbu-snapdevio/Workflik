"use client";

import { useState } from "react";
import { PlusIcon, SquaresFourIcon, LightningIcon, ChartBarIcon, MegaphoneSimpleIcon } from "@phosphor-icons/react";
import { TemplateGalleryModal } from "@/components/templates/template-gallery-modal";

interface Props {
  workspaceId:   string;
  workspaceSlug: string;
}

const QUICK_TEMPLATES = [
  { icon: "✅", title: "Tasks Tracker",       description: "Stay organized with tasks, your way.",                 category: "Productivity", categoryKey: "productivity" },
  { icon: "📅", title: "Meeting Notes",        description: "Capture every meeting, stay on top of every decision.", category: "Productivity", categoryKey: "productivity" },
  { icon: "🔵", title: "Projects",             description: "Manage and execute projects from start to finish.",    category: "Project Mgmt", categoryKey: "project_mgmt" },
  { icon: "🚩", title: "Campaign Management",  description: "Plan and track your campaigns.",                       category: "Marketing",    categoryKey: "marketing" },
];

const CATEGORY_HIGHLIGHTS = [
  { key: "productivity", label: "Productivity",  Icon: LightningIcon,       count: 4 },
  { key: "project_mgmt", label: "Project Mgmt",  Icon: ChartBarIcon,        count: 4 },
  { key: "marketing",    label: "Marketing",      Icon: MegaphoneSimpleIcon, count: 4 },
];

export function TemplatesPageClient({ workspaceId, workspaceSlug }: Props) {
  const [showGallery, setShowGallery]       = useState(false);
  const [initialCategory, setInitialCategory] = useState<string | undefined>();

  function openGallery(category?: string) {
    setInitialCategory(category);
    setShowGallery(true);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Topbar */}
      <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1380px] items-center justify-between px-8 py-3">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-foreground">Templates</h1>
            <p className="text-xs text-muted-foreground">Browse built-in templates or use one saved in this workspace</p>
          </div>
          <button
            type="button"
            onClick={() => openGallery()}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:bg-[var(--primary-hover)] active:scale-[0.97]"
          >
            <PlusIcon size={13} weight="bold" />
            Browse Templates
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1380px] px-8 py-8">

          {/* Hero banner */}
          <div
            onClick={() => openGallery()}
            className="group relative mb-8 cursor-pointer overflow-hidden rounded-[var(--radius-xl)] border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] p-8 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-raised)]"
          >
            {/* Dot grid overlay */}
            <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "radial-gradient(circle, #0284C7 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

            <div className="relative flex items-center justify-between">
              <div>
                <div className="mb-3 flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 ring-1 ring-primary/20">
                  <SquaresFourIcon size={24} weight="duotone" className="text-primary" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Browse the template gallery</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick from 16 built-in templates or your workspace templates
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-card)] transition-all group-hover:bg-[var(--primary-hover)] active:scale-[0.97]"
                >
                  <PlusIcon size={12} weight="bold" />
                  Open Gallery
                </button>
              </div>

              {/* Right side decorative cards */}
              <div className="hidden shrink-0 items-end gap-2 lg:flex">
                {["📋", "📊", "🎯", "📅"].map((emoji, i) => (
                  <div
                    key={i}
                    style={{ transform: `translateY(${i % 2 === 0 ? "4px" : "-4px"})` }}
                    className="flex h-[72px] w-[54px] flex-col overflow-hidden rounded-[var(--radius-md)] border border-primary/20 bg-white/80 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex h-8 items-center justify-center bg-primary/[0.08]">
                      <span className="text-base leading-none">{emoji}</span>
                    </div>
                    <div className="flex-1 space-y-1 p-1.5">
                      <div className="h-1 w-full rounded-full bg-primary/20" />
                      <div className="h-1 w-3/4 rounded-full bg-primary/10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category chips */}
          <div className="mb-5 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Categories:</span>
            {CATEGORY_HIGHLIGHTS.map(({ label, Icon, count, key }) => (
              <button
                key={label}
                type="button"
                onClick={() => openGallery(key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary"
              >
                <Icon size={11} />
                {label}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-muted-foreground">{count}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => openGallery()}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary"
            >
              View all →
            </button>
          </div>

          {/* Quick access cards */}
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Popular Templates</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_TEMPLATES.map(({ icon, title, description, category, categoryKey }) => (
              <button
                key={title}
                type="button"
                onClick={() => openGallery(categoryKey)}
                className="group flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border/60 bg-card text-left shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]"
              >
                {/* Cover */}
                <div className="relative flex h-[72px] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.05] to-primary/[0.1]">
                  <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "radial-gradient(circle, #0284C7 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                  <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-primary/10 to-transparent" />
                  <span className="relative z-10 text-[28px] transition-transform duration-200 group-hover:scale-110">{icon}</span>
                </div>
                {/* Text */}
                <div className="flex flex-1 flex-col p-3">
                  <p className="text-[12.5px] font-semibold leading-snug text-foreground">{title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground/65">{description}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9.5px] font-semibold text-primary">
                      {category}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>

      {showGallery && (
        <TemplateGalleryModal
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          initialCategory={initialCategory}
          onClose={() => { setShowGallery(false); setInitialCategory(undefined); }}
        />
      )}
    </div>
  );
}
