import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BanButton, ImpersonateButton, RevokeSessionsButton } from "@/components/orbit/orbit-admin-actions";
import { db } from "@/lib/db";
import { sessions, users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "User Detail – Orbit Admin" };

function avatarColor(str: string) {
  const colors = ["#0284C7","#0369a1","#0ea5e9","#0891b2","#dc2626","#075985"];
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

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();

  const [userSessions, memberships] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.userId, id)).orderBy(desc(sessions.createdAt)).limit(10),
    db.select({
      id:          workspaceMembers.id,
      role:        workspaceMembers.role,
      status:      workspaceMembers.status,
      joinedAt:    workspaceMembers.joinedAt,
      createdAt:   workspaceMembers.createdAt,
      workspaceId: workspaceMembers.workspaceId,
      wsName:      workspaces.name,
      wsSlug:      workspaces.slug,
      wsIcon:      workspaces.icon,
    })
    .from(workspaceMembers)
    .leftJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, id))
    .orderBy(desc(workspaceMembers.createdAt)),
  ]);

  const label   = user.name ?? user.email;
  const bg      = avatarColor(id);
  const isAdmin = user.isPlatformAdmin;
  const now     = new Date();
  const activeSessions = userSessions.filter(s => new Date(s.expiresAt) > now);

  return (
    <div>
      {/* Breadcrumb navigation */}
      <div className="mb-4 flex items-center gap-2">
        <Link href="/Orbit-admin/orbit/users"
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:bg-sky-50 hover:text-primary">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
            <path d="M7.5 2.5L4 6l3.5 3.5"/>
          </svg>
          Users
        </Link>
        <span className="select-none text-[13px] font-light text-muted-foreground/30">/</span>
        <span className="text-[11.5px] font-semibold text-foreground">{user.name ?? user.email}</span>
      </div>

      {/* Profile header */}
      <div className="mb-6 overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <div className="h-[3px] bg-gradient-to-r from-primary to-sky-400/50" />
        <div className="p-6">
          <h1 className="text-[26px] font-black tracking-tight text-foreground">{user.name ?? "Unnamed"}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{user.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isAdmin && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">Admin</span>
            )}
            {user.banned && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-600">Banned</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex flex-col">
              <span className="text-[16px] font-black leading-none text-primary">{userSessions.length}</span>
              <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/60">Sessions</span>
            </div>
            <div className="w-px border-l border-border/60" />
            <div className="flex flex-col">
              <span className="text-[16px] font-black leading-none text-primary">{activeSessions.length}</span>
              <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/60">Active</span>
            </div>
            <div className="w-px border-l border-border/60" />
            <div className="flex flex-col">
              <span className="text-[16px] font-black leading-none text-primary">{memberships.length}</span>
              <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/60">Workspaces</span>
            </div>
            <div className="ml-auto shrink-0 text-right">
              <p className="text-[10px] text-muted-foreground/60">User ID</p>
              <p className="font-mono text-[11px] text-muted-foreground">{user.id.slice(0, 16)}…</p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">Joined</p>
              <p className="text-[11px] text-muted-foreground">{ago(user.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column: account details + actions */}
        <div className="space-y-4">
          {/* Details card */}
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/60 px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-foreground">Account details</h2>
            </div>
            <div className="divide-y divide-black/[0.04] px-5">
              {[
                { label: "Email",   value: user.email },
                { label: "Name",    value: user.name ?? "—" },
                { label: "ID",      value: <span className="font-mono text-[10px]">{user.id}</span> },
                { label: "Role",    value: isAdmin ? "Platform admin" : "User" },
                { label: "Status",  value: user.banned ? `Banned${user.bannedReason ? ` — ${user.bannedReason}` : ""}` : "Active" },
                { label: "Created", value: formatDateTime(user.createdAt) },
              ].map(row => (
                <div key={row.label} className="flex items-baseline justify-between gap-2 py-2.5">
                  <span className="shrink-0 text-[10.5px] font-semibold text-muted-foreground">{row.label}</span>
                  <span className="min-w-0 text-right text-[11.5px] text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin actions */}
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/60 px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-foreground">Operator actions</h2>
            </div>
            <div className="space-y-3 p-5">
              <ImpersonateButton userId={id} />
              <RevokeSessionsButton userId={id} />
              <BanButton userId={id} banned={!!user.banned} />
            </div>
            <div className="border-t border-border/40 px-5 pb-4 pt-3">
              <p className="text-[10.5px] leading-relaxed text-muted-foreground/60">
                Impersonation sessions expire after 2 hours. Revoking sessions signs the user out of all devices immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: sessions + workspaces */}
        <div className="space-y-4 lg:col-span-2">
          {/* Sessions */}
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/60 px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-foreground">Sessions <span className="ml-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{userSessions.length}</span></h2>
            </div>
            {userSessions.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-muted-foreground">No sessions found</p>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {userSessions.map(s => {
                  const expired  = new Date(s.expiresAt) < now;
                  const isImpersonation = !!s.impersonatedBy;
                  return (
                    <div key={s.id} className="flex items-start gap-3 px-5 py-3">
                      <span className={`mt-0.5 size-2 shrink-0 rounded-full ${expired ? "bg-muted-foreground/30" : "bg-primary"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11.5px] font-semibold text-foreground">
                            {expired ? "Expired" : "Active"}
                          </p>
                          {isImpersonation && (
                            <span className="rounded-full bg-primary/10 px-1.5 text-[9.5px] font-bold text-primary">Impersonation</span>
                          )}
                        </div>
                        <p className="truncate text-[10.5px] text-muted-foreground">{s.userAgent?.slice(0, 60) ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground/60">IP: {s.ipAddress ?? "—"} · Expires {ago(s.expiresAt)}</p>
                      </div>
                      <p className="shrink-0 text-[10px] text-muted-foreground/60">{ago(s.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workspace memberships */}
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/60 px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-foreground">Workspace memberships <span className="ml-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{memberships.length}</span></h2>
            </div>
            {memberships.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-muted-foreground">No workspace memberships</p>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {memberships.map(m => (
                  <Link key={m.id} href={`/Orbit-admin/orbit/workspaces/${m.workspaceId}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/40">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[#0284C7] to-[#38bdf8] text-[11px] font-bold text-white">
                      {(m.wsIcon ?? m.wsName ?? "W").slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-foreground">{m.wsName ?? "Deleted workspace"}</p>
                      <p className="text-[10.5px] text-muted-foreground">{m.wsSlug ?? m.workspaceId}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        m.role === "viewer" ? "bg-muted/50 text-muted-foreground" : "bg-primary/10 text-primary"
                      }`}>{m.role}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${
                        m.status === "active" ? "text-primary" : "text-muted-foreground"
                      }`}>{m.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
