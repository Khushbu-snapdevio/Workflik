"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedTemplatesButton({ currentCount }: { currentCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  async function seed(force = false) {
    if (force && !confirm("This will DELETE all existing built-in templates and re-seed fresh. Continue?")) return;
    setLoading(true);
    setDone(false);
    await fetch("/api/orbit/templates/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    setLoading(false);
    setDone(true);
    router.refresh();
  }

  if (currentCount >= 16) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">✓ {currentCount} built-in templates seeded</span>
        <button
          type="button"
          onClick={() => seed(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-50 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400"
        >
          {loading ? "Resetting…" : done ? "✓ Done" : "↺ Reset & Re-seed"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => seed(false)}
      disabled={loading || done}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
    >
      {loading ? "Seeding…" : done ? "✓ Done" : "⚡ Seed 16 default templates"}
    </button>
  );
}
