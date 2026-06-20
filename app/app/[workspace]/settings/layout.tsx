import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { users, workspaces } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { SettingsShell } from "@/components/settings/settings-shell";
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
    <SettingsShell>
      <SettingsUserProvider initial={{ name: userName, email: userEmail, image: userImage }}>
        <SettingsNav
          workspaceSlug={ws.slug}
          workspaceName={ws.name}
          workspaceIcon={ws.icon}
          isAdmin={member.role === "admin"}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </SettingsUserProvider>
    </SettingsShell>
  );
}
