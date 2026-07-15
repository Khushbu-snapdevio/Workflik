"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, Smile, Plus, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TemplateEditor } from "./template-editor";
import { IconPicker } from "@/components/pages/icon-picker";
import { PageIcon } from "@/components/pages/page-icon";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import type { DbBlock } from "@/components/editor/serializer";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";

// IconPicker renders itself as a fixed-size 352px-wide panel positioned
// "absolute left-0 top-full" relative to its nearest positioned ancestor —
// it needs to be portaled to <body> with viewport coordinates, otherwise it
// gets clipped (and forces horizontal scroll) inside any narrow/scrollable
// container like this form's 260px sidebar. Same pattern already used in
// workspace-general-section.tsx and entry-context-menu.tsx.
const ICON_PICKER_WIDTH = 352;
const ICON_PICKER_HEIGHT = 400;

type TemplateCategory = {
  id: string;
  key: string;
  label: string;
  orderIndex: number;
  templateCount: number;
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  pageSnapshot: {
    title?: string;
    icon?: string | null;
    blocks?: {
      id?: string;
      type: string;
      order_index?: number;
      parent_block_id?: string | null;
      content?: unknown;
    }[];
  };
};

function snapshotToDbBlocks(snapshot: TemplateRow["pageSnapshot"]): DbBlock[] {
  if (!snapshot.blocks || snapshot.blocks.length === 0) return [];
  return snapshot.blocks.map((b, i) => ({
    id:            b.id ?? `snap-${i}`,
    type:          b.type,
    content:       (b.content ?? null) as DbBlock["content"],
    orderIndex:    b.order_index ?? i,
    parentBlockId: b.parent_block_id ?? null,
  }));
}

interface Props {
  template?: TemplateRow;
}

export function TemplateForm({ template }: Props) {
  const router  = useRouter();
  const isEdit  = !!template;

  const [name, setName]           = useState(template?.name ?? "");
  const [description, setDesc]    = useState(template?.description ?? "");
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? "");
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<TemplateCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [icon, setIcon]           = useState(
    (template?.pageSnapshot as { icon?: string } | undefined)?.icon ?? ""
  );
  const [blocks, setBlocks]       = useState<DbBlock[]>(
    template ? snapshotToDbBlocks(template.pageSnapshot) : []
  );
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emojiOpen, setEmojiOpen]       = useState(false);
  const [iconPickerPos, setIconPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted]           = useState(false);
  const iconTriggerRef = useRef<HTMLDivElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/orbit/templates/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: TemplateCategory[]) => {
        setCategories(list);
        setCategoryId((current) => current || list[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  async function handleCreateCategory() {
    const label = newCategoryLabel.trim();
    if (!label) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/orbit/templates/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (res.ok) {
        const created = (await res.json()) as TemplateCategory;
        setCategories((prev) => [...prev, created]);
        setCategoryId(created.id);
        setNewCategoryLabel("");
        setNewCategoryOpen(false);
      }
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleDeleteCategory() {
    if (!categoryToDelete) return;
    setDeletingCategory(true);
    setCategoryError(null);
    try {
      const res = await fetch(`/api/orbit/templates/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setCategoryError(data.error ?? "Failed to delete category");
        return;
      }
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== categoryToDelete.id);
        setCategoryId((current) => (current === categoryToDelete.id ? next[0]?.id ?? "" : current));
        return next;
      });
      setCategoryToDelete(null);
    } finally {
      setDeletingCategory(false);
    }
  }

  // iconPickerPos is a `position: fixed` portal anchored to a rect
  // snapshotted once on open — lock page scroll while it's open instead of
  // repositioning, matching the pattern used by the app's other click-opened
  // popovers anchored via a one-time getBoundingClientRect() snapshot.
  useScrollLockWhileOpen(emojiOpen, (target) => !!iconPickerRef.current?.contains(target));

  function toggleEmojiOpen() {
    if (!emojiOpen && iconTriggerRef.current) {
      const rect = iconTriggerRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - ICON_PICKER_WIDTH - 8));
      const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - ICON_PICKER_HEIGHT));
      setIconPickerPos({ top, left });
    }
    setEmojiOpen((v) => !v);
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);

    const pageSnapshot = {
      title:           name.trim(),
      icon:            icon.trim() || null,
      cover_url:       null,
      is_full_width:   false,
      font_family:     "default",
      blocks:          blocks.map((b, i) => ({
        id:              b.id?.startsWith("tmp-") || b.id?.startsWith("snap-")
                           ? crypto.randomUUID()
                           : (b.id ?? crypto.randomUUID()),
        type:            b.type,
        content:         b.content ?? null,
        schema_version:  1,
        order_index:     i,
        parent_block_id: b.parentBlockId ?? null,
        children:        [],
      })),
      subpages:        [],
      database_schema: null,
    };

    const url    = isEdit ? `/api/orbit/templates/${template!.id}` : "/api/orbit/templates";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:        name.trim(),
        description: description.trim() || undefined,
        categoryId,
        pageSnapshot,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Failed to save template");
      return;
    }

    router.push("/orbit-admin/orbit/templates");
    router.refresh();
  }

  async function doDelete() {
    await fetch(`/api/orbit/templates/${template!.id}`, { method: "DELETE" });
    router.push("/orbit-admin/orbit/templates");
    router.refresh();
  }

  return (
    <>
    <div className="flex min-h-[600px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">

      {/* Left sidebar — w-[260px] matching settings sidebar */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-border/60 bg-sidebar">
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Template settings</p>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">

          {/* Icon picker */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Icon</label>
            <div className="relative">
              <div
                ref={iconTriggerRef}
                role="button"
                tabIndex={0}
                onClick={toggleEmojiOpen}
                onKeyDown={(e) => e.key === "Enter" && toggleEmojiOpen()}
                className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-background px-3 transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {icon ? (
                  <PageIcon icon={icon} size={20} />
                ) : (
                  <Smile size={16} className="shrink-0 text-muted-foreground/40" />
                )}
                <span className="flex-1 text-left text-xs text-muted-foreground/60">
                  {icon ? "Click to change" : "Pick an emoji icon"}
                </span>
                {icon && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIcon(""); }}
                    className="shrink-0 text-[10px] text-muted-foreground/40 hover:text-muted-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
              {mounted && emojiOpen && iconPickerPos && createPortal(
                <div ref={iconPickerRef} style={{ position: "fixed", top: iconPickerPos.top, left: iconPickerPos.left, zIndex: 9999 }}>
                  <div className="relative">
                    <IconPicker
                      onSelect={(v) => { setIcon(v); setEmojiOpen(false); }}
                      onIconPreview={(v) => setIcon(v)}
                      onRemove={icon ? () => { setIcon(""); setEmojiOpen(false); } : undefined}
                      onClose={() => setEmojiOpen(false)}
                    />
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meeting Notes"
              className="w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What is this template for?"
              rows={3}
              className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Category</label>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => {
                const inUse = cat.templateCount > 0;
                return (
                  <div
                    key={cat.id}
                    className={[
                      "group flex w-full items-center rounded-[var(--radius-sm)] pr-1 text-left text-xs font-medium transition-colors",
                      categoryId === cat.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className="flex flex-1 items-center gap-1.5 truncate px-3 py-2 text-left"
                    >
                      <span className="truncate">{cat.label}</span>
                      {inUse && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground/70">
                          {cat.templateCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-disabled={inUse}
                      aria-label={inUse ? `${cat.label} is used by ${cat.templateCount} template${cat.templateCount === 1 ? "" : "s"} and can't be deleted` : `Delete category ${cat.label}`}
                      onClick={(e) => { e.stopPropagation(); if (!inUse) setCategoryToDelete(cat); }}
                      onMouseEnter={(e) => inUse && showTooltip(`Used by ${cat.templateCount} template${cat.templateCount === 1 ? "" : "s"} — remove them first`, e)}
                      onMouseLeave={hideTooltip}
                      className={[
                        "shrink-0 rounded-[var(--radius-xs)] p-1.5 opacity-0 transition-colors group-hover:opacity-100",
                        inUse
                          ? "cursor-not-allowed text-muted-foreground/30"
                          : "text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive",
                      ].join(" ")}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {categoryError && (
              <p className="mt-1.5 text-xs text-destructive">{categoryError}</p>
            )}

            {newCategoryOpen ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                    if (e.key === "Escape") { setNewCategoryOpen(false); setNewCategoryLabel(""); }
                  }}
                  placeholder="New category name"
                  className="w-full rounded-[var(--radius-sm)] border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCategory || !newCategoryLabel.trim()}
                  className="shrink-0 rounded-[var(--radius-sm)] bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNewCategoryOpen(true)}
                className="mt-1.5 flex w-full items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-medium text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus size={12} />
                New category
              </button>
            )}
          </div>
        </div>

        {/* Sidebar footer — actions */}
        <div className="border-t border-border/60 p-4 space-y-2">
          {error && (
            <div className="rounded-[var(--radius-sm)] bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-[var(--radius-sm)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create template"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full rounded-[var(--radius-sm)] border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-4 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <Trash2 size={12} />
              Delete template
            </button>
          )}
        </div>
      </aside>

      {/* Right — content editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border/60 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Template content</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">/</kbd> for blocks
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <TemplateEditor
            initialBlocks={blocks}
            onChange={setBlocks}
          />
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title="Delete this template?"
      description={<>&ldquo;{template?.name}&rdquo; will be permanently deleted and cannot be recovered.</>}
      onConfirm={doDelete}
    />

    <ConfirmDialog
      open={!!categoryToDelete}
      onOpenChange={(open) => !open && setCategoryToDelete(null)}
      title="Delete this category?"
      description={<>&ldquo;{categoryToDelete?.label}&rdquo; will be permanently deleted. Categories still used by a template can&rsquo;t be deleted.</>}
      loading={deletingCategory}
      confirmLoadingLabel="Deleting…"
      onConfirm={handleDeleteCategory}
    />

    {mounted && tooltip && createPortal(
      <IconTooltip rect={tooltip.rect} label={tooltip.label} placement="below" />,
      document.body
    )}
    </>
  );
}
