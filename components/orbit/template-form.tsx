"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Smile } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TemplateEditor } from "./template-editor";
import { IconPicker } from "@/components/pages/icon-picker";
import { PageIcon } from "@/components/pages/page-icon";
import type { DbBlock } from "@/components/editor/serializer";

const CATEGORIES = [
  { key: "productivity", label: "Productivity" },
  { key: "project_mgmt", label: "Project Management" },
  { key: "marketing",    label: "Marketing & Content" },
  { key: "engineering",  label: "Engineering & Docs" },
  { key: "sales",        label: "Sales & Finance" },
] as const;

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
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
  const [category, setCategory]   = useState(template?.category ?? "productivity");
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
        category,
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
                role="button"
                tabIndex={0}
                onClick={() => setEmojiOpen(v => !v)}
                onKeyDown={(e) => e.key === "Enter" && setEmojiOpen(v => !v)}
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
              {emojiOpen && (
                <IconPicker
                  onSelect={(v) => { setIcon(v); setEmojiOpen(false); }}
                  onIconPreview={(v) => setIcon(v)}
                  onRemove={icon ? () => { setIcon(""); setEmojiOpen(false); } : undefined}
                  onClose={() => setEmojiOpen(false)}
                />
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
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={[
                    "w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-medium transition-colors",
                    category === cat.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                >
                  {cat.label}
                </button>
              ))}
            </div>
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
    </>
  );
}
