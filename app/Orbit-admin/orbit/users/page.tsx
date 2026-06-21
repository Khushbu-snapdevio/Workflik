import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Users – Orbit Admin" };

function avatarColor(str: string) {
  const colors = ["#0284C7","#0369a1","#0ea5e9","#0891b2","#dc2626","#075985"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return colors[h % colors.length]!;
}

export default async function OrbitUsersPage() {
  const [users, [totalCount], [bannedCount]] = await Promise.all([
    db.select().from(usersTable).orderBy(desc(usersTable.createdAt)),
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(usersTable)
      .where(eq(usersTable.banned, true)),
  ]);

  const adminCount = users.filter(u => u.isPlatformAdmin).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <div className="h-[3px] bg-gradient-to-r from-primary to-sky-400/50" />
        <div className="p-6">
          <h1 className="text-[26px] font-black tracking-tight text-foreground">Users</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">All registered accounts — ban, impersonate, revoke sessions.</p>
          <div className="mt-4 flex gap-4">
            <div className="flex flex-col">
              <span className="text-[22px] font-black leading-none text-primary">{totalCount!.count}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Total</span>
            </div>
            <div className="w-px border-l border-border/60" />
            <div className="flex flex-col">
              <span className="text-[22px] font-black leading-none text-primary">{adminCount}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Admins</span>
            </div>
            <div className="w-px border-l border-border/60" />
            <div className="flex flex-col">
              <span className="text-[22px] font-black leading-none text-primary">{bannedCount!.count}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Banned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/60 px-5 py-3.5">
          <p className="text-[12.5px] font-semibold text-foreground/70">
            {users.length} account{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Joined</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {users.map(u => {
                const label = u.name ?? u.email;
                const bg    = avatarColor(u.id);
                return (
                  <tr key={u.id} className="group transition-colors hover:bg-accent/40">
                    <td className="px-5 py-3">
                      <Link href={`/Orbit-admin/orbit/users/${u.id}`} className="flex items-center gap-3 hover:no-underline">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: bg }}>
                          {label.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-foreground group-hover:text-primary">{u.email}</p>
                          {u.name && <p className="text-[11px] text-muted-foreground">{u.name}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                        u.isPlatformAdmin
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/50 text-muted-foreground"
                      }`}>
                        {u.isPlatformAdmin ? "admin" : "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                        u.banned
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        <span className="size-1.5 rounded-full" style={{ background: u.banned ? "#dc2626" : "#64748B" }} />
                        {u.banned ? "banned" : "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11.5px] text-muted-foreground">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/Orbit-admin/orbit/users/${u.id}`}
                        className="rounded-[var(--radius-md)] bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-foreground/70 transition hover:bg-muted hover:text-foreground">
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
