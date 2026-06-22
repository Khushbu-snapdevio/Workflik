import { desc, eq } from "drizzle-orm";
import {
  AccountIdentityForms,
  DeleteAccountForm,
} from "@/components/profile/account-forms";
import {
  type SessionRow,
  SessionsCard,
} from "@/components/profile/sessions-card";
import { AppShell } from "@/components/scaffold/app-shell";
import { ADMIN_ROLE } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { sessions as sessionTable, users } from "@/lib/db/schema";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const current = await requireSession();
  const [freshUser, userSessions] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, current.user.id) }),
    db
      .select({
        createdAt: sessionTable.createdAt,
        expiresAt: sessionTable.expiresAt,
        id: sessionTable.id,
        ipAddress: sessionTable.ipAddress,
        token: sessionTable.token,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, current.user.id))
      .orderBy(desc(sessionTable.createdAt)),
  ]);

  if (!freshUser) {
    return null;
  }

  const sessionRows: SessionRow[] = userSessions.map((session) => ({
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    id: session.id,
    ipAddress: session.ipAddress,
    isCurrent: session.token === current.session.token,
    userAgent: session.userAgent,
  }));

  return (
    <AppShell email={freshUser.email} isAdmin={freshUser.role === ADMIN_ROLE}>

      {/* ── Page header ── */}
      <div className="mb-6">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          <svg className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 12 12">
            <circle cx="6" cy="4" r="2.5"/>
            <path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5"/>
          </svg>
          Account
        </span>
        <h1 className="text-[22px] font-black leading-tight tracking-tight text-foreground">
          Profile Settings
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Manage identity, sessions, account exports, and account deletion.
        </p>
      </div>

      <div className="space-y-4">
        <AccountIdentityForms
          email={freshUser.email}
          name={freshUser.name ?? ""}
        />

        <SessionsCard sessions={sessionRows} />

        {/* Export Your Data */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/60 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 ring-1 ring-primary/20">
                <svg className="size-3 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </span>
              <span className="text-[13px] font-semibold text-foreground">Export Your Data</span>
            </div>
            <p className="mt-1.5 pl-[34px] text-[12px] leading-relaxed text-muted-foreground">
              Download a JSON archive of your profile, linked auth accounts, and sessions.
            </p>
          </div>
          <div className="px-5 py-4">
            <a
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-4 text-[12.5px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/[0.025] hover:text-primary active:scale-[0.97]"
              download
              href="/api/account/export"
            >
              <svg className="size-3.5 text-primary/60" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download JSON export
            </a>
          </div>
        </div>

        <DeleteAccountForm email={freshUser.email} />
      </div>
    </AppShell>
  );
}
