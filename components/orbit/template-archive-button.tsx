"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconTooltipButton } from "@/components/ui/icon-tooltip-button";

interface Props {
  templateId:    string;
  templateName:  string;
  currentStatus: string;
}

export function TemplateArchiveButton({ templateId, templateName, currentStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pendingArchive, setPendingArchive] = useState(false);
  const isArchived  = currentStatus === "archived";
  const isPublished = currentStatus === "published";

  async function run(action: "archive" | "unarchive") {
    setBusy(true);
    try {
      const res = await fetch(`/api/orbit/templates/${templateId}/${action}`, { method: "PATCH" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <IconTooltipButton
        icon={isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        label={busy ? "…" : isArchived ? "Unarchive" : "Archive"}
        onClick={() => {
          if (busy) return;
          if (isArchived) run("unarchive");
          else if (isPublished) setPendingArchive(true);
          else run("archive");
        }}
      />

      {/* Archiving a live template removes it from every workspace's gallery,
          so it gets the same confirm treatment as unpublish. */}
      <ConfirmDialog
        open={pendingArchive}
        onOpenChange={setPendingArchive}
        title="Archive this template?"
        description={<>&ldquo;{templateName}&rdquo; will disappear from the user-facing template gallery immediately. It stays saved here and can be unarchived anytime.</>}
        confirmLabel="Archive"
        confirmLoadingLabel="Archiving…"
        loading={busy}
        onConfirm={() => run("archive")}
      />
    </>
  );
}
