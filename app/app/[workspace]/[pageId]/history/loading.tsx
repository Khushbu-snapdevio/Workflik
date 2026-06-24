export default function HistoryLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">

      {/* Topbar skeleton */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-5">
        <div className="h-7 w-28 animate-pulse rounded-[var(--radius-sm)] bg-muted" />
        <div className="h-3.5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="size-6 animate-pulse rounded-[var(--radius-xs)] bg-muted" />
          <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3.5 w-px bg-border" />
        <div className="h-3.5 w-28 animate-pulse rounded bg-muted/60" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">

          {/* Heading */}
          <div className="mb-6 space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-80 animate-pulse rounded bg-muted/60" />
          </div>

          {/* Version list */}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
            <div className="border-b border-border/60 px-4 py-2.5">
              <div className="h-3 w-14 animate-pulse rounded bg-muted" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border/40 px-4 py-3 last:border-0">
                <div className="size-7 shrink-0 animate-pulse rounded-full bg-muted/60" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-32 animate-pulse rounded bg-muted/60" />
                </div>
                <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
