"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  templateId:    string;
  currentStatus: string;
}

export function TemplatePublishToggle({ templateId, currentStatus }: Props) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);
  const isPublished = currentStatus === "published";

  async function toggle() {
    setBusy(true);
    const action = isPublished ? "unpublish" : "publish";
    await fetch(`/api/orbit/templates/${templateId}/${action}`, { method: "PATCH" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={[
        "rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        isPublished
          ? "border border-border text-muted-foreground hover:bg-muted"
          : "bg-emerald-600 text-white hover:bg-emerald-700",
      ].join(" ")}
    >
      {busy ? "…" : isPublished ? "Unpublish" : "Publish"}
    </button>
  );
}
