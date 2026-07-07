import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { users, workspaces } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { TemplatesPageClient } from "./templates-page-client";

type Props = { params: Promise<{ workspace: string }> };

export const metadata = { title: "Templates" };

export default async function TemplatesPage({ params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) notFound();

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  const [freshUser] = await db
    .select({ isPlatformAdmin: users.isPlatformAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <TemplatesPageClient
      workspaceId={ws.id}
      workspaceSlug={slug}
      isPlatformAdmin={Boolean(freshUser?.isPlatformAdmin)}
      currentUserId={session.user.id}
      isWorkspaceAdmin={member.role === "admin"}
    />
  );
}
