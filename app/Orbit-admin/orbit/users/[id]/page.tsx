import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BanButton, ImpersonateButton, RevokeSessionsButton } from "@/components/orbit/orbit-admin-actions";
import { db } from "@/lib/db";
import { sessions, users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "User Detail – Orbit Admin" };

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
      {/* Back */}
      <Link href="/Orbit-admin/orbit/users"
        className="mb-5 flex items-center gap-1.5 text-[12px] font-medium text-[#a8a29e] transition hover:text-[#5c5a55]">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3">
          <path d="M8 2L4 6l4 4"/>
        </svg>
        Back to users
      </Link>

      {/* Profile header */}
      <div className="mb-6 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#7c3aed] to-[#9f67fa] p-6 shadow-[0_4px_24px_rgba(124,58,237,0.22)]">
        <div className="flex items-start gap-4">
          <div className="flex size-[60px] shrink-0 items-center justify-center rounded-[16px] text-[24px] font-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
            style={{ background: `${bg}cc` }}>
            {label.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-black text-white">{user.name ?? "Unnamed"}</h1>
              {isAdmin && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-bold text-white">Admin</span>
              )}
              {user.banned && (
                <span className="rounded-full bg-red-400/30 px-2 py-0.5 text-[10.5px] font-bold text-red-100">Banned</span>
              )}
            </div>
            <p className="text-[13.5px] text-white/80">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="text-center">
                <p className="text-[16px] font-black text-white">{userSessions.length}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-white/60">Sessions</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-[16px] font-black text-white">{activeSessions.length}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-white/60">Active</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-[16px] font-black text-white">{memberships.length}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-white/60">Workspaces</p>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-white/50">User ID</p>
            <p className="font-mono text-[11px] text-white/70">{user.id.slice(0, 16)}…</p>
            <p className="mt-1 text-[10px] text-white/50">Joined</p>
            <p className="text-[11px] text-white/70">{ago(user.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column: account details + actions */}
        <div className="space-y-4">
          {/* Details card */}
          <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-black/[0.06] px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-[#1c1917]">Account details</h2>
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
                  <span className="shrink-0 text-[10.5px] font-semibold text-[#a8a29e]">{row.label}</span>
                  <span className="min-w-0 text-right text-[11.5px] text-[#37352f]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin actions */}
          <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-black/[0.06] px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-[#1c1917]">Operator actions</h2>
            </div>
            <div className="space-y-3 p-5">
              <ImpersonateButton userId={id} />
              <RevokeSessionsButton userId={id} />
              <BanButton userId={id} banned={!!user.banned} />
            </div>
            <div className="border-t border-black/[0.05] px-5 pb-4 pt-3">
              <p className="text-[10.5px] leading-relaxed text-[#c4c1bb]">
                Impersonation sessions expire after 2 hours. Revoking sessions signs the user out of all devices immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: sessions + workspaces */}
        <div className="space-y-4 lg:col-span-2">
          {/* Sessions */}
          <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-black/[0.06] px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-[#1c1917]">Sessions <span className="ml-1 rounded-full bg-[#f5f4f2] px-2 py-0.5 text-[10px] font-semibold text-[#787774]">{userSessions.length}</span></h2>
            </div>
            {userSessions.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-[#a8a29e]">No sessions found</p>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {userSessions.map(s => {
                  const expired  = new Date(s.expiresAt) < now;
                  const isImpersonation = !!s.impersonatedBy;
                  return (
                    <div key={s.id} className="flex items-start gap-3 px-5 py-3">
                      <span className={`mt-0.5 size-2 shrink-0 rounded-full ${expired ? "bg-[#d1cec8]" : "bg-emerald-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11.5px] font-semibold text-[#37352f]">
                            {expired ? "Expired" : "Active"}
                          </p>
                          {isImpersonation && (
                            <span className="rounded-full bg-[#7c3aed]/10 px-1.5 text-[9.5px] font-bold text-[#7c3aed]">Impersonation</span>
                          )}
                        </div>
                        <p className="truncate text-[10.5px] text-[#a8a29e]">{s.userAgent?.slice(0, 60) ?? "—"}</p>
                        <p className="text-[10px] text-[#c4c1bb]">IP: {s.ipAddress ?? "—"} · Expires {ago(s.expiresAt)}</p>
                      </div>
                      <p className="shrink-0 text-[10px] text-[#c4c1bb]">{ago(s.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workspace memberships */}
          <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-black/[0.06] px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-[#1c1917]">Workspace memberships <span className="ml-1 rounded-full bg-[#f5f4f2] px-2 py-0.5 text-[10px] font-semibold text-[#787774]">{memberships.length}</span></h2>
            </div>
            {memberships.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-[#a8a29e]">No workspace memberships</p>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {memberships.map(m => (
                  <Link key={m.id} href={`/Orbit-admin/orbit/workspaces/${m.workspaceId}`}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#f9f8f7]">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#059669] to-[#34d399] text-[11px] font-bold text-white">
                      {(m.wsIcon ?? m.wsName ?? "W").slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-[#37352f]">{m.wsName ?? "Deleted workspace"}</p>
                      <p className="text-[10.5px] text-[#a8a29e]">{m.wsSlug ?? m.workspaceId}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        m.role === "admin" ? "bg-[#7c3aed]/10 text-[#7c3aed]" :
                        m.role === "editor" ? "bg-[#2383e2]/10 text-[#2383e2]" :
                        "bg-[#f5f4f2] text-[#787774]"
                      }`}>{m.role}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${
                        m.status === "active" ? "text-emerald-600" : "text-amber-600"
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
