"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2 } from "lucide-react";

type TemplateCategory = { id: string; key: string; label: string; orderIndex: number };

interface SaveAsTemplateModalProps {
 pageId:   string;
 pageTitle:  string;
 workspaceId: string;
 onClose:   () => void;
 onSaved?:  () => void;
}

export function SaveAsTemplateModal({
 pageId,
 pageTitle,
 workspaceId,
 onClose,
 onSaved,
}: SaveAsTemplateModalProps) {
 const [name, setName]      = useState(pageTitle || "");
 const [description, setDesc]  = useState("");
 const [categories, setCategories] = useState<TemplateCategory[]>([]);
 const [categoryId, setCategoryId] = useState<string>("");
 const [saving, setSaving]    = useState(false);
 const [error, setError]     = useState<string | null>(null);
 const [saved, setSaved]     = useState(false);

 useEffect(() => {
  fetch("/api/templates/categories")
   .then((r) => (r.ok ? r.json() : []))
   .then((list: TemplateCategory[]) => {
    setCategories(list);
    setCategoryId((current) => current || list[0]?.id || "");
   })
   .catch(() => {});
 }, []);

 async function handleSave() {
  if (!name.trim()) { setError("Template name is required"); return; }
  if (!categoryId) { setError("Choose a category"); return; }
  setSaving(true);
  setError(null);
  try {
   const res = await fetch(`/api/workspaces/${workspaceId}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, categoryId, pageId }),
   });
   const data = await res.json();
   if (!res.ok) {
    setError(data.error ?? "Failed to save template");
    return;
   }
   setSaved(true);
   onSaved?.();
   setTimeout(onClose, 1800);
  } finally {
   setSaving(false);
  }
 }

 if (typeof document === "undefined") return null;

 return createPortal(
  <div className="fixed inset-0 z-[10000] flex items-center justify-center">
   <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

   <div className="relative w-[calc(100vw-32px)] max-w-[440px] rounded-[var(--radius-lg)] border border-border bg-background p-6">
    {/* Close button — absolute top-right */}
    <button
     type="button"
     onClick={onClose}
     className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
    >
     <X size={16} />
    </button>

    {/* Header */}
    <div className="mb-5 pr-8">
     <h2 className="text-sm font-bold text-foreground">Save as Template</h2>
     <p className="mt-0.5 text-xs text-muted-foreground">
      Saved templates are available to all workspace members
     </p>
    </div>

    {saved ? (
     <div className="flex flex-col items-center py-8 text-center">
      {/* Animated success ring */}
      <div className="relative mb-5 flex size-20 items-center justify-center">
       <div className="absolute inset-0 animate-ping rounded-full bg-success/20" style={{ animationDuration: "1.2s", animationIterationCount: 1 }} />
       <div className="flex size-20 items-center justify-center rounded-full bg-success/10 ring-8 ring-success/10">
        <CheckCircle2 size={36} className="text-success" strokeWidth={1.8} />
       </div>
      </div>

      <h3 className="mb-1.5 text-lg font-bold text-foreground">Template saved!</h3>
      <p className="mb-1 text-sm text-muted-foreground">
       <span className="font-semibold text-foreground">{name}</span> is now available
      </p>
      <p className="text-xs text-muted-foreground">
       All workspace members can use this template
      </p>
     </div>
    ) : (
     <>
      {/* Name */}
      <div className="mb-4">
       <label className="mb-1.5 block text-xs font-semibold text-foreground">
        Template name <span className="text-destructive">*</span>
       </label>
       <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Sprint Planning"
        // biome-ignore lint/a11y/noAutofocus: intentional — modal just opened
        autoFocus
        className="w-full rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
       />
      </div>

      {/* Description */}
      <div className="mb-4">
       <label className="mb-1.5 block text-xs font-semibold text-foreground">
        Description <span className="text-muted-foreground font-normal">(optional)</span>
       </label>
       <textarea
        value={description}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="What is this template for?"
        rows={2}
        className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
       />
      </div>

      {/* Category */}
      <div className="mb-5">
       <label className="mb-1.5 block text-xs font-semibold text-foreground">Category</label>
       <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
         <button
          key={cat.id}
          type="button"
          onClick={() => setCategoryId(cat.id)}
          className={[
           "rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-medium transition-colors",
           categoryId === cat.id
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-border hover:bg-accent",
          ].join(" ")}
         >
          {cat.label}
         </button>
        ))}
       </div>
      </div>

      {error && (
       <p className="mb-3 rounded-[var(--radius-sm)] bg-[#fee2e2] px-3 py-2 text-xs text-[#b91c1c]">
        {error}
       </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
       <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="rounded-[var(--radius-sm)] border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
       >
        Cancel
       </button>
       <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="rounded-[var(--radius-sm)] bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
       >
        {saving ? "Saving…" : "Save Template"}
       </button>
      </div>
     </>
    )}
   </div>
  </div>,
  document.body
 );
}
