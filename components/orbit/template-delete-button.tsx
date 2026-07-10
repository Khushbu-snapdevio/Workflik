"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { IconTooltipButton } from "@/components/ui/icon-tooltip-button";

interface Props {
  templateId: string;
  templateName: string;
}

export function TemplateDeleteButton({ templateId, templateName }: Props) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,   setError]   = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/orbit/templates/${templateId}`, { method: "DELETE" });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to delete template");
      }
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <IconTooltipButton
        icon={<Trash2 size={14} />}
        label="Delete"
        danger
        onClick={() => { setError(""); setOpen(true); }}
      />

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative w-[calc(100vw-32px)] max-w-[400px] rounded-[var(--radius-lg)] border border-border bg-background p-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={16} />
            </button>

            <div className="mb-5 flex items-start gap-3 pr-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-destructive/10">
                <AlertTriangle size={20} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Delete template</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">"{templateName}"</span>?
                  This will remove it from the user gallery and cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <p className="mb-3 flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle size={12} className="shrink-0" />
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="rounded-[var(--radius-sm)] border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-[var(--radius-sm)] bg-destructive px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete template"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
