import { getQueueSummary } from "@/lib/jobs/queue-inspection";

export const metadata = { title: "Queues – Orbit Admin" };

const STATE_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  completed: { color: "#059669", bg: "#f0fdf4", dot: "#059669" },
  active:    { color: "#2383e2", bg: "#eff6ff", dot: "#2383e2" },
  created:   { color: "#7c3aed", bg: "#faf5ff", dot: "#7c3aed" },
  retry:     { color: "#f59e0b", bg: "#fffbeb", dot: "#f59e0b" },
  failed:    { color: "#dc2626", bg: "#fef2f2", dot: "#dc2626" },
  cancelled: { color: "#a8a29e", bg: "#f5f4f2", dot: "#a8a29e" },
  expired:   { color: "#a8a29e", bg: "#f5f4f2", dot: "#a8a29e" },
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
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#374151] via-[#4b5563] to-[#6b7280] p-8 shadow-[0_8px_32px_rgba(55,65,81,0.28)]">
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white/10 blur-[80px]" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">Orbit Admin</p>
            <h1 className="mt-1 text-[32px] font-black tracking-tight text-white">Queues</h1>
            <p className="mt-1 text-[13px] text-white/55">pg-boss job queues — states, counts, and worker status.</p>
          </div>
          <div className="hidden shrink-0 items-center gap-1 rounded-[16px] border border-white/[0.12] bg-white/[0.07] px-6 py-4 sm:flex">
            {[
              { label: "Total jobs", value: totalJobs },
              { label: "Queues",     value: totalQueues },
              { label: "Active",     value: activeJobs },
              { label: "Failed",     value: failedJobs },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-1">
                {i > 0 && <div className="mx-4 h-8 w-px bg-white/15" />}
                <div className="text-center">
                  <p className="text-[26px] font-black leading-none text-white">{s.value}</p>
                  <p className="mt-1 text-[9.5px] font-bold uppercase tracking-widest text-white/50">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {queues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-[#d1cec8] bg-[#faf9f8] py-24 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[14px] bg-[#f5f4f2]">
            <svg viewBox="0 0 20 20" fill="none" stroke="#c4c1bb" strokeWidth="1.5" strokeLinecap="round" className="size-7">
              <rect x="2" y="3" width="16" height="3.5" rx="1"/><rect x="2" y="8.25" width="16" height="3.5" rx="1"/>
              <rect x="2" y="13.5" width="16" height="3.5" rx="1"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[#a8a29e]">No queue data yet</p>
          <p className="mt-1 text-[12px] text-[#c4c1bb]">
            Run{" "}
            <code className="rounded bg-[#f5f4f2] px-1.5 py-0.5 font-mono text-[11px] text-[#5c5a55]">pnpm worker</code>
            {" "}or enqueue an email to populate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(queueMap.entries()).map(([name, rows]) => {
            const qTotal    = rows.reduce((s, r) => s + r.count, 0);
            const hasFailed = rows.some(r => r.state === "failed");
            return (
              <div key={name} className="overflow-hidden rounded-[18px] border border-black/[0.07] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-8 items-center justify-center rounded-[8px] ${hasFailed ? "bg-red-50" : "bg-[#f5f4f2]"}`}>
                      <svg viewBox="0 0 14 14" fill="none" stroke={hasFailed ? "#dc2626" : "#787774"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                        <rect x="1" y="2" width="12" height="2.5" rx="0.75"/><rect x="1" y="5.75" width="12" height="2.5" rx="0.75"/>
                        <rect x="1" y="9.5" width="12" height="2.5" rx="0.75"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-mono text-[13px] font-bold text-[#1c1917]">{name}</p>
                      <p className="text-[11px] text-[#a8a29e]">{qTotal} total job{qTotal !== 1 ? "s" : ""}</p>
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
                        className="flex items-center gap-2.5 rounded-[10px] border px-4 py-2.5"
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
