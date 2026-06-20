import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForceDeleteWorkspaceButton } from "@/components/orbit/orbit-admin-actions";
import { db } from "@/lib/db";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Workspace Detail – Orbit Admin" };

function avatarColor(str: string) {
  const colors = ["#2383e2","#7c3aed","#059669","#f59e0b","#dc2626","#0891b2"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return colors[h % colors.length]!;
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
      id:        workspaceMembers.id,
      userId:    workspaceMembers.userId,
      role:      workspaceMembers.role,
      status:    workspaceMembers.status,
      joinedAt:  workspaceMembers.joinedAt,
      createdAt: workspaceMembers.createdAt,
      userName:  users.name,
      userEmail: users.email,
      userId2:   users.id,
    })
    .from(workspaceMembers)
    .leftJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, id));

  const activeMembers = members.filter(m => m.status === "active");
  const letter = (ws.icon && ws.icon.length <= 2 ? ws.icon : ws.name?.slice(0, 1) ?? "W").toUpperCase();

  return (
    <div>
      {/* Back */}
      <Link href="/Orbit-admin/orbit/workspaces"
        className="mb-5 flex items-center gap-1.5 text-[12px] font-medium text-[#a8a29e] transition hover:text-[#5c5a55]">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3">
          <path d="M8 2L4 6l4 4"/>
        </svg>
        Back to workspaces
      </Link>

      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#059669] to-[#10b981] p-6 shadow-[0_4px_24px_rgba(5,150,105,0.22)]">
        <div className="flex items-start gap-4">
          <span className="flex size-[56px] shrink-0 items-center justify-center rounded-[14px] bg-white/20 text-[22px] font-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            {letter}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-black text-white">{ws.name}</h1>
            <p className="text-[13px] text-white/70">/{ws.slug}</p>
            <div className="mt-3 flex gap-4">
              <div>
                <p className="text-[16px] font-black text-white">{activeMembers.length}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-white/60">Active members</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-[16px] font-black text-white">{members.length}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-white/60">Total members</p>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-white/50">ID</p>
            <p className="font-mono text-[11px] text-white/70">{ws.id.slice(0, 16)}…</p>
            <p className="mt-1 text-[10px] text-white/50">Created</p>
            <p className="text-[11px] text-white/70">{ago(ws.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Details */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-black/[0.06] px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-[#1c1917]">Workspace details</h2>
            </div>
            <div className="divide-y divide-black/[0.04] px-5">
              {[
                { label: "Name",    value: ws.name },
                { label: "Slug",    value: `/${ws.slug}` },
                { label: "Icon",    value: ws.icon ?? "—" },
                { label: "ID",      value: <span className="break-all font-mono text-[9.5px]">{ws.id}</span> },
                { label: "Created", value: formatDateTime(ws.createdAt) },
              ].map(row => (
                <div key={row.label} className="flex items-baseline justify-between gap-2 py-2.5">
                  <span className="shrink-0 text-[10.5px] font-semibold text-[#a8a29e]">{row.label}</span>
                  <span className="min-w-0 text-right text-[11.5px] text-[#37352f]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="overflow-hidden rounded-[16px] border border-red-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-red-100 bg-red-50 px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-red-700">Danger zone</h2>
            </div>
            <div className="p-5">
              <p className="mb-3 text-[11.5px] leading-relaxed text-[#787774]">
                Force deleting will permanently remove this workspace and all its data. This cannot be undone.
              </p>
              <ForceDeleteWorkspaceButton workspaceId={id} workspaceName={ws.name} />
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="border-b border-black/[0.06] px-5 py-3.5">
              <h2 className="text-[12.5px] font-bold text-[#1c1917]">Members <span className="ml-1 rounded-full bg-[#f5f4f2] px-2 py-0.5 text-[10px] font-semibold text-[#787774]">{members.length}</span></h2>
            </div>
            {members.length === 0 ? (
              <p className="px-5 py-10 text-center text-[12px] text-[#a8a29e]">No members</p>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {members.map(m => {
                  const label = m.userName ?? m.userEmail ?? "Unknown";
                  const bg    = avatarColor(m.userId2 ?? m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      {m.userId2 ? (
                        <Link href={`/Orbit-admin/orbit/users/${m.userId2}`} className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white hover:opacity-80"
                          style={{ background: bg }}>
                          {label.slice(0, 1).toUpperCase()}
                        </Link>
                      ) : (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f5f4f2] text-[11px] font-bold text-[#a8a29e]">?</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-[#37352f]">{m.userEmail ?? "—"}</p>
                        {m.userName && <p className="text-[11px] text-[#a8a29e]">{m.userName}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          m.role === "admin" ? "bg-[#7c3aed]/10 text-[#7c3aed]" :
                          m.role === "editor" ? "bg-[#2383e2]/10 text-[#2383e2]" :
                          "bg-[#f5f4f2] text-[#787774]"
                        }`}>{m.role}</span>
                        <span className={`text-[9.5px] font-semibold ${m.status === "active" ? "text-emerald-600" : "text-amber-600"}`}>
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
