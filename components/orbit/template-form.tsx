"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TemplateEditor } from "./template-editor";
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
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function handleDelete() {
    if (!template) return;
    setConfirmDelete(true);
  }

  async function doDelete() {
    await fetch(`/api/orbit/templates/${template!.id}`, { method: "DELETE" });
    router.push("/orbit-admin/orbit/templates");
    router.refresh();
  }

  return (
    <>
    <div className="max-w-3xl space-y-6">
      {/* Name + Icon row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Template name <span className="text-destructive">*</span>
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
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Icon <span className="font-normal text-muted-foreground/60 text-xs">(emoji)</span>
          </label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="📋"
            className="w-20 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-center text-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          Description <span className="font-normal text-muted-foreground/60 text-xs">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="What is this template for? Shown in the gallery."
          rows={2}
          className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Category */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              className={[
                "rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm font-medium transition-colors",
                category === cat.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent",
              ].join(" ")}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content editor */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">
          Template Content
          <span className="ml-2 font-normal text-muted-foreground/60 text-xs">
            — Write like a normal page. Press <kbd className="rounded border border-border bg-muted px-1 text-xs">/</kbd> for blocks.
          </span>
        </label>
        <TemplateEditor
          initialBlocks={blocks}
          onChange={setBlocks}
        />
      </div>

      {error && (
        <div className="rounded-[var(--radius-sm)] bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors duration-150"
          >
            <Trash2 size={14} />
            Delete Template
          </button>
        ) : <div />}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-[var(--radius-sm)] border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-[var(--radius-sm)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Template"}
          </button>
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
