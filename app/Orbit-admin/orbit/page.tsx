import { count, desc, gte } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { emailOutbox, platformAuditLog, users, workspaces } from "@/lib/db/schema";
import { getQueueSummary } from "@/lib/jobs/queue-inspection";

export const metadata = { title: "Overview – Orbit Admin" };

function avatarColor(str: string) {
  const colors = ["#2383e2","#7c3aed","#059669","#f59e0b","#dc2626","#0891b2"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return colors[h % colors.length]!;
}

function ago(d: Date | null | undefined) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  "user.banned":             { label: "User banned",         color: "#dc2626", bg: "#fef2f2", icon: "🚫" },
  "user.unbanned":           { label: "User unbanned",       color: "#059669", bg: "#f0fdf4", icon: "✅" },
  "user.impersonated":       { label: "Impersonated",        color: "#7c3aed", bg: "#faf5ff", icon: "👤" },
  "user.sessions_revoked":   { label: "Sessions revoked",    color: "#f59e0b", bg: "#fffbeb", icon: "⚡" },
  "workspace.force_deleted": { label: "Workspace deleted",   color: "#dc2626", bg: "#fef2f2", icon: "🗑️" },
};

export default async function OrbitOverviewPage() {
  const now   = new Date();
  const day7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    [totalUsers], [newUsers7d], [newUsers30d], [totalWorkspaces], [emailCount],
    queues, recentUsers, recentAudit,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, day7)),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, day30)),
    db.select({ count: count() }).from(workspaces),
    db.select({ count: count() }).from(emailOutbox),
    getQueueSummary(),
    db.select().from(users).orderBy(desc(users.createdAt)).limit(8),
    db.select({
      id:        platformAuditLog.id,
      action:    platformAuditLog.action,
      targetType:platformAuditLog.targetType,
      targetId:  platformAuditLog.targetId,
      createdAt: platformAuditLog.createdAt,
    }).from(platformAuditLog).orderBy(desc(platformAuditLog.createdAt)).limit(8),
  ]);

  return (
    <div className="space-y-6">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f2044] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.28)]">
        {/* Dot-grid decoration */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* Blue glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-blue-500/15 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-violet-500/10 blur-[60px]" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: title */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-[8px] bg-white/10 backdrop-blur-sm">
                <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 opacity-80">
                  <rect x="1.5" y="1.5" width="4" height="4" rx="0.75"/><rect x="8.5" y="1.5" width="4" height="4" rx="0.75"/>
                  <rect x="1.5" y="8.5" width="4" height="4" rx="0.75"/><rect x="8.5" y="8.5" width="4" height="4" rx="0.75"/>
                </svg>
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/40">Orbit Admin</span>
            </div>
            <h1 className="text-[34px] font-black tracking-tight text-white">Overview</h1>
            <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-white/45">
              Platform health, recent registrations, and operator actions.
            </p>
            {/* System status */}
            <div className="mt-5 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[11px] font-medium text-white/50">All systems operational</span>
              </div>
              <span className="text-white/20">·</span>
              <span className="text-[11px] text-white/40">{queues.length} worker{queues.length !== 1 ? "s" : ""} active</span>
            </div>
          </div>

          {/* Right: hero numbers */}
          <div className="flex items-center gap-6 rounded-[16px] border border-white/[0.08] bg-white/[0.04] px-6 py-5 backdrop-blur-sm sm:shrink-0">
            <div className="text-center">
              <p className="text-[36px] font-black leading-none text-white">{totalUsers!.count}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Users</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[36px] font-black leading-none text-white">{totalWorkspaces!.count}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Workspaces</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[36px] font-black leading-none text-white">{newUsers7d!.count}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">New / 7d</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total users */}
        <StatCard
          href="/Orbit-admin/orbit/users"
          value={totalUsers!.count}
          label="Total users"
          sub="All registered accounts"
          color="#2383e2"
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <circle cx="5.5" cy="5" r="2.5"/><path d="M1 14c0-2.5 2-4.5 4.5-4.5S10 11.5 10 14"/>
              <path d="M11.5 2.5a2.5 2.5 0 010 5M13 10.5c1.5.5 2.5 1.8 2.5 3.5"/>
            </svg>
          }
        />
        {/* New 7d */}
        <StatCard
          href="/Orbit-admin/orbit/users"
          value={newUsers7d!.count}
          label="New (7 days)"
          sub="Recent signups"
          color="#7c3aed"
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="M8 2v4l3 3"/><circle cx="8" cy="8" r="6"/>
              <path d="M2 8h2M12 8h2M8 14v-2"/>
            </svg>
          }
        />
        {/* Workspaces */}
        <StatCard
          href="/Orbit-admin/orbit/workspaces"
          value={totalWorkspaces!.count}
          label="Workspaces"
          sub="Active tenants"
          color="#059669"
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="M2 5.5h12M2 10.5h12M5.5 2v12M10.5 2v12"/><rect x="1.5" y="1.5" width="13" height="13" rx="2"/>
            </svg>
          }
        />
        {/* Email */}
        <StatCard
          href="/Orbit-admin/orbit/email"
          value={emailCount!.count}
          label="Email queue"
          sub="Transactional outbox"
          color="#f59e0b"
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/>
              <path d="M1.5 5.5l6.5 4.5 6.5-4.5"/>
            </svg>
          }
        />
      </div>

      {/* ── Secondary strip ── */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/Orbit-admin/orbit/queues"
          className="group flex items-center gap-4 rounded-[14px] border border-black/[0.06] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition hover:shadow-[0_3px_12px_rgba(0,0,0,0.09)]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0891b2]/10">
            <svg viewBox="0 0 16 16" fill="none" stroke="#0891b2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <rect x="1.5" y="2.5" width="13" height="3" rx="1"/><rect x="1.5" y="6.5" width="13" height="3" rx="1"/>
              <rect x="1.5" y="10.5" width="13" height="3" rx="1"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[20px] font-black text-[#0891b2]">{queues.length}</p>
            <p className="text-[11.5px] font-semibold text-[#37352f]">Queue workers</p>
          </div>
          <svg viewBox="0 0 12 12" fill="none" stroke="#c4c1bb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100">
            <path d="M2 6h8M7 3l3 3-3 3"/>
          </svg>
        </Link>
        <Link href="/Orbit-admin/orbit/analytics"
          className="group flex items-center gap-4 rounded-[14px] border border-black/[0.06] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition hover:shadow-[0_3px_12px_rgba(0,0,0,0.09)]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#6366f1]/10">
            <svg viewBox="0 0 16 16" fill="none" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="M1.5 12.5l4-4 3 3 5-6"/><circle cx="14.5" cy="5.5" r="1.5"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[20px] font-black text-[#6366f1]">{newUsers30d!.count}</p>
            <p className="text-[11.5px] font-semibold text-[#37352f]">New users (30d)</p>
          </div>
          <svg viewBox="0 0 12 12" fill="none" stroke="#c4c1bb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100">
            <path d="M2 6h8M7 3l3 3-3 3"/>
          </svg>
        </Link>
      </div>

      {/* ── Bottom panels ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent registrations */}
        <div className="overflow-hidden rounded-[18px] border border-black/[0.07] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-[13.5px] font-bold text-[#1c1917]">Recent registrations</h2>
              <p className="text-[11px] text-[#a8a29e]">Latest accounts to join</p>
            </div>
            <Link href="/Orbit-admin/orbit/users"
              className="flex items-center gap-1 rounded-[8px] bg-[#f5f4f2] px-3 py-1.5 text-[11px] font-semibold text-[#5c5a55] transition hover:bg-[#e8e8e6]">
              View all
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
                <path d="M2 5h6M5 2l3 3-3 3"/>
              </svg>
            </Link>
          </div>
          <div className="border-t border-black/[0.05]">
            {recentUsers.map((u, i) => {
              const label = u.name ?? u.email;
              const bg    = avatarColor(u.id);
              return (
                <Link key={u.id} href={`/Orbit-admin/orbit/users/${u.id}`}
                  className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-[#faf9f8]"
                  style={{ borderTop: i === 0 ? undefined : "1px solid rgba(0,0,0,0.04)" }}>
                  <div className="relative shrink-0">
                    <span className="flex size-8 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm"
                      style={{ background: bg }}>
                      {label.slice(0, 1).toUpperCase()}
                    </span>
                    {u.banned && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full border border-white bg-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-[#37352f] group-hover:text-[#2383e2]">{u.email}</p>
                    {u.name && <p className="truncate text-[11px] text-[#a8a29e]">{u.name}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] font-medium text-[#c4c1bb]">{ago(u.createdAt)}</span>
                    {u.isPlatformAdmin && (
                      <span className="rounded-full bg-[#2383e2]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#2383e2]">Admin</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent audit events */}
        <div className="overflow-hidden rounded-[18px] border border-black/[0.07] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-[13.5px] font-bold text-[#1c1917]">Audit events</h2>
              <p className="text-[11px] text-[#a8a29e]">Recent operator actions</p>
            </div>
            <Link href="/Orbit-admin/orbit/audit"
              className="flex items-center gap-1 rounded-[8px] bg-[#f5f4f2] px-3 py-1.5 text-[11px] font-semibold text-[#5c5a55] transition hover:bg-[#e8e8e6]">
              View all
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
                <path d="M2 5h6M5 2l3 3-3 3"/>
              </svg>
            </Link>
          </div>
          <div className="border-t border-black/[0.05]">
            {recentAudit.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 flex size-11 items-center justify-center rounded-[12px] bg-[#f5f4f2]">
                  <svg viewBox="0 0 18 18" fill="none" stroke="#c4c1bb" strokeWidth="1.5" strokeLinecap="round" className="size-5">
                    <path d="M4 4.5h10M4 8.5h10M4 12.5h6"/>
                  </svg>
                </div>
                <p className="text-[12.5px] font-semibold text-[#a8a29e]">No audit events yet</p>
                <p className="mt-0.5 text-[11px] text-[#c4c1bb]">Admin actions will appear here.</p>
              </div>
            ) : (
              recentAudit.map((ev, i) => {
                const meta = ACTION_META[ev.action];
                return (
                  <div key={ev.id}
                    className="flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-[#faf9f8]"
                    style={{ borderTop: i === 0 ? undefined : "1px solid rgba(0,0,0,0.04)" }}>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[14px]"
                      style={{ background: meta?.bg ?? "#f5f4f2" }}>
                      {meta?.icon ?? "·"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-[#37352f]">{meta?.label ?? ev.action}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                          style={{ color: meta?.color ?? "#787774", background: meta?.bg ?? "#f5f4f2" }}>
                          {ev.targetType}
                        </span>
                        <span className="font-mono text-[9.5px] text-[#c4c1bb]">{ev.targetId?.slice(0, 10) ?? "—"}…</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-[#c4c1bb]">{ago(ev.createdAt)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  href, value, label, sub, color, icon,
}: {
  href: string; value: number; label: string; sub: string;
  color: string; icon: React.ReactNode;
}) {
  return (
    <Link href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[18px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)]">
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-[18px] transition-opacity group-hover:opacity-80"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

      <div className="flex items-start justify-between">
        <div className="flex size-9 items-center justify-center rounded-[10px] transition-transform group-hover:scale-110"
          style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <svg viewBox="0 0 10 10" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="size-3 opacity-0 transition group-hover:opacity-60">
          <path d="M2 5h6M5 2l3 3-3 3"/>
        </svg>
      </div>

      <div className="mt-4">
        <p className="text-[30px] font-black leading-none tracking-tight" style={{ color }}>{value}</p>
        <p className="mt-1.5 text-[12.5px] font-bold text-[#37352f]">{label}</p>
        <p className="mt-0.5 text-[11px] text-[#a8a29e]">{sub}</p>
      </div>
    </Link>
  );
}
