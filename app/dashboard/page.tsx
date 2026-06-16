import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { AppShell } from "@/components/scaffold/app-shell";
import { ADMIN_ROLE, PRODUCT_NAME } from "@/config/platform";
import { emailOutbox, users } from "@/lib/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

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
    .limit(10);

  const isAdmin = freshUser?.role === ADMIN_ROLE;
  const email = freshUser?.email ?? session.user.email;
  const displayName = freshUser?.name ?? email;
  const avatarLetter = email[0].toUpperCase();
  const roleName = freshUser?.role ?? "user";
  const joinedDate = freshUser?.createdAt
    ? new Date(freshUser.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  return (
    <AppShell email={email} isAdmin={isAdmin}>
      <div className="space-y-5">

        {/* ── Profile hero card ───────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div
            className="h-24 w-full"
            style={{ background: "linear-gradient(135deg, #5B3FD6 0%, #7C5CE8 55%, #A78BFA 100%)" }}
          />
          <div className="px-6 pb-6">
            <div className="-mt-8 mb-4 flex items-end justify-between">
              <div className="flex size-16 items-center justify-center rounded-2xl border-4 border-card bg-primary text-xl font-black text-primary-foreground shadow-md">
                {avatarLetter}
              </div>
              <div className="mb-1 flex items-center gap-2">
                <Link
                  className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href="/dashboard/profile"
                >
                  Edit profile
                </Link>
                <Link
                  className="inline-flex h-8 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[var(--primary-hover)]"
                  href="/post-auth"
                >
                  Open workspace
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-black text-foreground">{displayName}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                  isAdmin ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {roleName}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>

            <div className="mt-4 flex flex-wrap gap-5">
              <div className="flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded-md bg-secondary">
                  <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span className="text-xs text-muted-foreground">
                  {freshUser?.emailVerified ? "Email verified" : "Email unverified"}
                </span>
              </div>
              {joinedDate && (
                <div className="flex items-center gap-1.5">
                  <span className="flex size-5 items-center justify-center rounded-md bg-blue-50">
                    <svg className="size-3 text-blue-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24">
                      <rect height="18" rx="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                  </span>
                  <span className="text-xs text-muted-foreground">Joined {joinedDate}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded-md bg-orange-50">
                  <svg className="size-3 text-orange-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <span className="text-xs text-muted-foreground">{PRODUCT_NAME} member</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom 2-col grid ───────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Email outbox — 2/3 width */}
          <div className="rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-secondary">
                  <svg className="size-3.5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Email Outbox</p>
                  <p className="text-xs text-muted-foreground">Recent transactional emails</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {emails.length}
              </span>
            </div>

            {emails.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <svg className="size-5 text-muted-foreground/40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-muted-foreground">No emails yet</p>
                <p className="text-xs text-muted-foreground/60">System emails will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-[1fr_100px_140px] gap-4 px-5 py-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-ui text-muted-foreground">Subject</span>
                  <span className="text-[11px] font-semibold uppercase tracking-ui text-muted-foreground">Status</span>
                  <span className="text-[11px] font-semibold uppercase tracking-ui text-muted-foreground">Sent</span>
                </div>
                {emails.map((e) => (
                  <div key={e.id} className="grid grid-cols-[1fr_100px_140px] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40">
                    <span className="truncate text-sm font-medium text-foreground">{e.subject}</span>
                    <span>
                      {e.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FAF4] px-2 py-0.5 text-[11px] font-semibold text-[#1A3D2B]">
                          <svg className="size-2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                          sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          {e.status}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel — 1/3 width */}
          <div className="flex flex-col gap-4">

            {/* Quick navigation */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-ui text-muted-foreground">Quick navigation</p>
              <div className="flex flex-col gap-0.5">
                <Link
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                  href="/post-auth"
                >
                  <svg className="size-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                    <rect height="7" rx="1" width="7" x="3" y="3" /><rect height="7" rx="1" width="7" x="14" y="3" /><rect height="7" rx="1" width="7" x="3" y="14" /><rect height="7" rx="1" width="7" x="14" y="14" />
                  </svg>
                  Go to workspace
                </Link>
                <Link
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                  href="/dashboard/profile"
                >
                  <svg className="size-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  Edit profile
                </Link>
                {isAdmin && (
                  <Link
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                    href="/orbit"
                  >
                    <svg className="size-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Admin panel
                  </Link>
                )}
              </div>
            </div>

            {/* Account details */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-ui text-muted-foreground">Account details</p>
              <div className="space-y-3.5">
                <div>
                  <p className="mb-0.5 text-[11px] text-muted-foreground">Email address</p>
                  <p className="truncate text-xs font-medium text-foreground">{email}</p>
                </div>
                <div className="border-t border-border" />
                <div>
                  <p className="mb-0.5 text-[11px] text-muted-foreground">Role</p>
                  <p className="text-xs font-medium capitalize text-foreground">{roleName}</p>
                </div>
                <div className="border-t border-border" />
                <div>
                  <p className="mb-0.5 text-[11px] text-muted-foreground">Verification</p>
                  <p className="text-xs font-medium text-foreground">
                    {freshUser?.emailVerified ? "Verified" : "Pending"}
                  </p>
                </div>
                {joinedDate && (
                  <>
                    <div className="border-t border-border" />
                    <div>
                      <p className="mb-0.5 text-[11px] text-muted-foreground">Member since</p>
                      <p className="text-xs font-medium text-foreground">{joinedDate}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
