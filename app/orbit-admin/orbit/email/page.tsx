import { Fragment } from "react";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";
import { EmailRetryButton } from "@/components/orbit/email-retry-button";

export const metadata = { title: "Email – Orbit Admin" };

const STATUS_CLS: Record<string, { pill: string; dot: string }> = {
 sent:    { pill: "bg-success/10 text-success",           dot: "bg-success" },
 queued:  { pill: "bg-primary/10 text-primary",           dot: "bg-primary" },
 sending: { pill: "bg-primary/10 text-primary",           dot: "bg-primary/60" },
 failed:  { pill: "bg-destructive/5 text-destructive", dot: "bg-destructive" },
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
   <div className="flex items-start justify-between gap-4">
    <div>
     <h1 className="text-xl font-bold tracking-tight text-foreground">Email</h1>
     <p className="mt-1 text-sm text-muted-foreground">Transactional outbox — delivery status and retry tracking.</p>
    </div>
    <div className="hidden shrink-0 items-center gap-2 sm:flex">
     {statusCounts.map(s => {
      const cls = STATUS_CLS[s.status] ?? STATUS_CLS.queued!;
      return (
       <span key={s.status} className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground`}>
        <span className={`size-1.5 rounded-full ${cls.dot}`} />
        <strong className="font-bold text-foreground">{s.cnt}</strong> {s.status}
       </span>
      );
     })}
    </div>
   </div>

   {/* Table */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-3.5">
     <div>
      <h2 className="text-sm font-semibold text-foreground">Outbox</h2>
      <p className="text-xs text-muted-foreground">Latest {total} transactional emails</p>
     </div>
     <span className="rounded-[var(--radius-xs)] bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{total} shown</span>
    </div>

    {outbox.length === 0 ? (
     <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-3 flex size-12 items-center justify-center rounded-[var(--radius-xl)] bg-muted/50">
       <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-6 text-muted-foreground/50">
        <rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 7l8 5 8-5"/>
       </svg>
      </div>
      <p className="text-sm font-semibold text-muted-foreground">No emails yet</p>
      <p className="mt-0.5 text-xs text-muted-foreground/60">Emails will appear here when sent.</p>
     </div>
    ) : (
     <div>
      <table className="w-full">
       <thead>
        <tr className="bg-muted/40">
         {["Recipient", "Subject", "Type", "Status", "Time"].map(h => (
          <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {outbox.map(email => {
         const cls = STATUS_CLS[email.status] ?? STATUS_CLS.queued!;
         // There's no dedicated "sent at" column in the schema — updatedAt is
         // bumped on every status transition, so for a "sent" row it *is* the
         // send time. For anything still in flight or failed, show when it
         // was queued instead, labeled accordingly so it's never misleading.
         const isSent = email.status === "sent";
         return (
          <tr key={email.id} className="transition-colors hover:bg-accent">
           <td className="px-5 py-3.5">
            <p className="truncate text-xs font-semibold text-foreground">{email.recipientEmail}</p>
           </td>
           <td className="max-w-[220px] px-5 py-3.5">
            <p className="truncate text-xs text-foreground/70">{email.subject}</p>
           </td>
           <td className="px-5 py-3.5">
            <span className="whitespace-nowrap rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
             {TYPE_LABEL[email.type] ?? email.type}
            </span>
           </td>
           <td className="max-w-[220px] px-5 py-3.5">
            <div className="flex items-center gap-2">
             <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls.pill}`}>
              <span className={`size-1.5 rounded-full ${cls.dot}`} />
              {email.status}
             </span>
             {email.attemptCount > 1 && (
              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{email.attemptCount} attempts</span>
             )}
            </div>
            {email.status === "failed" && (
             <div className="mt-2 rounded-[var(--radius-sm)] border border-destructive/20 bg-destructive/5 px-2.5 py-2">
              {email.lastError && (
               <p className="break-words text-[10px] leading-relaxed text-destructive">
                {email.lastError}
               </p>
              )}
              <div className={email.lastError ? "mt-2" : undefined}>
               <EmailRetryButton id={email.id} />
              </div>
             </div>
            )}
           </td>
           <td className="whitespace-nowrap px-5 py-3.5 text-xs text-muted-foreground">
            <p>{formatDateTime(isSent ? email.updatedAt : email.createdAt)}</p>
            <p className="text-[10px] text-muted-foreground/60">{isSent ? "Sent" : "Queued"}</p>
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
