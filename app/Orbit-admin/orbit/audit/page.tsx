import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformAuditLog, users } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Audit Trail – Orbit Admin" };

const ACTION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "user.banned":             { label: "User banned",          color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  "user.unbanned":           { label: "User unbanned",        color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  "user.impersonated":       { label: "User impersonated",    color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
  "user.sessions_revoked":   { label: "Sessions revoked",     color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  "workspace.force_deleted": { label: "Workspace force-deleted", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

function ago(d: Date | null | undefined) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default async function OrbitAuditPage() {
  const events = await db
    .select({
      id:         platformAuditLog.id,
      action:     platformAuditLog.action,
      targetType: platformAuditLog.targetType,
      targetId:   platformAuditLog.targetId,
      metadata:   platformAuditLog.metadata,
      createdAt:  platformAuditLog.createdAt,
      actorName:  users.name,
      actorEmail: users.email,
      actorId:    users.id,
    })
    .from(platformAuditLog)
    .leftJoin(users, eq(platformAuditLog.actorId, users.id))
    .orderBy(desc(platformAuditLog.createdAt))
    .limit(200);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#334155] to-[#475569] p-6 shadow-[0_4px_24px_rgba(51,65,85,0.22)]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Orbit Admin</p>
        <h1 className="mt-1 text-[26px] font-black tracking-tight text-white">Audit Trail</h1>
        <p className="mt-1 text-[13px] text-white/70">Append-only log of all admin operator actions.</p>
        <div className="mt-4">
          <span className="text-[22px] font-black text-white">{events.length}</span>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Events (last 200)</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#d1cec8] bg-[#faf9f8] py-24">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[14px] bg-[#f5f4f2]">
            <svg viewBox="0 0 20 20" fill="none" stroke="#c4c1bb" strokeWidth="1.5" className="size-7">
              <path d="M5 5h10M5 9h10M5 13h6" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[#a8a29e]">No audit events yet</p>
          <p className="mt-1 text-[12px] text-[#c4c1bb]">Admin actions will appear here automatically.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] border-b border-black/[0.06] bg-[#f9f8f7] px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-[#a8a29e]">
            <span className="w-32">Action</span>
            <span className="pl-4">Details</span>
            <span className="pr-6">Actor</span>
            <span>When</span>
          </div>

          <div className="divide-y divide-black/[0.04]">
            {events.map(ev => {
              const meta = ACTION_META[ev.action];
              const md   = ev.metadata as Record<string, unknown> | null;
              return (
                <div key={ev.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 px-5 py-3.5 transition hover:bg-[#fafaf9]">
                  {/* Badge */}
                  <span className="w-32 shrink-0">
                    <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold"
                      style={{ color: meta?.color ?? "#787774", background: meta?.bg ?? "#f9f8f7", borderColor: meta?.border ?? "#e2e8f0" }}>
                      {meta?.label ?? ev.action}
                    </span>
                  </span>

                  {/* Details */}
                  <div className="min-w-0 pl-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#a8a29e]">{ev.targetType}</span>
                      {ev.targetId && (
                        <span className="font-mono text-[10px] text-[#c4c1bb]">{ev.targetId.slice(0, 12)}…</span>
                      )}
                    </div>
                    {md && Object.keys(md).length > 0 && (
                      <p className="mt-0.5 truncate text-[10.5px] text-[#a8a29e]">
                        {Object.entries(md).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                      </p>
                    )}
                    {ev.targetId && ev.targetType === "user" && (
                      <Link href={`/Orbit-admin/orbit/users/${ev.targetId}`}
                        className="mt-0.5 text-[10px] font-semibold text-[#2383e2] hover:underline">
                        View user →
                      </Link>
                    )}
                    {ev.targetId && ev.targetType === "workspace" && (
                      <Link href={`/Orbit-admin/orbit/workspaces/${ev.targetId}`}
                        className="mt-0.5 text-[10px] font-semibold text-[#059669] hover:underline">
                        View workspace →
                      </Link>
                    )}
                  </div>

                  {/* Actor */}
                  <div className="shrink-0 pr-6 text-right">
                    {ev.actorEmail ? (
                      <Link href={`/Orbit-admin/orbit/users/${ev.actorId}`}
                        className="text-[11px] font-semibold text-[#5c5a55] hover:text-[#2383e2] hover:underline">
                        {ev.actorName ?? ev.actorEmail}
                      </Link>
                    ) : (
                      <span className="text-[11px] text-[#c4c1bb]">Deleted user</span>
                    )}
                  </div>

                  {/* Time */}
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-medium text-[#a8a29e]">{ago(ev.createdAt)}</p>
                    <p className="text-[9.5px] text-[#c4c1bb]">{formatDateTime(ev.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
