import { and, count, desc, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BanButton, ImpersonateButton, RevokeSessionsButton } from "@/components/orbit/orbit-admin-actions";
import { PaginationControls } from "@/components/orbit/pagination-controls";
import { db } from "@/lib/db";
import { sessions, users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "User Detail – Orbit Admin" };

const SESSIONS_PAGE_SIZE = 15;

function ago(d: Date | null | undefined) {
 if (!d) return "—";
 const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
 if (s < 60) return `${s}s ago`;
 if (s < 3600) return `${Math.floor(s / 60)}m ago`;
 if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
 return `${Math.floor(s / 86400)}d ago`;
}

function avatarColor(str: string) {
 const colors = ["bg-primary","bg-destructive","bg-success","bg-warning","bg-muted-foreground","bg-secondary-foreground"];
 let h = 0;
 for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
 return colors[h % colors.length]!;
}

interface Props {
 params:       Promise<{ id: string }>;
 searchParams: Promise<{ page?: string }>;
}

export default async function UserDetailPage({ params, searchParams }: Props) {
 const { id } = await params;
 const sp = await searchParams;
 const sessionsPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

 const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
 if (!user) notFound();

 const now = new Date();

 const [userSessions, [totalSessions], [activeSessionsCount], memberships] = await Promise.all([
  db.select().from(sessions).where(eq(sessions.userId, id))
   .orderBy(desc(sessions.createdAt))
   .limit(SESSIONS_PAGE_SIZE)
   .offset((sessionsPage - 1) * SESSIONS_PAGE_SIZE),
  db.select({ count: count() }).from(sessions).where(eq(sessions.userId, id)),
  db.select({ count: count() }).from(sessions).where(and(eq(sessions.userId, id), gt(sessions.expiresAt, now))),
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

 const isAdmin        = user.isPlatformAdmin;
 const displayName    = user.name?.trim() || user.email || "?";
 const avatarChar     = displayName[0]!.toUpperCase();
 const avatarBg       = avatarColor(user.id);

 return (
  <div>
   {/* Breadcrumb */}
   <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
    <Link href="/orbit-admin/orbit/users"
     className="flex items-center gap-1 transition-colors hover:text-foreground">
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M7.5 2.5L4 6l3.5 3.5"/>
     </svg>
     Users
    </Link>
    <span className="text-border">/</span>
    <span className="font-medium text-foreground">{displayName}</span>
   </div>

   {/* Profile header */}
   <div className="mb-6 flex items-start gap-4">
    <span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarBg}`}>
     {avatarChar}
    </span>
    <div className="min-w-0 flex-1">
     <div className="flex flex-wrap items-center gap-2">
      <h1 className="text-xl font-bold tracking-tight text-foreground">{user.name ?? "Unnamed"}</h1>
      {isAdmin && (
       <span className="rounded-[var(--radius-xs)] bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Admin</span>
      )}
      {user.banned && (
       <span className="rounded-[var(--radius-xs)] bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Banned</span>
      )}
     </div>
     <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
     <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
       <strong className="font-bold text-foreground">{totalSessions!.count}</strong> sessions
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
       <strong className="font-bold text-foreground">{activeSessionsCount!.count}</strong> active
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
       <strong className="font-bold text-foreground">{memberships.length}</strong> workspaces
      </span>
      <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground/50">
       {user.id.slice(0, 16)}… · joined {ago(user.createdAt)}
      </span>
     </div>
    </div>
   </div>

   <div className="grid gap-4 lg:grid-cols-3">
    {/* Left column: account details + actions */}
    <div className="space-y-4">

     {/* Details card */}
     <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <div className="border-b border-border/60 bg-muted/20 px-5 py-3">
       <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Account details</h2>
      </div>
      <div className="divide-y divide-border/50 px-5">
       {[
        { label: "Email",   value: user.email },
        { label: "Name",    value: user.name ?? "—" },
        { label: "ID",      value: <span className="font-mono text-[11px] break-all">{user.id}</span> },
        { label: "Role",    value: isAdmin ? "Platform admin" : "User" },
        { label: "Status",  value: user.banned ? `Banned${user.bannedReason ? ` — ${user.bannedReason}` : ""}` : "Active" },
        { label: "Created", value: formatDateTime(user.createdAt) },
       ].map(row => (
        <div key={row.label} className="flex items-baseline justify-between gap-2 py-2.5">
         <span className="shrink-0 text-xs font-medium text-muted-foreground">{row.label}</span>
         <span className="min-w-0 text-right text-xs text-foreground">{row.value}</span>
        </div>
       ))}
      </div>
     </div>

     {/* Admin actions */}
     <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <div className="border-b border-border/60 bg-muted/20 px-5 py-3">
       <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Operator actions</h2>
      </div>
      <div className="space-y-2.5 p-4">
       <ImpersonateButton userId={id} />
       <RevokeSessionsButton userId={id} />
       <BanButton userId={id} banned={!!user.banned} />
      </div>
      <div className="border-t border-border/60 bg-muted/10 px-5 pb-4 pt-3">
       <p className="text-xs leading-relaxed text-muted-foreground/60">
        Impersonation sessions expire after 2 hours. Revoking sessions signs the user out of all devices immediately.
       </p>
      </div>
     </div>
    </div>

    {/* Right column: sessions + workspaces */}
    <div className="space-y-4 lg:col-span-2">

     {/* Sessions */}
     <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-3">
       <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Sessions</h2>
       <span className="rounded-[var(--radius-xs)] bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{totalSessions!.count}</span>
      </div>
      {userSessions.length === 0 ? (
       <p className="px-5 py-10 text-center text-xs text-muted-foreground">No sessions found</p>
      ) : (
       <div className="divide-y divide-border/50">
        {userSessions.map(s => {
         const expired = new Date(s.expiresAt) < now;
         const isImpersonation = !!s.impersonatedBy;
         return (
          <div key={s.id} className="flex items-start gap-3 px-5 py-3">
           <span className={`mt-1 size-2 shrink-0 rounded-full ${expired ? "bg-muted-foreground/30" : "bg-success"}`} />
           <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
             <p className="text-xs font-semibold text-foreground">{expired ? "Expired" : "Active"}</p>
             {isImpersonation && (
              <span className="rounded-[var(--radius-xs)] bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">Impersonation</span>
             )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.userAgent?.slice(0, 60) ?? "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">IP: {s.ipAddress ?? "—"} · Expires {ago(s.expiresAt)}</p>
           </div>
           <p className="shrink-0 text-xs text-muted-foreground/60">{ago(s.createdAt)}</p>
          </div>
         );
        })}
       </div>
      )}
     </div>
     {totalSessions!.count > SESSIONS_PAGE_SIZE && (
      <PaginationControls
       page={sessionsPage}
       pageSize={SESSIONS_PAGE_SIZE}
       totalCount={totalSessions!.count}
       basePath={`/orbit-admin/orbit/users/${id}`}
       query=""
      />
     )}

     {/* Workspace memberships */}
     <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-3">
       <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Workspace memberships</h2>
       <span className="rounded-[var(--radius-xs)] bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{memberships.length}</span>
      </div>
      {memberships.length === 0 ? (
       <p className="px-5 py-10 text-center text-xs text-muted-foreground">No workspace memberships</p>
      ) : (
       <div className="divide-y divide-border/50">
        {memberships.map(m => {
         const letter = ((m.wsIcon && m.wsIcon.length <= 2 ? m.wsIcon : m.wsName ?? "W")[0] ?? "W").toUpperCase();
         return (
          <Link key={m.id} href={`/orbit-admin/orbit/workspaces/${m.workspaceId}`}
           className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent">
           <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary text-xs font-bold text-white">
            {letter}
           </span>
           <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">{m.wsName ?? "Deleted workspace"}</p>
            <p className="text-xs text-muted-foreground/70">/{m.wsSlug ?? m.workspaceId}</p>
           </div>
           <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className={`rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-semibold ${
             m.role === "viewer" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
            }`}>{m.role}</span>
            <span className={`inline-flex items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-semibold ${
             m.status === "active" ? "bg-success/10 text-success" : m.status === "invited" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
            }`}>
             <span className={`size-1.5 rounded-full ${
              m.status === "active" ? "bg-success" : m.status === "invited" ? "bg-warning" : "bg-muted-foreground/40"
             }`} />
             {m.status}
            </span>
           </div>
          </Link>
         );
        })}
       </div>
      )}
     </div>
    </div>
   </div>
  </div>
 );
}
