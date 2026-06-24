export default function TemplatesLoading() {
  return (
    <div className="flex h-full flex-col bg-background animate-pulse">
      {/* Topbar skeleton */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <div className="h-5 w-28 rounded-[var(--radius-sm)] bg-muted" />
      </div>

      {/* Category filter skeleton */}
      <div className="flex gap-2 border-b border-border/60 px-6 py-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-muted" />
        ))}
      </div>

      {/* Template card grid skeleton */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
              <div className="h-28 w-full bg-muted" />
              <div className="p-4">
                <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted/60" />
                <div className="mt-1 h-3 w-2/3 rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
