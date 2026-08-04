"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
    <div className="relative inline-flex">
      <IconTooltipButton
        icon={<Trash2 size={14} />}
        label="Delete"
        danger
        onClick={() => { setError(""); setOpen(true); }}
      />

      {error && (
        <p className="absolute left-1/2 top-full z-10 mt-1 w-max max-w-55 -translate-x-1/2 rounded-sm border border-destructive/30 bg-card px-2 py-1 text-[11px] text-destructive">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete template"
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">&ldquo;{templateName}&rdquo;</span>? This will remove it from the user gallery and cannot be undone.
          </>
        }
        confirmLabel="Delete template"
        confirmLoadingLabel="Deleting…"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
