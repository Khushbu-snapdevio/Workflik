import { count, desc, gte } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { emailOutbox, platformAuditLog, users, workspaces } from "@/lib/db/schema";
import { getQueueSummary } from "@/lib/jobs/queue-inspection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview – Orbit Admin" };

const AVATAR_BG = ["bg-primary","bg-destructive","bg-success","bg-warning","bg-muted-foreground","bg-secondary-foreground"];
function avatarBg(str: string) {
 let h = 0;
 for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
 return AVATAR_BG[h % AVATAR_BG.length]!;
}

function ago(d: Date | null | undefined) {
 if (!d) return "—";
 const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
 if (s < 60) return `${s}s ago`;
 if (s < 3600) return `${Math.floor(s / 60)}m ago`;
 if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
 return `${Math.floor(s / 86400)}d ago`;
}

const ACTION_META: Record<string, { label: string; pill: string; iconCls: string; icon: React.ReactNode }> = {
 "user.banned": {
  label: "User banned", pill: "bg-destructive/[0.06] text-destructive", iconCls: "bg-destructive/[0.06] text-destructive",
  icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><circle cx="7" cy="7" r="5.5"/><path d="M3.5 3.5l7 7"/></svg>,
 },
 "user.unbanned": {
  label: "User unbanned", pill: "bg-success/10 text-success", iconCls: "bg-success/10 text-success",
  icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M2 7l3.5 3.5L12 4"/></svg>,
 },
 "user.impersonated": {
  label: "Impersonated", pill: "bg-primary/10 text-primary", iconCls: "bg-primary/10 text-primary",
  icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><circle cx="5" cy="4.5" r="2"/><path d="M1 12c0-2 1.7-3.5 3.5-3.5S9 10 9 12"/><path d="M11 7l2 2-2 2M13 9H9"/></svg>,
 },
 "user.sessions_revoked": {
  label: "Sessions revoked", pill: "bg-primary/10 text-primary", iconCls: "bg-primary/10 text-primary",
  icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M7 2v4l2 2"/><circle cx="7" cy="7" r="5"/></svg>,
 },
 "workspace.force_deleted": {
  label: "Workspace deleted", pill: "bg-destructive/[0.06] text-destructive", iconCls: "bg-destructive/[0.06] text-destructive",
  icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M2 4h10M5 4V2.5h4V4M11 4l-.7 7.5a1 1 0 01-1 .9H4.7a1 1 0 01-1-.9L3 4"/></svg>,
 },
};

export default async function OrbitOverviewPage() {
 const now  = new Date();
 const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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
   id:    platformAuditLog.id,
   action:  platformAuditLog.action,
   targetType:platformAuditLog.targetType,
   targetId: platformAuditLog.targetId,
   createdAt: platformAuditLog.createdAt,
  }).from(platformAuditLog).orderBy(desc(platformAuditLog.createdAt)).limit(8),
 ]);

 return (
  <div className="space-y-6">

   {/* ── Hero header ── */}
   <div className="rounded-[var(--radius-xl)] border border-border/50 bg-muted/30">
    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
     <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Platform health, recent registrations, and operator actions.</p>
      <div className="mt-4 flex items-center gap-3">
       <div className="flex items-center gap-1.5">
        <span className="relative flex size-2">
         <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
         <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">All systems operational</span>
       </div>
       <span className="text-muted-foreground/40">·</span>
       <span className="text-xs text-muted-foreground/60">{queues.length} worker{queues.length !== 1 ? "s" : ""} active</span>
      </div>
     </div>
     <div className="hidden shrink-0 items-center divide-x divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-muted/30 sm:flex">
      <div className="px-6 py-5 text-center">
       <p className="text-3xl font-bold leading-none text-foreground">{totalUsers!.count}</p>
       <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Users</p>
      </div>
      <div className="px-6 py-5 text-center">
       <p className="text-3xl font-bold leading-none text-foreground">{totalWorkspaces!.count}</p>
       <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Workspaces</p>
      </div>
      <div className="px-6 py-5 text-center">
       <p className="text-3xl font-bold leading-none text-foreground">{newUsers7d!.count}</p>
       <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">New / 7d</p>
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
     className="group flex items-center gap-4 rounded-[var(--radius-xl)] border border-border bg-card p-4 transition-colors hover:bg-accent/30">
     <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-primary">
       <rect x="1.5" y="2.5" width="13" height="3" rx="1"/><rect x="1.5" y="6.5" width="13" height="3" rx="1"/>
       <rect x="1.5" y="10.5" width="13" height="3" rx="1"/>
      </svg>
     </div>
     <div className="min-w-0">
      <p className="text-xl font-bold text-primary">{queues.length}</p>
      <p className="text-xs font-semibold text-foreground">Queue workers</p>
     </div>
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition group-hover:opacity-100">
      <path d="M2 6h8M7 3l3 3-3 3"/>
     </svg>
    </Link>
    <Link href="/Orbit-admin/orbit/analytics"
     className="group flex items-center gap-4 rounded-[var(--radius-xl)] border border-border bg-card p-4 transition-colors hover:bg-accent/30">
     <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-primary">
       <path d="M1.5 12.5l4-4 3 3 5-6"/>
      </svg>
     </div>
     <div className="min-w-0">
      <p className="text-xl font-bold text-primary">{newUsers30d!.count}</p>
      <p className="text-xs font-semibold text-foreground">New users (30d)</p>
     </div>
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition group-hover:opacity-100">
      <path d="M2 6h8M7 3l3 3-3 3"/>
     </svg>
    </Link>
   </div>

   {/* ── Bottom panels ── */}
   <div className="grid gap-5 lg:grid-cols-2">
    {/* Recent registrations */}
    <div className="rounded-[var(--radius-xl)] border border-border/50 bg-muted/30">
     <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <div>
       <h2 className="text-[13.5px] font-semibold text-foreground">Recent registrations</h2>
       <p className="text-xs text-muted-foreground">Latest accounts to join</p>
      </div>
      <Link href="/Orbit-admin/orbit/users"
       className="flex items-center gap-1 rounded-[var(--radius-md)] bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground">
       View all
       <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-2.5"><path d="M2 5h6M5 2l3 3-3 3"/></svg>
      </Link>
     </div>
     <div className="divide-y divide-border">
      {recentUsers.map((u) => {
       const displayName = u.name?.trim() || u.email || "?";
       const avatarChar = displayName[0]!.toUpperCase();
       return (
        <Link key={u.id} href={`/Orbit-admin/orbit/users/${u.id}`}
         className="group flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-accent/40">
         <div className="relative shrink-0">
          <span className={`flex size-8 items-center justify-center rounded-full text-[12px] font-semibold text-white ${avatarBg(u.id)}`}>
           {avatarChar}
          </span>
          {u.banned && (
           <span className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full border-2 border-card bg-destructive" />
          )}
         </div>
         <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-foreground group-hover:text-primary">{u.email}</p>
          <p className={`truncate text-[11px] ${u.name?.trim() ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
           {u.name?.trim() || u.email?.split("@")[0] || "—"}
          </p>
         </div>
         <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[11px] font-medium text-muted-foreground/60">{ago(u.createdAt)}</span>
          {u.isPlatformAdmin && (
           <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">Admin</span>
          )}
         </div>
        </Link>
       );
      })}
     </div>
    </div>

    {/* Recent audit events */}
    <div className="rounded-[var(--radius-xl)] border border-border/50 bg-muted/30">
     <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <div>
       <h2 className="text-[13.5px] font-semibold text-foreground">Audit events</h2>
       <p className="text-xs text-muted-foreground">Recent operator actions</p>
      </div>
      <Link href="/Orbit-admin/orbit/audit"
       className="flex items-center gap-1 rounded-[var(--radius-md)] bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground">
       View all
       <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-2.5"><path d="M2 5h6M5 2l3 3-3 3"/></svg>
      </Link>
     </div>
     <div className="divide-y divide-border">
      {recentAudit.length === 0 ? (
       <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-3 flex size-11 items-center justify-center rounded-[var(--radius-xl)] bg-muted/50">
         <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-5 text-muted-foreground/50">
          <path d="M4 4.5h10M4 8.5h10M4 12.5h6"/>
         </svg>
        </div>
        <p className="text-sm font-semibold text-muted-foreground">No audit events yet</p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">Admin actions will appear here.</p>
       </div>
      ) : (
       recentAudit.map((ev) => {
        const meta = ACTION_META[ev.action];
        return (
         <div key={ev.id} className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-accent/40">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${meta?.iconCls ?? "bg-muted text-muted-foreground"}`}>
           {meta?.icon ?? <span className="size-3.5 text-muted-foreground/40">·</span>}
          </div>
          <div className="min-w-0 flex-1">
           <p className="text-[12.5px] font-semibold text-foreground">{meta?.label ?? ev.action}</p>
           <div className="flex items-center gap-1.5">
            <span className={`rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold ${meta?.pill ?? "bg-muted text-muted-foreground border-border"}`}>
             {ev.targetType}
            </span>
            <span className="font-mono text-[9.5px] text-muted-foreground/60">{ev.targetId?.slice(0, 10) ?? "—"}…</span>
           </div>
          </div>
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground/60">{ago(ev.createdAt)}</span>
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
 href, value, label, sub, icon,
}: {
 href: string; value: number; label: string; sub: string;
 icon: React.ReactNode;
}) {
 return (
  <Link href={href}
   className="group flex flex-col justify-between rounded-[var(--radius-xl)] border border-border/50 bg-muted/30 p-5 transition-colors duration-150 hover:bg-accent/30">
   <div className="flex items-start justify-between">
    <div className="flex size-9 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary">
     {icon}
    </div>
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
     className="size-3 text-muted-foreground/40 opacity-0 transition group-hover:opacity-100">
     <path d="M2 5h6M5 2l3 3-3 3"/>
    </svg>
   </div>
   <div className="mt-4">
    <p className="text-[1.75rem] font-bold leading-none tracking-tight text-primary">{value}</p>
    <p className="mt-1.5 text-[13px] font-semibold text-foreground">{label}</p>
    <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
   </div>
  </Link>
 );
}
