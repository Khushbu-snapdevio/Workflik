"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
 { key: "productivity", label: "Productivity" },
 { key: "project_mgmt", label: "Project Management" },
 { key: "marketing",  label: "Marketing" },
 { key: "engineering", label: "Engineering" },
 { key: "sales",    label: "Sales" },
] as const;

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
 const [category, setCategory]  = useState<string>("productivity");
 const [saving, setSaving]    = useState(false);
 const [error, setError]     = useState<string | null>(null);
 const [saved, setSaved]     = useState(false);

 async function handleSave() {
  if (!name.trim()) { setError("Template name is required"); return; }
  setSaving(true);
  setError(null);
  try {
   const res = await fetch(`/api/workspaces/${workspaceId}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, category, pageId }),
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
  <div className="fixed inset-0 z-[400] flex items-center justify-center">
   <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

   <div className="relative w-[calc(100vw-32px)] max-w-[440px] rounded-[var(--radius-lg)] border border-border bg-background p-6">
    {/* Header */}
    <div className="mb-5 flex items-center justify-between">
     <div>
      <h2 className="text-sm font-bold text-foreground">Save as Template</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
       Saved templates are available to all workspace members
      </p>
     </div>
     <button
      type="button"
      onClick={onClose}
      className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-accent hover:text-foreground"
     >
      <X size={14} />
     </button>
    </div>

    {saved ? (
     <div className="flex flex-col items-center gap-3 py-6">
      <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
       <CheckCircle2 size={24} className="text-success" />
      </div>
      <p className="text-sm font-semibold text-foreground">Template saved!</p>
      <p className="text-xs text-muted-foreground">
       <span className="font-medium">{name}</span> is now available in the template gallery
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
        className="w-full rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
        className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
       />
      </div>

      {/* Category */}
      <div className="mb-5">
       <label className="mb-1.5 block text-xs font-semibold text-foreground">Category</label>
       <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
         <button
          key={cat.key}
          type="button"
          onClick={() => setCategory(cat.key)}
          className={[
           "rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-medium transition-colors",
           category === cat.key
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
