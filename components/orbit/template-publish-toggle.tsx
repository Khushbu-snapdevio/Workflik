"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  templateId:    string;
  templateName:  string;
  currentStatus: string;
}

export function TemplatePublishToggle({ templateId, templateName, currentStatus }: Props) {
  const router  = useRouter();
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");
  const [pendingUnpublish, setPendingUnpublish] = useState(false);
  const isPublished = currentStatus === "published";

  async function run(action: "publish" | "unpublish") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orbit/templates/${templateId}/${action}`, { method: "PATCH" });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? `Failed to ${action} template`);
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (isPublished ? setPendingUnpublish(true) : run("publish"))}
        disabled={busy}
        className={[
          "rounded-[var(--radius-md)] px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
          isPublished
            ? "border border-border text-muted-foreground hover:bg-accent"
            : "bg-success text-white hover:bg-success/90",
        ].join(" ")}
      >
        {busy ? "…" : isPublished ? "Unpublish" : "Publish"}
      </button>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}

      {/* Unpublishing removes a live template from every workspace's gallery
          on this instance — that's shared, user-visible impact, so it gets
          the same confirm-before-destructive treatment as a delete. */}
      <ConfirmDialog
        open={pendingUnpublish}
        onOpenChange={setPendingUnpublish}
        title="Unpublish this template?"
        description={<>"{templateName}" will disappear from the user-facing template gallery immediately. It stays saved here as a draft and can be republished anytime.</>}
        confirmLabel="Unpublish"
        confirmLoadingLabel="Unpublishing…"
        loading={busy}
        onConfirm={() => run("unpublish")}
      />
    </>
  );
}
