import { desc, eq } from "drizzle-orm";
import Link from "next/link";
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
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          <svg className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 12 12">
            <rect x="1.5" y="1.5" width="3.5" height="3.5" rx="0.75"/>
            <rect x="7" y="1.5" width="3.5" height="3.5" rx="0.75"/>
            <rect x="1.5" y="7" width="3.5" height="3.5" rx="0.75"/>
            <rect x="7" y="7" width="3.5" height="3.5" rx="0.75"/>
          </svg>
          Workspace
        </span>
        <h1 className="text-[22px] font-black leading-tight tracking-tight text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Your account status and recent activity at a glance.
        </p>
      </div>

      {/* ── Status cards ── */}
      <div className="mb-5 grid gap-4 md:grid-cols-3">

        {/* Authentication */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
              <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
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
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
              <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
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
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
              <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4"/>
                <path d="M6 20v-2a6 6 0 0112 0v2"/>
              </svg>
            </span>
            <span className="text-[13px] font-semibold text-foreground">Profile</span>
          </div>
          <div className="space-y-3 px-5 py-4">
            <Link
              href="/platform/dashboard/profile"
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:bg-[var(--primary-hover)] active:scale-[0.97]"
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
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
            <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </span>
          <span className="text-[13px] font-semibold text-foreground">Recent Email Outbox</span>
          <span className="ml-auto text-[11px] text-muted-foreground/50">Latest transactional emails</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_96px_168px] gap-4 border-b border-border/40 px-5 py-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Subject</span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Status</span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Created</span>
        </div>

        {emails.length === 0 ? (
          <div className="flex items-center gap-4 px-5 py-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted/50">
              <svg className="size-4 text-muted-foreground/30" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
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
                className="grid grid-cols-[1fr_96px_168px] items-center gap-4 px-5 py-3 transition-colors hover:bg-primary/[0.025]"
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
