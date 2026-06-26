import { getQueueSummary } from "@/lib/jobs/queue-inspection";

export const metadata = { title: "Queues – Orbit Admin" };

const STATE_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
 completed: { bg: "bg-success/10",          text: "text-success",          dot: "bg-success" },
 active:    { bg: "bg-primary/10",           text: "text-primary",          dot: "bg-primary" },
 created:   { bg: "bg-primary/10",           text: "text-primary",          dot: "bg-primary" },
 retry:     { bg: "bg-warning/10",           text: "text-warning",          dot: "bg-warning" },
 failed:    { bg: "bg-destructive/10",       text: "text-destructive",      dot: "bg-destructive" },
 cancelled: { bg: "bg-muted",               text: "text-muted-foreground", dot: "bg-muted-foreground/40" },
 expired:   { bg: "bg-muted",               text: "text-muted-foreground", dot: "bg-muted-foreground/40" },
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
  <div className="space-y-6 p-6">

   {/* ── Header ── */}
   <div>
    <h1 className="text-xl font-bold tracking-tight text-foreground">Queues</h1>
    <p className="mt-0.5 text-sm text-muted-foreground">pg-boss job queues — states, counts, and worker status.</p>
   </div>

   {/* ── Stats row ── */}
   <div className="grid grid-cols-4 gap-3">
    {[
     { label: "Total jobs", value: totalJobs,   accent: false },
     { label: "Queues",     value: totalQueues, accent: false },
     { label: "Active",     value: activeJobs,  accent: activeJobs > 0 },
     { label: "Failed",     value: failedJobs,  accent: failedJobs > 0 },
    ].map(s => (
     <div key={s.label} className="rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3.5">
      <p className={`text-2xl font-bold leading-none ${s.accent ? "text-destructive" : "text-foreground"}`}>{s.value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/60">{s.label}</p>
     </div>
    ))}
   </div>

   {/* ── Queue list ── */}
   {queues.length === 0 ? (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border bg-muted/20 py-20 text-center">
     <p className="text-sm font-semibold text-muted-foreground">No queue data yet</p>
     <p className="mt-1 text-xs text-muted-foreground/60">
      Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pnpm worker</code> to populate.
     </p>
    </div>
   ) : (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">

     {/* Table header */}
     <div className="grid grid-cols-[1fr_auto] items-center border-b border-border/60 bg-muted/30 px-4 py-2.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">Queue name</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">States</span>
     </div>

     {/* Rows */}
     <div className="divide-y divide-border/50">
      {Array.from(queueMap.entries()).map(([name, rows]) => {
       const qTotal   = rows.reduce((s, r) => s + r.count, 0);
       const hasFailed = rows.some(r => r.state === "failed");
       return (
        <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors duration-100">

         {/* Left: name + total */}
         <div className="flex items-center gap-3 min-w-0">
          <div className={`flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${hasFailed ? "bg-destructive/10" : "bg-muted/60"}`}>
           <svg viewBox="0 0 14 14" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className={`size-3.5 ${hasFailed ? "stroke-destructive" : "stroke-muted-foreground"}`}>
            <rect x="1" y="2" width="12" height="2.5" rx="0.75"/>
            <rect x="1" y="5.75" width="12" height="2.5" rx="0.75"/>
            <rect x="1" y="9.5" width="12" height="2.5" rx="0.75"/>
           </svg>
          </div>
          <div className="min-w-0">
           <p className="truncate font-mono text-sm font-semibold text-foreground">{name}</p>
           <p className="text-xs text-muted-foreground/60">{qTotal} job{qTotal !== 1 ? "s" : ""}</p>
          </div>
         </div>

         {/* Right: state badges */}
         <div className="flex flex-wrap justify-end gap-1.5">
          {rows.map(row => {
           const st = STATE_STYLE[row.state] ?? STATE_STYLE.cancelled!;
           return (
            <span key={row.state}
             className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-transparent px-2.5 py-1 text-xs font-semibold ${st.bg} ${st.text}`}>
             <span className={`size-1.5 shrink-0 rounded-full ${st.dot}`} />
             {row.count} {row.state}
            </span>
           );
          })}
         </div>

        </div>
       );
      })}
     </div>
    </div>
   )}
  </div>
 );
}
