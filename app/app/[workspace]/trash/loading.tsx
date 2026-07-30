export default function TrashLoading() {
  return (
    <div className="flex h-full flex-col bg-card animate-pulse">
      {/* Topbar skeleton */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="h-5 w-16 rounded-[var(--radius-sm)] bg-muted" />
        <div className="h-8 w-28 rounded-[var(--radius-sm)] bg-muted" />
      </div>

      {/* Row list skeleton */}
      <div className="flex-1 overflow-hidden divide-y divide-border">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-3">
            <div className="size-6 shrink-0 rounded-[var(--radius-sm)] bg-muted" />
            <div className="h-3.5 w-52 rounded bg-muted" />
            <div className="ml-auto h-3 w-24 shrink-0 rounded bg-muted/60" />
            <div className="h-7 w-16 shrink-0 rounded-[var(--radius-sm)] bg-muted" />
            <div className="h-7 w-24 shrink-0 rounded-[var(--radius-sm)] bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
