export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-[800px] animate-pulse px-10 py-10">

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="size-12 shrink-0 rounded-[var(--radius-md)] bg-muted" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 rounded-[var(--radius-sm)] bg-muted" />
          <div className="h-3.5 w-56 rounded-[var(--radius-sm)] bg-muted/60" />
        </div>
      </div>

      {/* Card block 1 */}
      <div className="mb-5 rounded-[var(--radius-lg)] border border-border/60 bg-card p-5">
        <div className="mb-4 h-3.5 w-24 rounded bg-muted/60" />
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-muted" />
          <div className="flex flex-col gap-2.5">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-48 rounded bg-muted/60" />
          </div>
        </div>
      </div>

      {/* Card block 2 */}
      <div className="mb-5 rounded-[var(--radius-lg)] border border-border/60 bg-card p-5">
        <div className="mb-4 h-3.5 w-20 rounded bg-muted/60" />
        <div className="space-y-3">
          <div className="h-9 w-full rounded-[var(--radius-sm)] bg-muted" />
          <div className="h-9 w-full rounded-[var(--radius-sm)] bg-muted" />
        </div>
      </div>

      {/* Card block 3 */}
      <div className="rounded-[var(--radius-lg)] border border-border/60 bg-card p-5">
        <div className="mb-4 h-3.5 w-28 rounded bg-muted/60" />
        <div className="space-y-3">
          <div className="h-9 w-full rounded-[var(--radius-sm)] bg-muted" />
          <div className="h-9 w-3/4 rounded-[var(--radius-sm)] bg-muted" />
        </div>
      </div>

    </div>
  );
}
