import { count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailOutbox, sessions, users, workspaces } from "@/lib/db/schema";

export const metadata = { title: "Analytics – Orbit Admin" };

function groupByDay(dates: (Date | null | string)[], days: number, now: Date): number[] {
 const map = new Map<string, number>();
 for (let i = 0; i < days; i++) {
  const d = new Date(now.getTime() - (days - 1 - i) * 86400_000);
  map.set(d.toISOString().slice(0, 10), 0);
 }
 for (const raw of dates) {
  if (!raw) continue;
  const key = new Date(raw).toISOString().slice(0, 10);
  if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
 }
 return Array.from(map.values());
}

function BarChart({ data, height = 72 }: { data: number[]; height?: number }) {
 const max = Math.max(...data, 1);
 const gap = 3;
 const barW = 10;
 const totalW = data.length * (barW + gap);
 return (
  <svg viewBox={`0 0 ${totalW} ${height}`} className="w-full" preserveAspectRatio="none">
   {data.map((v, i) => {
    const barH = max > 0 ? Math.max((v / max) * (height - 4), v > 0 ? 3 : 0) : 0;
    const x = i * (barW + gap);
    const y = height - barH;
    return (
     <g key={i}>
      <rect x={x} y={0} width={barW} height={height} fill="currentColor" opacity={0.07} rx={2} />
      {barH > 0 && <rect x={x} y={y} width={barW} height={barH} fill="currentColor" opacity={0.85} rx={2} />}
     </g>
    );
   })}
  </svg>
 );
}

function SegBar({ segments }: { segments: { label: string; value: number; cls: string; dot: string }[] }) {
 const total = segments.reduce((s, x) => s + x.value, 0) || 1;
 return (
  <div className="space-y-2">
   <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/50">
    {segments.map(s => (
     <div key={s.label} className={`h-full ${s.cls}`} style={{ width: `${(s.value / total) * 100}%` }} />
    ))}
   </div>
   <div className="flex flex-wrap gap-3">
    {segments.map(s => (
     <div key={s.label} className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${s.dot}`} />
      <span className="text-xs text-foreground/70">
       <span className="font-semibold">{s.value}</span>
       <span className="text-muted-foreground"> {s.label}</span>
      </span>
     </div>
    ))}
   </div>
  </div>
 );
}

export default async function OrbitAnalyticsPage() {
 const now   = new Date();
 const day7  = new Date(now.getTime() - 7 * 86400_000);
 const day14 = new Date(now.getTime() - 14 * 86400_000);
 const day30 = new Date(now.getTime() - 30 * 86400_000);

 const [
  [totalUsers], [newUsers7d], [newUsers30d], [totalWorkspaces],
  [totalSessions], [activeSessions],
  emailStatusRows,
  usersLast30d, workspacesLast30d,
  [prevWeekUsers],
 ] = await Promise.all([
  db.select({ count: count() }).from(users),
  db.select({ count: count() }).from(users).where(gte(users.createdAt, day7)),
  db.select({ count: count() }).from(users).where(gte(users.createdAt, day30)),
  db.select({ count: count() }).from(workspaces),
  db.select({ count: count() }).from(sessions),
  db.select({ count: count() }).from(sessions).where(gte(sessions.expiresAt, now)),
  db.select({ status: emailOutbox.status, cnt: count() }).from(emailOutbox).groupBy(emailOutbox.status),
  db.select({ createdAt: users.createdAt }).from(users).where(gte(users.createdAt, day30)),
  db.select({ createdAt: workspaces.createdAt }).from(workspaces).where(gte(workspaces.createdAt, day30)),
  db.select({ count: count() }).from(users).where(gte(users.createdAt, day14)),
 ]);

 const userSignups30d = groupByDay(usersLast30d.map(u => u.createdAt),  30, now);
 const wsGrowth30d   = groupByDay(workspacesLast30d.map(w => w.createdAt), 30, now);
 const prev7dUsers   = (prevWeekUsers!.count) - (newUsers7d!.count);
 const userTrend    = newUsers7d!.count - prev7dUsers;
 const userTrendPct  = prev7dUsers > 0 ? Math.round((userTrend / prev7dUsers) * 100) : null;

 const emailMap = new Map(emailStatusRows.map(r => [r.status, r.cnt]));
 const emailSegments = [
  { label: "sent",    value: emailMap.get("sent")    ?? 0, cls: "bg-success",     dot: "bg-success" },
  { label: "queued",  value: emailMap.get("queued")  ?? 0, cls: "bg-primary",     dot: "bg-primary" },
  { label: "sending", value: emailMap.get("sending") ?? 0, cls: "bg-primary/60",  dot: "bg-primary/60" },
  { label: "failed",  value: emailMap.get("failed")  ?? 0, cls: "bg-destructive", dot: "bg-destructive" },
 ];

 const activationRate = totalUsers!.count > 0
  ? Math.round((totalWorkspaces!.count / totalUsers!.count) * 100)
  : 0;

 const kpis = [
  {
   label: "Total users", value: totalUsers!.count, sub: "All registered accounts",
   icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
     <circle cx="5.5" cy="5" r="2.5"/><path d="M1 14c0-2.5 2-4.5 4.5-4.5S10 11.5 10 14"/>
     <path d="M11.5 2.5a2.5 2.5 0 010 5M13 10.5c1.5.5 2.5 1.8 2.5 3.5"/>
    </svg>
   ),
  },
  {
   label: "New users (7d)", value: newUsers7d!.count,
   sub: userTrendPct !== null ? `${userTrend >= 0 ? "+" : ""}${userTrendPct}% vs prev week` : "This week",
   icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
     <path d="M2 11.5l3.5-3.5 2.5 2.5 5-6"/>
    </svg>
   ),
  },
  {
   label: "Workspaces", value: totalWorkspaces!.count, sub: "On this instance",
   icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
     <path d="M2 5.5h12M2 10.5h12M5.5 2v12M10.5 2v12"/><rect x="1.5" y="1.5" width="13" height="13" rx="2"/>
    </svg>
   ),
  },
  {
   label: "Total sessions", value: totalSessions!.count, sub: `${activeSessions!.count} active now`,
   icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
     <path d="M8 2v4l3 3"/><circle cx="8" cy="8" r="6"/>
    </svg>
   ),
  },
 ];

 return (
  <div className="space-y-6">

   {/* Header */}
   <div className="flex items-start justify-between gap-4">
    <div>
     <h1 className="text-xl font-bold tracking-tight text-foreground">Analytics</h1>
     <p className="mt-1 text-sm text-muted-foreground">Platform-wide metrics with real-time data and 30-day trends.</p>
    </div>
    <div className="hidden shrink-0 items-center gap-2 sm:flex">
     <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <strong className="font-bold text-foreground">{activationRate}%</strong> activation
     </span>
     <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <strong className="font-bold text-foreground">{activeSessions!.count}</strong> active sessions
     </span>
    </div>
   </div>

   {/* KPI row */}
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {kpis.map(s => (
     <div key={s.label} className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-5">
      <div className="flex items-center justify-between">
       <span className="flex size-9 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary">
        {s.icon}
       </span>
       {s.label === "New users (7d)" && userTrendPct !== null && (
        <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
         userTrend >= 0 ? "bg-success/10 text-success" : "bg-destructive/5 text-destructive"
        }`}>
         {userTrend >= 0 ? (
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-2.5"><path d="M5 8V2M2 5l3-3 3 3"/></svg>
         ) : (
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-2.5"><path d="M5 2v6M2 5l3 3 3-3"/></svg>
         )}
         {Math.abs(userTrendPct)}%
        </span>
       )}
      </div>
      <div>
       <p className="text-3xl font-bold leading-none text-foreground">{s.value}</p>
       <p className="mt-1.5 text-xs font-semibold text-foreground">{s.label}</p>
       <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
      </div>
     </div>
    ))}
   </div>

   {/* Charts grid */}
   <div className="grid gap-4 lg:grid-cols-2">

    <ChartCard title="User signups" subtitle="Daily new registrations — last 30 days"
     value={newUsers30d!.count} valueLabel="this month" badge={`peak: ${Math.max(...userSignups30d)}/day`}>
     <div className="text-primary">
      <BarChart data={userSignups30d} />
     </div>
     <DayLabels days={30} />
    </ChartCard>

    <ChartCard title="Workspace growth" subtitle="New workspaces created — last 30 days"
     value={totalWorkspaces!.count} valueLabel="total" badge={`peak: ${Math.max(...wsGrowth30d)}/day`}>
     <div className="text-primary">
      <BarChart data={wsGrowth30d} />
     </div>
     <DayLabels days={30} />
    </ChartCard>

    <ChartCard title="Email queue" subtitle="Delivery status breakdown — all time"
     value={emailSegments.reduce((s, e) => s + e.value, 0)} valueLabel="total emails"
     badge={`${emailMap.get("failed") ?? 0} failed`}>
     <div className="py-3">
      <SegBar segments={emailSegments} />
     </div>
     <div className="mt-3 grid grid-cols-4 gap-2">
      {emailSegments.map(s => (
       <div key={s.label} className="rounded-[var(--radius-md)] bg-muted/50 p-3 text-center">
        <p className={`text-base font-bold ${s.dot === "bg-success" ? "text-success" : s.dot === "bg-destructive" ? "text-destructive" : "text-primary"}`}>{s.value}</p>
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{s.label}</p>
       </div>
      ))}
     </div>
    </ChartCard>

    <ChartCard title="Growth overview" subtitle="User acquisition and workspace activation"
     value={activationRate} valueLabel="activation rate" badge={`${newUsers7d!.count} signups this week`}>
     <div className="mt-2 space-y-4">
      <div>
       <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/70">Users → Workspaces</span>
        <span className="text-xs font-bold text-primary">{activationRate}%</span>
       </div>
       <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
        <div className="h-full rounded-full bg-primary" style={{ width: `${activationRate}%` }} />
       </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
       {[
        { label: "7-day signups", value: newUsers7d!.count, pct: totalUsers!.count > 0 ? Math.round((newUsers7d!.count / totalUsers!.count) * 100) : 0 },
        { label: "30-day signups", value: newUsers30d!.count, pct: totalUsers!.count > 0 ? Math.round((newUsers30d!.count / totalUsers!.count) * 100) : 0 },
       ].map(r => (
        <div key={r.label} className="rounded-[var(--radius-md)] border border-border bg-muted/30 p-3">
         <p className="text-xl font-bold text-foreground">{r.value}</p>
         <p className="text-xs font-medium text-muted-foreground">{r.label}</p>
         <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/50">
          <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
         </div>
         <p className="mt-1 text-xs text-muted-foreground/60">{r.pct}% of all users</p>
        </div>
       ))}
      </div>
      {userTrendPct !== null && (
       <div className={`flex items-center gap-2 rounded-[var(--radius-lg)] p-3 ${userTrend >= 0 ? "bg-success/5" : "bg-destructive/5"}`}>
        <span className={`flex items-center gap-1 text-sm font-bold ${userTrend >= 0 ? "text-success" : "text-destructive"}`}>
         {userTrend >= 0 ? (
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="M5 8V2M2 5l3-3 3 3"/></svg>
         ) : (
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="M5 2v6M2 5l3 3 3-3"/></svg>
         )}
         {Math.abs(userTrendPct)}%
        </span>
        <span className={`text-xs ${userTrend >= 0 ? "text-success/80" : "text-destructive/70"}`}>
         vs previous 7-day period ({prev7dUsers} signups)
        </span>
       </div>
      )}
     </div>
    </ChartCard>

   </div>
  </div>
 );
}

function ChartCard({ title, subtitle, value, valueLabel, badge, children }: {
 title: string; subtitle: string;
 value: number; valueLabel: string; badge?: string;
 children: React.ReactNode;
}) {
 return (
  <div className="rounded-[var(--radius-lg)] border border-border bg-card">
   <div className="p-5">
    <div className="flex items-start justify-between gap-3">
     <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
     </div>
     <div className="shrink-0 text-right">
      <p className="text-xl font-bold leading-none text-primary">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{valueLabel}</p>
      {badge && <p className="mt-0.5 text-xs text-muted-foreground/60">{badge}</p>}
     </div>
    </div>
    <div className="mt-4">{children}</div>
   </div>
  </div>
 );
}

function DayLabels({ days }: { days: number }) {
 const now = new Date();
 const start = new Date(now.getTime() - (days - 1) * 86400_000);
 const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });
 return (
  <div className="mt-1.5 flex justify-between">
   <span className="text-xs text-muted-foreground/60">{fmt(start)}</span>
   <span className="text-xs text-muted-foreground/60">{fmt(now)}</span>
  </div>
 );
}
