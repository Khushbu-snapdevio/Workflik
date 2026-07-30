export default function LibraryLoading() {
  return (
    <div className="flex h-full flex-col bg-card animate-pulse">
      {/* Topbar skeleton */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="h-5 w-24 rounded-[var(--radius-sm)] bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 rounded-[var(--radius-sm)] bg-muted" />
          <div className="h-8 w-24 rounded-[var(--radius-sm)] bg-muted" />
        </div>
      </div>

      {/* Table header skeleton */}
      <div className="flex items-center gap-4 border-b border-border/60 px-6 py-2.5">
        <div className="h-3 w-48 rounded bg-muted" />
        <div className="ml-auto h-3 w-24 rounded bg-muted/60" />
        <div className="h-3 w-20 rounded bg-muted/60" />
      </div>

      {/* Page rows skeleton */}
      <div className="flex-1 overflow-hidden divide-y divide-border/40">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-3">
            <div className="size-6 shrink-0 rounded-[var(--radius-sm)] bg-muted" />
            <div className="h-3.5 w-48 rounded bg-muted" />
            <div className="ml-auto h-3 w-24 shrink-0 rounded bg-muted/60" />
            <div className="h-3 w-20 shrink-0 rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
