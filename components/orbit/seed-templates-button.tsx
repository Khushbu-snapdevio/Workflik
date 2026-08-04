"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function SeedTemplatesButton({ currentCount }: { currentCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function seed(force = false) {
    setLoading(true);
    setDone(false);
    setError("");
    try {
      const res = await fetch("/api/orbit/templates/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Failed to seed templates");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (currentCount >= 18) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">✓ {currentCount} built-in templates seeded</span>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-sm border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/20 disabled:opacity-50"
          >
            {loading ? "Resetting…" : done ? "✓ Done" : "↺ Reset & Re-seed"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Reset and re-seed built-in templates?"
          description="This will delete all existing built-in templates and re-seed fresh copies. This cannot be undone."
          confirmLabel="Reset & re-seed"
          confirmLoadingLabel="Resetting…"
          loading={loading}
          onConfirm={() => seed(true)}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => seed(false)}
        disabled={loading || done}
        className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
      >
        {loading ? "Seeding…" : done ? "✓ Done" : "⚡ Seed 18 default templates"}
      </button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
