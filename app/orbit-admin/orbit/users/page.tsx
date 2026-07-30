import { count, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { formatDateTime, getAvatarColor } from "@/lib/utils";
import { AdminSearchBox } from "@/components/orbit/admin-search-box";
import { PaginationControls } from "@/components/orbit/pagination-controls";

export const metadata = { title: "Users – Orbit Admin" };

const PAGE_SIZE = 25;

interface Props {
 searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function OrbitUsersPage({ searchParams }: Props) {
 const sp   = await searchParams;
 const q    = (sp.q ?? "").trim();
 const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

 const searchFilter = q
  ? or(ilike(usersTable.email, `%${q}%`), ilike(usersTable.name, `%${q}%`))
  : undefined;

 const [users, [totalCount], [filteredCount], [bannedCount]] = await Promise.all([
  db.select().from(usersTable)
   .where(searchFilter)
   .orderBy(desc(usersTable.createdAt))
   .limit(PAGE_SIZE)
   .offset((page - 1) * PAGE_SIZE),
  db.select({ count: count() }).from(usersTable),
  searchFilter
   ? db.select({ count: count() }).from(usersTable).where(searchFilter)
   : db.select({ count: count() }).from(usersTable),
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
     <Suspense fallback={<div className="h-9 w-64 rounded-[var(--radius-md)] bg-muted animate-pulse" />}>
      <AdminSearchBox placeholder="Search by name or email…" />
     </Suspense>
    </div>
    <div className="mt-3 flex items-center gap-2">
     <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <strong className="font-bold text-foreground">{totalCount!.count}</strong> total
     </span>
     <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <strong className="font-bold text-foreground">{adminCount}</strong> admin{adminCount !== 1 ? "s" : ""} on this page
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
      {filteredCount!.count} account{filteredCount!.count !== 1 ? "s" : ""}{q ? ` matching "${q}"` : ""}
     </p>
    </div>
    {users.length === 0 ? (
     <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-semibold text-muted-foreground">No users found</p>
      <p className="mt-1 text-xs text-muted-foreground/60">
       {q ? "Try a different name or email." : "No accounts registered yet."}
      </p>
     </div>
    ) : (
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
        const bg = getAvatarColor(displayName);
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
          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
          <td className="px-4 py-3">
           <Link href={`/orbit-admin/orbit/users/${u.id}`}
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-accent">
            View <ArrowRight size={12} />
           </Link>
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>
    )}
   </div>

   <div className="mt-4">
    <PaginationControls
     page={page}
     pageSize={PAGE_SIZE}
     totalCount={filteredCount!.count}
     basePath="/orbit-admin/orbit/users"
     query={q}
    />
   </div>
  </div>
 );
}
