"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, Smile, Plus, X, ImageIcon, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TemplateEditor } from "./template-editor";
import { IconPicker } from "@/components/pages/icon-picker";
import { PageIcon } from "@/components/pages/page-icon";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import type { DbBlock } from "@/components/editor/serializer";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { useUpload } from "@/lib/storage/use-upload";
import { SaveStatusIndicator, type SaveState } from "@/components/ui/save-status";

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
  status: string;
  pageSnapshot: {
    title?: string;
    icon?: string | null;
    cover_url?: string | null;
    blocks?: {
      id?: string;
      type: string;
      order_index?: number;
      parent_block_id?: string | null;
      content?: unknown;
    }[];
  };
};

function blockPlainText(content: unknown): string {
  const c = content as { text?: { text?: string }[] } | undefined;
  return (c?.text ?? []).map((t) => t.text ?? "").join("");
}

// Key-order-independent stringify — the DB→TipTap→DB round trip preserves
// content but not key order (e.g. a todo's {text,checked} comes back as
// {checked,text}), which plain JSON.stringify would report as a difference.
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
}

// Identity of the content itself, used to tell a real edit from editor
// bookkeeping. Three normalizations matter:
//   - block ids are excluded, because BlockIdAttr assigns missing ones via a
//     transaction on mount, firing onChange before the admin touches anything;
//   - empty paragraphs are dropped, because a brand-new template starts as []
//     while TipTap normalizes an empty doc to a single empty paragraph;
//   - key order is normalized, per stableStringify above.
// Dropping empty paragraphs also matches how publish-validation already
// decides whether a template "has content".
function blocksSignature(bs: DbBlock[]): string {
  return stableStringify(
    bs
      .filter((b) => b.type !== "paragraph" || blockPlainText(b.content).trim().length > 0)
      .map((b) => [b.type, b.content, b.parentBlockId])
  );
}

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
  const isPublished = template?.status === "published";

  const [name, setName]           = useState(template?.name ?? "");
  const [description, setDesc]    = useState(template?.description ?? "");
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? "");
  const [categorySearch, setCategorySearch] = useState("");
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
  const [coverUrl, setCoverUrl]   = useState<string | null>(template?.pageSnapshot.cover_url ?? null);
  const [removeCoverConfirm, setRemoveCoverConfirm] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const { upload: uploadCover, uploading: coverUploading } = useUpload({ kind: "template_cover" });
  const [saving, setSaving]             = useState<null | "draft" | "publish" | "update" | "unpublish">(null);
  const [error, setError]               = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emojiOpen, setEmojiOpen]       = useState(false);
  const [iconPickerPos, setIconPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted]           = useState(false);
  // Explicit-save editor, so "dirty" is tracked by hand rather than derived
  // from an autosave cycle. Cleared on a successful save; the "saved" flash
  // is transient since a successful save navigates back to the list.
  const [dirty, setDirty]               = useState(false);
  const initialBlocksSig = useRef(blocksSignature(
    template ? snapshotToDbBlocks(template.pageSnapshot) : []
  ));
  const iconTriggerRef = useRef<HTMLDivElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  const saveState: SaveState = saving ? "saving" : dirty ? "unsaved" : "idle";

  useEffect(() => { setMounted(true); }, []);

  // Warn before losing unsaved template edits to a tab close / reload.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

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

  const publishIssues: string[] = [];
  if (!name.trim()) publishIssues.push("a name");
  if (!categoryId) publishIssues.push("a category");
  if (!blocks.some((b) => b.type !== "paragraph" || blockPlainText(b.content).trim().length > 0)) {
    publishIssues.push("some content");
  }

  // Persists the template (POST on create, PATCH on edit) and returns the
  // template id, or null on failure (error state is already set).
  async function saveTemplate(): Promise<string | null> {
    if (!name.trim()) { setError("Name is required"); return null; }
    setError(null);

    const pageSnapshot = {
      title:           name.trim(),
      icon:            icon.trim() || null,
      cover_url:       coverUrl,
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

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Failed to save template");
      return null;
    }

    const saved = (await res.json()) as { id: string };
    initialBlocksSig.current = blocksSignature(blocks);
    setDirty(false);
    return saved.id;
  }

  function goBackToList() {
    router.push("/orbit-admin/orbit/templates");
    router.refresh();
  }

  async function handleSaveDraft() {
    setSaving("draft");
    try {
      const id = await saveTemplate();
      if (id) goBackToList();
    } finally {
      setSaving(null);
    }
  }

  async function handlePublish() {
    if (publishIssues.length > 0) return;
    setSaving("publish");
    try {
      const id = await saveTemplate();
      if (!id) return;
      const res = await fetch(`/api/orbit/templates/${id}/publish`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Failed to publish template");
        return;
      }
      goBackToList();
    } finally {
      setSaving(null);
    }
  }

  async function handleUpdate() {
    setSaving("update");
    try {
      const id = await saveTemplate();
      if (id) goBackToList();
    } finally {
      setSaving(null);
    }
  }

  async function handleUnpublish() {
    setSaving("unpublish");
    try {
      const id = await saveTemplate();
      if (!id) return;
      const res = await fetch(`/api/orbit/templates/${id}/unpublish`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Failed to unpublish template");
        return;
      }
      goBackToList();
    } finally {
      setSaving(null);
    }
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const result = await uploadCover(file);
    if (result) { setCoverUrl(result.fileUrl); setDirty(true); }
  }

  async function doDelete() {
    await fetch(`/api/orbit/templates/${template!.id}`, { method: "DELETE" });
    router.push("/orbit-admin/orbit/templates");
    router.refresh();
  }

  return (
    <>
    <div className="flex min-h-150 overflow-hidden rounded-lg border border-border bg-card">

      {/* Left sidebar — w-65 matching settings sidebar */}
      <aside className="flex w-65 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template settings</p>
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
                className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-sm border border-border bg-background px-3 transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {icon ? (
                  <PageIcon icon={icon} size={20} />
                ) : (
                  <Smile size={16} className="shrink-0 text-muted-foreground-subtle" />
                )}
                <span className="flex-1 text-left text-xs text-muted-foreground">
                  {icon ? "Click to change" : "Pick an emoji icon"}
                </span>
                {icon && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIcon(""); setDirty(true); }}
                    className="shrink-0 text-2xs text-muted-foreground-subtle hover:text-muted-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
              {mounted && emojiOpen && iconPickerPos && createPortal(
                <div ref={iconPickerRef} style={{ position: "fixed", top: iconPickerPos.top, left: iconPickerPos.left, zIndex: 9999 }}>
                  <div className="relative">
                    <IconPicker
                      onSelect={(v) => { setIcon(v); setEmojiOpen(false); setDirty(true); }}
                      onIconPreview={(v) => { setIcon(v); setDirty(true); }}
                      onRemove={icon ? () => { setIcon(""); setEmojiOpen(false); setDirty(true); } : undefined}
                      onClose={() => setEmojiOpen(false)}
                      triggerRef={iconTriggerRef}
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
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              placeholder="e.g. Meeting Notes"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => { setDesc(e.target.value); setDirty(true); }}
              placeholder="What is this template for?"
              rows={3}
              className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Category</label>
            {categories.length > 5 && (
              <div className="relative mb-1.5">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground-subtle" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories"
                  className="w-full rounded-sm border border-border bg-background py-1.5 pl-7 pr-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              {categories
                .filter((cat) => cat.label.toLowerCase().includes(categorySearch.trim().toLowerCase()))
                .map((cat) => {
                const inUse = cat.templateCount > 0;
                return (
                  <div
                    key={cat.id}
                    className={[
                      "group flex w-full items-center rounded-sm pr-1 text-left text-xs font-medium transition-colors",
                      categoryId === cat.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => { setCategoryId(cat.id); setDirty(true); }}
                      className="flex flex-1 items-center gap-1.5 truncate px-3 py-2 text-left"
                    >
                      <span className="truncate">{cat.label}</span>
                      {inUse && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-muted-foreground">
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
                        "shrink-0 rounded-xs p-1.5 opacity-0 transition-colors group-hover:opacity-100",
                        inUse
                          ? "cursor-not-allowed text-muted-foreground-subtle"
                          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
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
                  className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCategory || !newCategoryLabel.trim()}
                  className="shrink-0 rounded-sm bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNewCategoryOpen(true)}
                className="mt-1.5 flex w-full items-center gap-1.5 rounded-sm px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus size={12} />
                New category
              </button>
            )}
          </div>
        </div>

        {/* Sidebar footer — actions */}
        <div className="border-t border-border p-4 space-y-2">
          {saveState !== "idle" && (
            <div className="flex justify-center pb-1">
              <SaveStatusIndicator state={saveState} />
            </div>
          )}
          {error && (
            <div className="rounded-sm bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          {isPublished ? (
            <>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={saving !== null}
                className="w-full rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving === "update" ? "Updating…" : "Update"}
              </button>
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={saving !== null}
                className="w-full rounded-sm border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {saving === "unpublish" ? "Unpublishing…" : "Unpublish"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving !== null || publishIssues.length > 0}
                className="w-full rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving === "publish" ? "Publishing…" : "Publish"}
              </button>
              {publishIssues.length > 0 && (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  To publish, add {publishIssues.join(", ")}.
                </p>
              )}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving !== null}
                className="w-full rounded-sm border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {saving === "draft" ? "Saving…" : isEdit ? "Save draft" : "Save as draft"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full rounded-sm border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-sm px-4 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <Trash2 size={12} />
              Delete template
            </button>
          )}
        </div>
      </aside>

      {/* Right — content editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template content</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Press <kbd className="rounded border border-border bg-muted px-1 text-2xs">/</kbd> for blocks
            </p>
          </div>
          {!coverUrl && (
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              disabled={coverUploading}
              className="flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground disabled:opacity-40"
            >
              <ImageIcon size={13} />
              {coverUploading ? "Uploading…" : "Add cover"}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {coverUrl && (
            <div className="group/cover relative mb-4 h-35 w-full overflow-hidden rounded-md bg-muted">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${coverUrl})` }}
              />
              <div className="absolute bottom-2 right-3 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover/cover:opacity-100">
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  disabled={coverUploading}
                  className="rounded-sm border border-border bg-card/80 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-card disabled:opacity-50"
                >
                  {coverUploading ? "Uploading…" : "Change cover"}
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveCoverConfirm(true)}
                  className="rounded-sm border border-border bg-card/80 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-card"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          <TemplateEditor
            initialBlocks={blocks}
            onBaseline={(b) => { initialBlocksSig.current = blocksSignature(b); }}
            onChange={(b) => {
              setBlocks(b);
              if (blocksSignature(b) !== initialBlocksSig.current) setDirty(true);
            }}
          />
        </div>
      </div>

      <input
        ref={coverInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onCoverFile}
      />
    </div>

    <ConfirmDialog
      open={removeCoverConfirm}
      onOpenChange={setRemoveCoverConfirm}
      title="Remove cover image?"
      description="This removes the cover from this template. You can add a new one anytime."
      confirmLabel="Remove"
      onConfirm={() => { setCoverUrl(null); setDirty(true); }}
    />

    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title="Delete this template?"
      description={<>&ldquo;{template?.name}&rdquo; will be permanently deleted and cannot be recovered.{isPublished && <> It is currently published — users will immediately lose access to it in the template gallery.</>}</>}
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
