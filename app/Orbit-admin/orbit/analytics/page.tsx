import { count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailOutbox, sessions, users, workspaces } from "@/lib/db/schema";

export const metadata = { title: "Analytics – Orbit Admin" };

/* ── helpers ── */
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

/* ── SVG bar chart (server-rendered) ── */
function BarChart({ data, color, height = 72 }: { data: number[]; color: string; height?: number }) {
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
            {/* background bar */}
            <rect x={x} y={0} width={barW} height={height} fill={color} opacity={0.07} rx={2} />
            {/* value bar */}
            {barH > 0 && <rect x={x} y={y} width={barW} height={barH} fill={color} opacity={0.85} rx={2} />}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Horizontal segmented bar ── */
function SegBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted/50">
        {segments.map(s => (
          <div key={s.label} className="h-full transition-all" title={`${s.label}: ${s.value}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[10.5px] text-foreground/70">
              <span className="font-bold">{s.value}</span>
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
  const day7  = new Date(now.getTime() - 7  * 86400_000);
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
    db.select({ status: emailOutbox.status, cnt: count() })
      .from(emailOutbox)
      .groupBy(emailOutbox.status),
    db.select({ createdAt: users.createdAt }).from(users).where(gte(users.createdAt, day30)),
    db.select({ createdAt: workspaces.createdAt }).from(workspaces).where(gte(workspaces.createdAt, day30)),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, day14)),
  ]);

  /* Build chart data */
  const userSignups30d   = groupByDay(usersLast30d.map(u => u.createdAt),   30, now);
  const wsGrowth30d      = groupByDay(workspacesLast30d.map(w => w.createdAt), 30, now);
  const prev7dUsers      = (prevWeekUsers!.count) - (newUsers7d!.count);
  const userTrend        = newUsers7d!.count - prev7dUsers;
  const userTrendPct     = prev7dUsers > 0 ? Math.round((userTrend / prev7dUsers) * 100) : null;

  /* Email status breakdown */
  const emailMap = new Map(emailStatusRows.map(r => [r.status, r.cnt]));
  const emailSegments = [
    { label: "sent",    value: emailMap.get("sent")    ?? 0, color: "#0284C7" },
    { label: "queued",  value: emailMap.get("queued")  ?? 0, color: "#0369a1" },
    { label: "sending", value: emailMap.get("sending") ?? 0, color: "#0ea5e9" },
    { label: "failed",  value: emailMap.get("failed")  ?? 0, color: "#dc2626" },
  ];

  /* Activation rate: workspaces / users */
  const activationRate = totalUsers!.count > 0
    ? Math.round((totalWorkspaces!.count / totalUsers!.count) * 100)
    : 0;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <div className="h-[3px] bg-gradient-to-r from-primary to-sky-400/50" />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-foreground">Analytics</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Platform-wide metrics with real-time data and 30-day trends.</p>
          </div>
          <div className="hidden shrink-0 items-center overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-muted/30 sm:flex">
            <div className="px-6 py-4 text-center">
              <p className="text-[28px] font-black text-foreground">{activationRate}%</p>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/60">Activation rate</p>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <div className="px-6 py-4 text-center">
              <p className="text-[28px] font-black text-foreground">{activeSessions!.count}</p>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/60">Active sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total users",     value: totalUsers!.count,      sub: "All registered",       color: "#0284C7", icon: "👤" },
          { label: "New users (7d)",  value: newUsers7d!.count,      sub: userTrendPct !== null ? `${userTrend >= 0 ? "+" : ""}${userTrendPct}% vs prev 7d` : "This week", color: "#0284C7", icon: "📈" },
          { label: "Workspaces",      value: totalWorkspaces!.count, sub: "Active tenants",        color: "#0284C7", icon: "🏢" },
          { label: "Total sessions",  value: totalSessions!.count,   sub: `${activeSessions!.count} active now`, color: "#0284C7", icon: "⚡" },
        ].map(s => (
          <div key={s.label}
            className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <span className="text-[18px]">{s.icon}</span>
              {s.label === "New users (7d)" && userTrendPct !== null && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  userTrend >= 0 ? "bg-sky-50 text-sky-700" : "bg-red-50 text-red-700"
                }`}>{userTrend >= 0 ? "↑" : "↓"} {Math.abs(userTrendPct)}%</span>
              )}
            </div>
            <div>
              <p className="text-[30px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="mt-1 text-[12px] font-bold text-foreground">{s.label}</p>
              <p className="text-[10.5px] text-muted-foreground">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts grid ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* User signups 30d */}
        <ChartCard
          title="User signups"
          subtitle="Daily new registrations — last 30 days"
          color="#0284C7"
          value={newUsers30d!.count}
          valueLabel="this month"
          badge={`peak: ${Math.max(...userSignups30d)}/day`}>
          <BarChart data={userSignups30d} color="#0284C7" />
          <DayLabels days={30} />
        </ChartCard>

        {/* Workspace growth 30d */}
        <ChartCard
          title="Workspace growth"
          subtitle="New workspaces created — last 30 days"
          color="#0284C7"
          value={totalWorkspaces!.count}
          valueLabel="total"
          badge={`peak: ${Math.max(...wsGrowth30d)}/day`}>
          <BarChart data={wsGrowth30d} color="#0284C7" />
          <DayLabels days={30} />
        </ChartCard>

        {/* Email queue status */}
        <ChartCard
          title="Email queue"
          subtitle="Delivery status breakdown — all time"
          color="#0284C7"
          value={emailSegments.reduce((s, e) => s + e.value, 0)}
          valueLabel="total emails"
          badge={`${emailMap.get("failed") ?? 0} failed`}>
          <div className="py-4">
            <SegBar segments={emailSegments} />
          </div>
          {/* Mini bar per status */}
          <div className="mt-2 grid grid-cols-4 gap-2">
            {emailSegments.map(s => (
              <div key={s.label} className="rounded-[var(--radius-lg)] p-3 text-center" style={{ background: `${s.color}10` }}>
                <p className="text-[18px] font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Activation rate + user 7d/30d */}
        <ChartCard
          title="Growth overview"
          subtitle="User acquisition and workspace activation"
          color="#0284C7"
          value={activationRate}
          valueLabel="activation rate"
          badge={`${newUsers7d!.count} signups this week`}>
          <div className="mt-2 space-y-4">
            {/* Activation rate bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground/70">Users → Workspaces</span>
                <span className="text-[11px] font-black text-primary">{activationRate}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all"
                  style={{ width: `${activationRate}%` }} />
              </div>
            </div>
            {/* 7d vs 30d comparison */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "7-day signups",  value: newUsers7d!.count,  color: "#0284C7", pct: totalUsers!.count > 0 ? Math.round((newUsers7d!.count / totalUsers!.count) * 100) : 0 },
                { label: "30-day signups", value: newUsers30d!.count, color: "#0369a1", pct: totalUsers!.count > 0 ? Math.round((newUsers30d!.count / totalUsers!.count) * 100) : 0 },
              ].map(r => (
                <div key={r.label} className="rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
                  <p className="text-[20px] font-black" style={{ color: r.color }}>{r.value}</p>
                  <p className="text-[10.5px] font-medium text-muted-foreground">{r.label}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/50">
                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                  </div>
                  <p className="mt-1 text-[9.5px] text-muted-foreground/60">{r.pct}% of all users</p>
                </div>
              ))}
            </div>
            {/* Trend indicator */}
            {userTrendPct !== null && (
              <div className={`flex items-center gap-2 rounded-[var(--radius-lg)] p-3 ${userTrend >= 0 ? "bg-sky-50" : "bg-red-50"}`}>
                <span className={`text-[16px] font-black ${userTrend >= 0 ? "text-primary" : "text-red-600"}`}>
                  {userTrend >= 0 ? "↑" : "↓"} {Math.abs(userTrendPct)}%
                </span>
                <span className={`text-[11px] ${userTrend >= 0 ? "text-sky-700" : "text-red-700"}`}>
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

/* ── Chart wrapper card ── */
function ChartCard({
  title, subtitle, color, value, valueLabel, badge, children,
}: {
  title: string; subtitle: string; color: string;
  value: number; valueLabel: string; badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
      {/* Top accent */}
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[13.5px] font-bold text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[22px] font-black leading-none" style={{ color }}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{valueLabel}</p>
            {badge && <p className="mt-0.5 text-[9.5px] text-muted-foreground/60">{badge}</p>}
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Day axis labels ── */
function DayLabels({ days }: { days: number }) {
  const now  = new Date();
  const start = new Date(now.getTime() - (days - 1) * 86400_000);
  const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });
  return (
    <div className="mt-1.5 flex justify-between">
      <span className="text-[9.5px] text-muted-foreground/60">{fmt(start)}</span>
      <span className="text-[9.5px] text-muted-foreground/60">{fmt(now)}</span>
    </div>
  );
}
