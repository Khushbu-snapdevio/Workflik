import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Users – Orbit Admin" };

function avatarColor(str: string) {
  const colors = ["#2383e2","#7c3aed","#059669","#f59e0b","#dc2626","#0891b2"];
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
      <div className="mb-8 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#7c3aed] to-[#9f67fa] p-6 shadow-[0_4px_24px_rgba(124,58,237,0.22)]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Orbit Admin</p>
        <h1 className="mt-1 text-[26px] font-black tracking-tight text-white">Users</h1>
        <p className="mt-1 text-[13px] text-white/70">All registered accounts — ban, impersonate, revoke sessions.</p>
        <div className="mt-4 flex gap-4">
          <div className="flex flex-col">
            <span className="text-[22px] font-black leading-none text-white">{totalCount!.count}</span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">Total</span>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex flex-col">
            <span className="text-[22px] font-black leading-none text-white">{adminCount}</span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">Admins</span>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex flex-col">
            <span className="text-[22px] font-black leading-none text-white">{bannedCount!.count}</span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">Banned</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <div className="border-b border-black/[0.06] px-5 py-3.5">
          <p className="text-[12.5px] font-semibold text-[#5c5a55]">
            {users.length} account{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9f8f7]">
                <th className="px-5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-[#a8a29e]">User</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-[#a8a29e]">Role</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-[#a8a29e]">Status</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-[#a8a29e]">Joined</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-[#a8a29e]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {users.map(u => {
                const label = u.name ?? u.email;
                const bg    = avatarColor(u.id);
                return (
                  <tr key={u.id} className="group transition-colors hover:bg-[#fafaf9]">
                    <td className="px-5 py-3">
                      <Link href={`/Orbit-admin/orbit/users/${u.id}`} className="flex items-center gap-3 hover:no-underline">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: bg }}>
                          {label.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-[#37352f] group-hover:text-[#2383e2]">{u.email}</p>
                          {u.name && <p className="text-[11px] text-[#a8a29e]">{u.name}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                        u.isPlatformAdmin
                          ? "bg-[#2383e2]/10 text-[#2383e2]"
                          : "bg-[#f5f4f2] text-[#787774]"
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
                        <span className="size-1.5 rounded-full" style={{ background: u.banned ? "#dc2626" : "#059669" }} />
                        {u.banned ? "banned" : "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11.5px] text-[#a8a29e]">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/Orbit-admin/orbit/users/${u.id}`}
                        className="rounded-[7px] bg-[#f5f4f2] px-2.5 py-1 text-[11px] font-semibold text-[#5c5a55] transition hover:bg-[#e8e8e6] hover:text-[#37352f]">
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
