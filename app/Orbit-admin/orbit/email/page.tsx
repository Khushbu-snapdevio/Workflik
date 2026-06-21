import { Fragment } from "react";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Email – Orbit Admin" };

const STATUS_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  sent:    { color: "#059669", bg: "#f0fdf4", dot: "#059669" },
  queued:  { color: "#0284C7", bg: "#eff6ff", dot: "#0284C7" },
  sending: { color: "#0369a1", bg: "#e0f2fe", dot: "#0369a1" },
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
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <div className="h-[3px] bg-gradient-to-r from-primary to-sky-400/50" />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-foreground">Email</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Transactional outbox — delivery status and retry tracking.</p>
          </div>
          <div className="hidden shrink-0 items-center overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-muted/30 sm:flex">
            {statusCounts.map((s, i) => {
              const st = STATUS_STYLE[s.status]!;
              return (
                <Fragment key={s.status}>
                  {i > 0 && <div className="h-8 w-px bg-border/60" />}
                  <div className="px-6 py-4 text-center">
                    <p className="text-[26px] font-black leading-none text-foreground">{s.cnt}</p>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
                      <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/60">{s.status}</p>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div>
            <h2 className="text-[13.5px] font-bold text-foreground">Outbox</h2>
            <p className="text-[11px] text-muted-foreground">Latest {total} of all transactional emails</p>
          </div>
          <span className="rounded-full bg-muted/50 px-3 py-1 text-[11px] font-semibold text-muted-foreground">{total} shown</span>
        </div>

        {outbox.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-3 flex size-12 items-center justify-center rounded-[var(--radius-xl)] bg-muted/50">
              <svg viewBox="0 0 20 20" fill="none" stroke="#c4c1bb" strokeWidth="1.5" strokeLinecap="round" className="size-6">
                <rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 7l8 5 8-5"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-muted-foreground">No emails yet</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground/60">Emails will appear here when sent.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40">
                  {["Recipient", "Subject", "Type", "Status", "Attempts", "Sent at"].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {outbox.map(email => {
                  const st = STATUS_STYLE[email.status] ?? STATUS_STYLE.queued!;
                  return (
                    <tr key={email.id} className="transition-colors hover:bg-accent/40">
                      <td className="px-5 py-3.5">
                        <p className="text-[12.5px] font-semibold text-foreground">{email.recipientEmail}</p>
                      </td>
                      <td className="max-w-[260px] px-5 py-3.5">
                        <p className="truncate text-[12px] text-foreground/70">{email.subject}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-muted/50 px-2.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
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
                        <span className={`text-[12px] font-semibold ${email.attemptCount > 1 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {email.attemptCount}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[11.5px] text-muted-foreground">
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
