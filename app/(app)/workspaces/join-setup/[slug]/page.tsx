import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { JoinSetup } from "@/components/workspace/join-setup";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";

type Props = { params: Promise<{ slug: string }> };

export default async function JoinSetupPage({ params }: Props) {
  const session = await requireSession();
  const { slug } = await params;

  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaces.slug, slug),
        eq(workspaceMembers.userId, session.user.id),
        eq(workspaceMembers.status, "active")
      )
    )
    .limit(1);

  if (!ws) notFound();

  return <JoinSetup workspaceName={ws.name} workspaceSlug={ws.slug} />;
}
