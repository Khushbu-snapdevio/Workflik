import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForceDeleteWorkspaceButton } from "@/components/orbit/orbit-admin-actions";
import { db } from "@/lib/db";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Workspace Detail – Orbit Admin" };

function avatarCls(str: string) {
 const cls = ["bg-primary", "bg-destructive", "bg-success", "bg-warning", "bg-muted-foreground", "bg-secondary-foreground"];
 let h = 0;
 for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
 return cls[h % cls.length]!;
}

function ago(d: Date | null | undefined) {
 if (!d) return "—";
 const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
 if (s < 3600) return `${Math.floor(s / 60)}m ago`;
 if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
 return `${Math.floor(s / 86400)}d ago`;
}

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;

 const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
 if (!ws) notFound();

 const members = await db
  .select({
   id:    workspaceMembers.id,
   userId:  workspaceMembers.userId,
   role:   workspaceMembers.role,
   status:  workspaceMembers.status,
   joinedAt: workspaceMembers.joinedAt,
   createdAt: workspaceMembers.createdAt,
   userName: users.name,
   userEmail: users.email,
   userId2:  users.id,
  })
  .from(workspaceMembers)
  .leftJoin(users, eq(workspaceMembers.userId, users.id))
  .where(eq(workspaceMembers.workspaceId, id));

 const activeMembers = members.filter(m => m.status === "active");

 return (
  <div>
   {/* Breadcrumb */}
   <div className="mb-4 flex items-center gap-2">
    <Link href="/orbit-admin/orbit/workspaces"
     className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-primary/5 hover:text-primary">
     <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M7.5 2.5L4 6l3.5 3.5"/>
     </svg>
     Workspaces
    </Link>
    <span className="select-none text-sm font-light text-muted-foreground/30">/</span>
    <span className="text-xs font-semibold text-foreground">{ws.name}</span>
   </div>

   {/* Header */}
   <div className="mb-6 rounded-[var(--radius-xl)] border border-border/50 bg-muted/30">
    <div className="p-6">
     <h1 className="text-3xl font-bold tracking-tight text-foreground">{ws.name}</h1>
     <p className="mt-1 text-sm text-muted-foreground">/{ws.slug}</p>
     <div className="mt-4 flex flex-wrap items-center gap-4">
      <div>
       <p className="text-base font-bold text-primary">{activeMembers.length}</p>
       <p className="text-[9.5px] font-semibold tracking-wide text-muted-foreground/60">Active members</p>
      </div>
      <div className="h-6 w-px bg-border" />
      <div>
       <p className="text-base font-bold text-primary">{members.length}</p>
       <p className="text-[9.5px] font-semibold tracking-wide text-muted-foreground/60">Total members</p>
      </div>
      <div className="ml-auto shrink-0 text-right">
       <p className="text-xs text-muted-foreground/60">ID</p>
       <p className="font-mono text-xs text-muted-foreground">{ws.id.slice(0, 16)}…</p>
       <p className="mt-1 text-xs text-muted-foreground/60">Created</p>
       <p className="text-xs text-muted-foreground">{ago(ws.createdAt)}</p>
      </div>
     </div>
    </div>
   </div>

   <div className="grid gap-5 lg:grid-cols-3">
    {/* Details */}
    <div className="space-y-4">
     <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
       <h2 className="text-xs font-bold text-foreground">Workspace details</h2>
      </div>
      <div className="divide-y divide-border px-5">
       {[
        { label: "Name",  value: ws.name },
        { label: "Slug",  value: `/${ws.slug}` },
        { label: "Icon",  value: ws.icon ?? "—" },
        { label: "ID",   value: <span className="break-all font-mono text-[9.5px]">{ws.id}</span> },
        { label: "Created", value: formatDateTime(ws.createdAt) },
       ].map(row => (
        <div key={row.label} className="flex items-baseline justify-between gap-2 py-2.5">
         <span className="shrink-0 text-xs font-semibold text-muted-foreground">{row.label}</span>
         <span className="min-w-0 text-right text-xs text-foreground">{row.value}</span>
        </div>
       ))}
      </div>
     </div>

     {/* Danger zone */}
     <div className="overflow-hidden rounded-[var(--radius-xl)] border border-destructive/20 bg-card">
      <div className="border-b border-destructive/10 bg-destructive/5 px-5 py-3.5">
       <h2 className="text-xs font-bold text-destructive">Danger zone</h2>
      </div>
      <div className="p-5">
       <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Force deleting will permanently remove this workspace and all its data. This cannot be undone.
       </p>
       <ForceDeleteWorkspaceButton workspaceId={id} workspaceName={ws.name} />
      </div>
     </div>
    </div>

    {/* Members */}
    <div className="lg:col-span-2">
     <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
       <h2 className="text-xs font-bold text-foreground">Members <span className="ml-1 rounded-full bg-muted/50 px-2 py-0.5 text-xs font-semibold text-muted-foreground">{members.length}</span></h2>
      </div>
      {members.length === 0 ? (
       <p className="px-5 py-10 text-center text-xs text-muted-foreground">No members</p>
      ) : (
       <div className="divide-y divide-border">
        {members.map(m => {
         const label = m.userName ?? m.userEmail ?? "Unknown";
         const cls  = avatarCls(m.userId2 ?? m.id);
         return (
          <div key={m.id} className="flex items-center gap-3 px-5 py-3">
           {m.userId2 ? (
            <Link href={`/orbit-admin/orbit/users/${m.userId2}`}
             className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white hover:opacity-80 ${cls}`}>
             {label.slice(0, 1).toUpperCase()}
            </Link>
           ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/50 text-xs font-bold text-muted-foreground">?</span>
           )}
           <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">{m.userEmail ?? "—"}</p>
            {m.userName && <p className="text-xs text-muted-foreground">{m.userName}</p>}
           </div>
           <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
             m.role === "admin" || m.role === "editor" ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
            }`}>{m.role}</span>
            <span className={`text-[9.5px] font-semibold ${m.status === "active" ? "text-success" : "text-warning"}`}>
             {m.status}
            </span>
           </div>
          </div>
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
