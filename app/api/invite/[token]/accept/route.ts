import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { apiError, ApiError, getSession } from "@/lib/workspaces/auth";
import { acceptWorkspaceInviteTx } from "@/lib/workspaces/invites";
import { writeAuditLog } from "@/lib/orbit/audit";

type Ctx = { params: Promise<{ token: string }> };

// POST /api/invite/:token/accept
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const session   = await getSession();

    const [member] = await db
      .select({
        id:           workspaceMembers.id,
        workspaceId:  workspaceMembers.workspaceId,
        status:       workspaceMembers.status,
        invitedEmail: workspaceMembers.invitedEmail,
        inviteExpires:workspaceMembers.inviteExpires,
        invitedBy:    workspaceMembers.invitedBy,
        workspaceSlug: workspaces.slug,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.inviteToken, token))
      .limit(1);

    if (!member) return apiError(404, "Invite not found");
    if (member.status !== "invited") return apiError(409, "Invite already used or expired");
    if (member.inviteExpires && member.inviteExpires < new Date()) {
      await db
        .update(workspaceMembers)
        .set({ status: "expired" })
        .where(eq(workspaceMembers.id, member.id));
      return apiError(410, "Invite has expired");
    }
    if (member.invitedEmail && member.invitedEmail !== session.user.email) {
      return apiError(403, "This invite was sent to a different email address");
    }

    // Check not already active member
    const [alreadyMember] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, member.workspaceId),
          eq(workspaceMembers.userId, session.user.id),
          eq(workspaceMembers.status, "active")
        )
      )
      .limit(1);

    if (alreadyMember) {
      return Response.json({ workspaceSlug: member.workspaceSlug });
    }

    await db.transaction(async (tx) => {
      await acceptWorkspaceInviteTx(tx, {
        memberId:     member.id,
        workspaceId:  member.workspaceId,
        userId:       session.user.id,
        invitedBy:    member.invitedBy,
        accepterName: session.user.name ?? session.user.email,
      });
    });

    await writeAuditLog({
      actorId:    session.user.id,
      action:     "member.joined",
      targetType: "workspace",
      targetId:   member.workspaceId,
      metadata:   { email: session.user.email, invitedEmail: member.invitedEmail },
    });

    return Response.json({ workspaceSlug: member.workspaceSlug });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}
