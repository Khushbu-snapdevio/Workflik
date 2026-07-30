export default function WorkspaceHomeLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-card animate-pulse">
      {/* Topbar skeleton */}
      <div className="shrink-0 bg-card">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 rounded-[var(--radius-sm)] bg-muted" />
            <div className="h-5 w-48 rounded-[var(--radius-sm)] bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-[var(--radius-sm)] bg-muted" />
            <div className="h-8 w-28 rounded-[var(--radius-sm)] bg-muted" />
          </div>
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_256px] gap-5 items-start">
            {/* Left column */}
            <div className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted/60" />
                </div>
                <div className="divide-y divide-border/40">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="size-7 shrink-0 rounded-[var(--radius-sm)] bg-muted" />
                      <div className="h-3.5 flex-1 rounded bg-muted" />
                      <div className="h-3 w-12 shrink-0 rounded bg-muted/60" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                <div className="border-b border-border/60 px-4 py-2.5">
                  <div className="h-2.5 w-16 rounded bg-muted/60" />
                </div>
                <div className="divide-y divide-border/40">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="size-6 rounded-[var(--radius-sm)] bg-muted" />
                        <div className="h-3 w-16 rounded bg-muted/60" />
                      </div>
                      <div className="h-5 w-8 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
