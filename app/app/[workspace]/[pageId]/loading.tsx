export default function PageLoading() {
  return (
    <div className="flex h-full flex-col bg-background animate-pulse">
      {/* Topbar / breadcrumb skeleton */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-6">
        <div className="h-3 w-20 rounded bg-muted/60" />
        <div className="h-3 w-3 rounded bg-muted/40" />
        <div className="h-3 w-28 rounded bg-muted" />
      </div>

      {/* Page content skeleton */}
      <div className="mx-auto w-full max-w-[720px] px-16 py-10">
        {/* Title */}
        <div className="mb-8 h-9 w-2/3 rounded-[var(--radius-sm)] bg-muted" />

        {/* Paragraph blocks */}
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-11/12 rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
