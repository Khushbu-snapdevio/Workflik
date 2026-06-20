import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Email – Orbit Admin" };

const STATUS_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  sent:    { color: "#059669", bg: "#f0fdf4", dot: "#059669" },
  queued:  { color: "#2383e2", bg: "#eff6ff", dot: "#2383e2" },
  sending: { color: "#7c3aed", bg: "#faf5ff", dot: "#7c3aed" },
  failed:  { color: "#dc2626", bg: "#fef2f2", dot: "#dc2626" },
};

const TYPE_LABEL: Record<string, string> = {
  notification_email: "Notification",
  digest_email:       "Digest",
};

export default async function OrbitEmailPage() {
  const [outbox, statusCounts] = await Promise.all([
    db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(50),
    Promise.all(
      (["sent", "queued", "sending", "failed"] as const).map(s =>
        db.select({ cnt: count() }).from(emailOutbox).where(eq(emailOutbox.status, s))
          .then(([r]) => ({ status: s, cnt: r?.cnt ?? 0 }))
      )
    ),
  ]);

  const total = outbox.length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0e7490] via-[#0891b2] to-[#06b6d4] p-8 shadow-[0_8px_32px_rgba(8,145,178,0.25)]">
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-cyan-300/20 blur-[80px]" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/50">Orbit Admin</p>
            <h1 className="mt-1 text-[32px] font-black tracking-tight text-white">Email</h1>
            <p className="mt-1 text-[13px] text-white/55">Transactional outbox — delivery status and retry tracking.</p>
          </div>
          <div className="hidden shrink-0 gap-5 rounded-[16px] border border-white/[0.12] bg-white/[0.07] px-6 py-4 sm:flex">
            {statusCounts.map(s => {
              const st = STATUS_STYLE[s.status]!;
              return (
                <div key={s.status} className="text-center">
                  <p className="text-[26px] font-black leading-none text-white">{s.cnt}</p>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
                    <p className="text-[9.5px] font-bold uppercase tracking-widest text-white/50">{s.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[18px] border border-black/[0.07] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
          <div>
            <h2 className="text-[13.5px] font-bold text-[#1c1917]">Outbox</h2>
            <p className="text-[11px] text-[#a8a29e]">Latest {total} of all transactional emails</p>
          </div>
          <span className="rounded-full bg-[#f5f4f2] px-3 py-1 text-[11px] font-semibold text-[#787774]">{total} shown</span>
        </div>

        {outbox.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-3 flex size-12 items-center justify-center rounded-[14px] bg-[#f5f4f2]">
              <svg viewBox="0 0 20 20" fill="none" stroke="#c4c1bb" strokeWidth="1.5" strokeLinecap="round" className="size-6">
                <rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 7l8 5 8-5"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-[#a8a29e]">No emails yet</p>
            <p className="mt-0.5 text-[11.5px] text-[#c4c1bb]">Emails will appear here when sent.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f9f8f7]">
                  {["Recipient", "Subject", "Type", "Status", "Attempts", "Sent at"].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-[#a8a29e]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {outbox.map(email => {
                  const st = STATUS_STYLE[email.status] ?? STATUS_STYLE.queued!;
                  return (
                    <tr key={email.id} className="transition-colors hover:bg-[#faf9f8]">
                      <td className="px-5 py-3.5">
                        <p className="text-[12.5px] font-semibold text-[#37352f]">{email.recipientEmail}</p>
                      </td>
                      <td className="max-w-[260px] px-5 py-3.5">
                        <p className="truncate text-[12px] text-[#5c5a55]">{email.subject}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-[#f5f4f2] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#787774]">
                          {TYPE_LABEL[email.type] ?? email.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold"
                          style={{ color: st.color, background: st.bg }}>
                          <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
                          {email.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[12px] font-semibold ${email.attemptCount > 1 ? "text-amber-600" : "text-[#a8a29e]"}`}>
                          {email.attemptCount}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[11.5px] text-[#a8a29e]">
                        {formatDateTime(email.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
