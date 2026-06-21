import { getQueueSummary } from "@/lib/jobs/queue-inspection";

export const metadata = { title: "Queues – Orbit Admin" };

const STATE_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  completed: { color: "#059669", bg: "#f0fdf4", dot: "#059669" },
  active:    { color: "#0284C7", bg: "#eff6ff", dot: "#0284C7" },
  created:   { color: "#0284C7", bg: "#eff6ff", dot: "#0284C7" },
  retry:     { color: "#d97706", bg: "#fffbeb", dot: "#d97706" },
  failed:    { color: "#dc2626", bg: "#fef2f2", dot: "#dc2626" },
  cancelled: { color: "#64748B", bg: "#f8fafc", dot: "#64748B" },
  expired:   { color: "#64748B", bg: "#f8fafc", dot: "#64748B" },
};

export default async function OrbitQueuesPage() {
  const queues = await getQueueSummary();

  const queueMap = new Map<string, { state: string; count: number }[]>();
  for (const row of queues) {
    if (!queueMap.has(row.name)) queueMap.set(row.name, []);
    queueMap.get(row.name)!.push({ state: row.state, count: row.count });
  }

  const totalJobs   = queues.reduce((s, r) => s + r.count, 0);
  const totalQueues = queueMap.size;
  const failedJobs  = queues.filter(r => r.state === "failed").reduce((s, r) => s + r.count, 0);
  const activeJobs  = queues.filter(r => r.state === "active").reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <div className="h-[3px] bg-gradient-to-r from-primary to-sky-400/50" />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-foreground">Queues</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">pg-boss job queues — states, counts, and worker status.</p>
          </div>
          <div className="hidden shrink-0 items-center overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-muted/30 sm:flex">
            {[
              { label: "Total jobs", value: totalJobs },
              { label: "Queues",     value: totalQueues },
              { label: "Active",     value: activeJobs },
              { label: "Failed",     value: failedJobs },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && <div className="h-8 w-px bg-border/60" />}
                <div className="px-6 py-4 text-center">
                  <p className="text-[26px] font-black leading-none text-foreground">{s.value}</p>
                  <p className="mt-1 text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/60">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {queues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border bg-muted/20 py-24 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-xl)] bg-muted/50">
            <svg viewBox="0 0 20 20" fill="none" stroke="#c4c1bb" strokeWidth="1.5" strokeLinecap="round" className="size-7">
              <rect x="2" y="3" width="16" height="3.5" rx="1"/><rect x="2" y="8.25" width="16" height="3.5" rx="1"/>
              <rect x="2" y="13.5" width="16" height="3.5" rx="1"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-muted-foreground">No queue data yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground/60">
            Run{" "}
            <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-foreground/70">pnpm worker</code>
            {" "}or enqueue an email to populate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(queueMap.entries()).map(([name, rows]) => {
            const qTotal    = rows.reduce((s, r) => s + r.count, 0);
            const hasFailed = rows.some(r => r.state === "failed");
            return (
              <div key={name} className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-8 items-center justify-center rounded-[var(--radius-md)] ${hasFailed ? "bg-red-50" : "bg-muted/50"}`}>
                      <svg viewBox="0 0 14 14" fill="none" stroke={hasFailed ? "#dc2626" : "#787774"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                        <rect x="1" y="2" width="12" height="2.5" rx="0.75"/><rect x="1" y="5.75" width="12" height="2.5" rx="0.75"/>
                        <rect x="1" y="9.5" width="12" height="2.5" rx="0.75"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-mono text-[13px] font-bold text-foreground">{name}</p>
                      <p className="text-[11px] text-muted-foreground">{qTotal} total job{qTotal !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {hasFailed && (
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10.5px] font-bold text-red-600">
                      {rows.find(r => r.state === "failed")?.count ?? 0} failed
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 p-5">
                  {rows.map(row => {
                    const st = STATE_STYLE[row.state] ?? STATE_STYLE.cancelled!;
                    return (
                      <div key={row.state}
                        className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border px-4 py-2.5"
                        style={{ borderColor: `${st.color}30`, background: st.bg }}>
                        <span className="size-2 rounded-full" style={{ background: st.dot }} />
                        <span className="text-[20px] font-black leading-none" style={{ color: st.color }}>{row.count}</span>
                        <span className="text-[11px] font-semibold" style={{ color: st.color }}>{row.state}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
