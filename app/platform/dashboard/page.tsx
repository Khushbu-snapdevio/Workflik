import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { CircleUser, LayoutGrid, Mail, Shield, User } from "lucide-react";
import { AppShell } from "@/components/scaffold/app-shell";
import { ADMIN_ROLE } from "@/config/platform";
import { emailOutbox, users } from "@/lib/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
 title: "Dashboard",
};

export default async function DashboardPage() {
 const session = await requireSession();
 const [freshUser] = await db
  .select()
  .from(users)
  .where(eq(users.id, session.user.id))
  .limit(1);

 const emails = await db
  .select()
  .from(emailOutbox)
  .orderBy(desc(emailOutbox.createdAt))
  .limit(5);

 const firstName =
  freshUser?.name?.split(" ")[0] ??
  freshUser?.email?.split("@")[0] ??
  session.user.email.split("@")[0];

 const isAdmin = freshUser?.role === ADMIN_ROLE;
 const isVerified = Boolean(freshUser?.emailVerified);

 return (
  <AppShell
   email={freshUser?.email ?? session.user.email}
   isAdmin={isAdmin}
  >
   {/* ── Page header ── */}
   <div className="mb-6">
    <div className="mb-2">
     <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.125px] text-primary">
      <LayoutGrid size={9} />
      Workspace
     </span>
    </div>
    <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
     Welcome back, {firstName}
    </h1>
    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
     Your account status and recent activity at a glance.
    </p>
   </div>

   {/* ── Status cards ── */}
   <div className="mb-5 grid gap-4 md:grid-cols-3">

    {/* Authentication */}
    <div className="rounded-[var(--radius-lg)] border border-border bg-card">
     <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
       <Shield size={12} className="text-primary" />
      </span>
      <span className="text-[13px] font-semibold text-foreground">Authentication</span>
     </div>
     <div className="space-y-3 px-5 py-4">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isVerified ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
       <span className={`size-1.5 rounded-full ${isVerified ? "bg-success" : "bg-warning"}`} />
       {isVerified ? "Verified" : "Magic-link ready"}
      </span>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
       Magic-link login is wired through Better Auth and the email outbox.
      </p>
     </div>
    </div>

    {/* Role */}
    <div className="rounded-[var(--radius-lg)] border border-border bg-card">
     <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
       <User size={12} className="text-primary" />
      </span>
      <span className="text-[13px] font-semibold text-foreground">Role</span>
     </div>
     <div className="space-y-3 px-5 py-4">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
       {freshUser?.role ?? "user"}
      </span>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
       Your current access level in this workspace.
      </p>
     </div>
    </div>

    {/* Profile */}
    <div className="rounded-[var(--radius-lg)] border border-border bg-card">
     <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
       <CircleUser size={12} className="text-primary" />
      </span>
      <span className="text-[13px] font-semibold text-foreground">Profile</span>
     </div>
     <div className="space-y-3 px-5 py-4">
      <Link
       href="/platform/dashboard/profile"
       className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-[var(--primary-hover)]"
      >
       Edit profile
      </Link>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
       Update your name, avatar, and account preferences.
      </p>
     </div>
    </div>
   </div>

   {/* ── Recent Email Outbox ── */}
   <div className="rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
     <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
      <Mail size={12} className="text-primary" />
     </span>
     <span className="text-[13px] font-semibold text-foreground">Recent Email Outbox</span>
     <span className="ml-auto text-[11px] text-muted-foreground/50">Latest transactional emails</span>
    </div>

    {/* Column headers */}
    <div className="grid grid-cols-[1fr_96px_168px] gap-4 border-b border-border/40 px-5 py-2">
     <span className="text-[10.5px] font-semibold tracking-[0.125px] text-muted-foreground/60">Subject</span>
     <span className="text-[10.5px] font-semibold tracking-[0.125px] text-muted-foreground/60">Status</span>
     <span className="text-[10.5px] font-semibold tracking-[0.125px] text-muted-foreground/60">Created</span>
    </div>

    {emails.length === 0 ? (
     <div className="flex items-center gap-4 px-5 py-8">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted/50">
       <Mail size={16} className="text-muted-foreground/30" />
      </div>
      <div>
       <p className="text-[13px] font-medium text-foreground">No emails sent yet</p>
       <p className="text-[11.5px] text-muted-foreground/60">Transactional emails will appear here.</p>
      </div>
     </div>
    ) : (
     <div className="divide-y divide-border/40">
      {emails.map((email) => (
       <div
        key={email.id}
        className="grid grid-cols-[1fr_96px_168px] items-center gap-4 px-5 py-3 transition-colors duration-150 hover:bg-accent"
       >
        <span className="truncate text-[13px] font-medium text-foreground">
         {email.subject}
        </span>
        <span>
         <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${email.status === "sent" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
          <span className={`size-1.5 rounded-full ${email.status === "sent" ? "bg-success" : "bg-warning"}`} />
          {email.status}
         </span>
        </span>
        <span className="text-[12px] text-muted-foreground">
         {formatDateTime(email.createdAt)}
        </span>
       </div>
      ))}
     </div>
    )}
   </div>
  </AppShell>
 );
}
