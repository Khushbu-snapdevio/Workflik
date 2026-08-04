"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function EmailRetryButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");

  async function retry() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orbit/email/${id}/retry`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to retry");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-xs border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        <RotateCcw size={11} className={busy ? "animate-spin" : ""} />
        {busy ? "Retrying…" : "Retry"}
      </button>
      {error && <p className="text-2xs text-destructive">{error}</p>}
    </div>
  );
}
