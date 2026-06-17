import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { userPreferences, users, workspaces } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { ADMIN_ROLE } from "@/config/platform";

type Props = {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
};

export default async function WorkspaceLayout({ children, params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) {
    notFound();
  }

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) {
    redirect("/auth/login");
  }

  const [freshUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Track last active workspace for post-login redirect (fire-and-forget upsert)
  db.insert(userPreferences)
    .values({ userId: session.user.id, lastWorkspaceId: ws.id })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { lastWorkspaceId: ws.id, updatedAt: new Date() },
    })
    .catch(() => {});

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar
        isAdmin={freshUser?.role === ADMIN_ROLE}
        userEmail={session.user.email}
        workspaceId={ws.id}
        workspaceSlug={ws.slug}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
