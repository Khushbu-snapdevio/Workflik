import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces, workspaceStorageUsage } from "@/lib/db/schema";
import { WorkspaceGeneralSection } from "@/components/settings/workspace-general-section";

export const metadata: Metadata = { title: "General — Settings" };

type Props = { params: Promise<{ workspace: string }> };

export default async function GeneralSettingsPage({ params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) notFound();

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, ws.id),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!member || member.role !== "admin") notFound();

  const [usage] = await db
    .select({ bytesUsed: workspaceStorageUsage.bytesUsed })
    .from(workspaceStorageUsage)
    .where(eq(workspaceStorageUsage.workspaceId, ws.id))
    .limit(1);

  const memberCount = await db.$count(
    workspaceMembers,
    eq(workspaceMembers.workspaceId, ws.id),
  );

  return (
    <WorkspaceGeneralSection
      workspace={{
        id:               ws.id,
        name:             ws.name,
        slug:             ws.slug,
        icon:             ws.icon,
        defaultPageAccess: ws.defaultPageAccess,
        inviteLinkToken:  ws.inviteLinkToken,
        inviteLinkActive: ws.inviteLinkActive,
        inviteLinkRole:   ws.inviteLinkRole,
      }}
      bytesUsed={Number(usage?.bytesUsed ?? 0)}
      memberCount={memberCount}
    />
  );
}
