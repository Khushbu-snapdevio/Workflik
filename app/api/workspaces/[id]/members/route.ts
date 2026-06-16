import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, workspaceMembers } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { JOB_NAMES } from "@/lib/jobs/job-names";
import {
  apiError,
  ApiError,
  getSession,
  getWorkspace,
  requireWorkspaceMember,
} from "@/lib/workspaces/auth";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/workspaces/:id/members — list all members (active + invited)
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSession();
    await requireWorkspaceMember(id, session.user.id);

    const members = await db
      .select({
        id:           workspaceMembers.id,
        workspaceId:  workspaceMembers.workspaceId,
        userId:       workspaceMembers.userId,
        role:         workspaceMembers.role,
        status:       workspaceMembers.status,
        invitedEmail: workspaceMembers.invitedEmail,
        inviteExpires:workspaceMembers.inviteExpires,
        joinedAt:     workspaceMembers.joinedAt,
        createdAt:    workspaceMembers.createdAt,
        userName:     users.name,
        userEmail:    users.email,
        userImage:    users.image,
      })
      .from(workspaceMembers)
      .leftJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, id));

    return Response.json(members);
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}

const inviteSchema = z.object({
  email: z.email(),
  role:  z.enum(["editor", "viewer"]).default("editor"),
});

// POST /api/workspaces/:id/members — invite a user by email
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSession();
    const inviter = await requireWorkspaceMember(id, session.user.id, "admin");

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { email, role } = parsed.data;
    const workspace = await getWorkspace(id);

    // Check if already a member (active)
    const [existingUser] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      const [activeMember] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.userId, existingUser.id),
            eq(workspaceMembers.status, "active")
          )
        )
        .limit(1);
      if (activeMember) {
        return apiError(409, "User is already a member of this workspace");
      }
    }

    // Check for existing pending invite to same email
    const [pendingInvite] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.invitedEmail, email),
          eq(workspaceMembers.status, "invited")
        )
      )
      .limit(1);
    if (pendingInvite) {
      return apiError(409, "An invite has already been sent to this email");
    }

    const inviteToken   = crypto.randomUUID();
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId:  id,
        userId:       existingUser?.id ?? null,
        role,
        status:       "invited",
        invitedEmail: email,
        inviteToken,
        inviteExpires,
        invitedBy:    session.user.id,
      })
      .returning();

    // Enqueue invite email (Rule 2: async work via pg-boss, never inline)
    await enqueueJob(JOB_NAMES.WORKSPACE_INVITE_SEND, {
      memberId:      member.id,
      workspaceId:   id,
      invitedEmail:  email,
      inviterName:   session.user.name ?? session.user.email,
      workspaceName: workspace.name,
      inviteToken,
    });

    return Response.json(member, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}
