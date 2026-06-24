import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { users, workspaces } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsUserProvider } from "@/components/settings/settings-user-context";

type Props = { children: ReactNode; params: Promise<{ workspace: string }> };

export default async function SettingsLayout({ children, params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [[ws], [currentUser]] = await Promise.all([
    db.select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug, icon: workspaces.icon })
      .from(workspaces).where(eq(workspaces.slug, slug)).limit(1),
    db.select({ name: users.name, email: users.email, image: users.image })
      .from(users).where(eq(users.id, session.user.id)).limit(1),
  ]);

  if (!ws) notFound();

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  const userEmail = currentUser?.email ?? session.user.email;
  const userName  = currentUser?.name ?? null;
  const userImage = currentUser?.image ?? null;

  return (
    <SettingsUserProvider initial={{ name: userName, email: userEmail, image: userImage }}>
      <div className="flex h-full overflow-hidden">
        <SettingsNav
          workspaceSlug={ws.slug}
          workspaceName={ws.name}
          workspaceIcon={ws.icon}
          isAdmin={member.role === "admin"}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={<SettingsPageSkeleton />}>
              {children}
            </Suspense>
          </div>
        </div>
      </div>
    </SettingsUserProvider>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="mx-auto max-w-[640px] animate-pulse px-10 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="size-12 shrink-0 rounded-[var(--radius-md)] bg-muted" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 rounded-[var(--radius-sm)] bg-muted" />
          <div className="h-3.5 w-56 rounded-[var(--radius-sm)] bg-muted/60" />
        </div>
      </div>
      {/* Card 1 */}
      <div className="mb-5 rounded-[var(--radius-lg)] border border-border/60 bg-card p-5">
        <div className="mb-4 h-3 w-24 rounded bg-muted/60" />
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-muted" />
          <div className="flex flex-col gap-2.5">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-48 rounded bg-muted/60" />
          </div>
        </div>
      </div>
      {/* Card 2 */}
      <div className="mb-5 rounded-[var(--radius-lg)] border border-border/60 bg-card p-5">
        <div className="mb-4 h-3 w-20 rounded bg-muted/60" />
        <div className="space-y-3">
          <div className="h-9 w-full rounded-[var(--radius-sm)] bg-muted" />
          <div className="h-9 w-full rounded-[var(--radius-sm)] bg-muted" />
        </div>
      </div>
      {/* Card 3 */}
      <div className="rounded-[var(--radius-lg)] border border-border/60 bg-card p-5">
        <div className="mb-4 h-3 w-28 rounded bg-muted/60" />
        <div className="space-y-3">
          <div className="h-9 w-full rounded-[var(--radius-sm)] bg-muted" />
          <div className="h-9 w-3/4 rounded-[var(--radius-sm)] bg-muted" />
        </div>
      </div>
    </div>
  );
}
