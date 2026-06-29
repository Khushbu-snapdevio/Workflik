import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Users – Orbit Admin" };

function avatarColor(str: string) {
 const colors = ["bg-primary","bg-destructive","bg-success","bg-warning","bg-muted-foreground","bg-secondary-foreground"];
 let h = 0;
 for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
 return colors[h % colors.length]!;
}

export default async function OrbitUsersPage() {
 const [users, [totalCount], [bannedCount]] = await Promise.all([
  db.select().from(usersTable).orderBy(desc(usersTable.createdAt)),
  db.select({ count: count() }).from(usersTable),
  db.select({ count: count() }).from(usersTable).where(eq(usersTable.banned, true)),
 ]);

 const adminCount = users.filter(u => u.isPlatformAdmin).length;

 return (
  <div>
   {/* Header */}
   <div className="mb-6">
    <div className="flex items-start justify-between gap-4">
     <div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">All registered accounts — ban, impersonate, revoke sessions.</p>
     </div>
    </div>
    <div className="mt-3 flex items-center gap-2">
     <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <strong className="font-bold text-foreground">{totalCount!.count}</strong> total
     </span>
     <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <strong className="font-bold text-foreground">{adminCount}</strong> admin{adminCount !== 1 ? "s" : ""}
     </span>
     {bannedCount!.count > 0 && (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-destructive/5 px-2.5 py-1 text-xs font-medium text-destructive">
       <strong className="font-bold">{bannedCount!.count}</strong> banned
      </span>
     )}
    </div>
   </div>

   {/* Table */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="border-b border-border/60 bg-muted/20 px-5 py-3">
     <p className="text-xs font-semibold text-muted-foreground">
      {users.length} account{users.length !== 1 ? "s" : ""}
     </p>
    </div>
    <div className="overflow-x-auto">
     <table className="w-full">
      <thead>
       <tr className="bg-muted/40">
        {["User", "Role", "Status", "Joined", "Action"].map(h => (
         <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
        ))}
       </tr>
      </thead>
      <tbody className="divide-y divide-border">
       {users.map(u => {
        const displayName = u.name?.trim() || u.email || "?";
        const avatarChar  = displayName[0]!.toUpperCase();
        const bg = avatarColor(u.id);
        return (
         <tr key={u.id} className="group transition-colors hover:bg-accent">
          <td className="px-5 py-3">
           <Link href={`/orbit-admin/orbit/users/${u.id}`} className="flex items-center gap-3 hover:no-underline">
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${bg}`}>
             {avatarChar}
            </span>
            <div className="min-w-0">
             <p className="text-xs font-semibold text-foreground group-hover:text-primary">{u.email}</p>
             <p className={`text-xs ${u.name?.trim() ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
              {u.name?.trim() || u.email?.split("@")[0] || "—"}
             </p>
            </div>
           </Link>
          </td>
          <td className="px-4 py-3">
           <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            u.isPlatformAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
           }`}>
            {u.isPlatformAdmin ? "admin" : "user"}
           </span>
          </td>
          <td className="px-4 py-3">
           <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            u.banned ? "bg-destructive/5 text-destructive" : "bg-success/10 text-success"
           }`}>
            <span className={`size-1.5 rounded-full ${u.banned ? "bg-destructive" : "bg-success"}`} />
            {u.banned ? "banned" : "active"}
           </span>
          </td>
          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
          <td className="px-4 py-3">
           <Link href={`/orbit-admin/orbit/users/${u.id}`}
            className="rounded-[var(--radius-md)] bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground">
            View →
           </Link>
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>
   </div>
  </div>
 );
}
