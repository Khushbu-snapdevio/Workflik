import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import {
  apiError,
  ApiError,
  getSession,
  requireWorkspaceMember,
} from "@/lib/workspaces/auth";
import { writeAuditLog } from "@/lib/orbit/audit";

type Ctx = { params: Promise<{ id: string; userId: string }> };

const patchSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

// PATCH /api/workspaces/:id/members/:userId — change role (Admin cannot be changed via this endpoint)
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id, userId } = await params;
    const session = await getSession();
    await requireWorkspaceMember(id, session.user.id, "admin");

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    // Cannot change role of the current Admin via this endpoint (only via transfer)
    const [target] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.status, "active")
        )
      )
      .limit(1);

    if (!target) return apiError(404, "Member not found");
    if (target.role === "admin") {
      return apiError(403, "Admin role can only be changed via Transfer Ownership");
    }

    const [updated] = await db
      .update(workspaceMembers)
      .set({ role: parsed.data.role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId)
        )
      )
      .returning();

    await writeAuditLog({
      actorId:    session.user.id,
      action:     "member.role_changed",
      targetType: "workspace",
      targetId:   id,
      metadata:   { targetUserId: userId, previousRole: target.role, newRole: parsed.data.role },
    });

    return Response.json(updated);
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}

// DELETE /api/workspaces/:id/members/:userId — remove a member
// Business rule: regenerate invite_link_token in same transaction as the delete
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id, userId } = await params;
    const session = await getSession();
    await requireWorkspaceMember(id, session.user.id, "admin");

    // Cannot remove the Admin (only via Transfer Ownership)
    const [target] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.status, "active")
        )
      )
      .limit(1);

    if (!target) return apiError(404, "Member not found");
    if (target.role === "admin") {
      return apiError(403, "Cannot remove the workspace Admin — transfer ownership first");
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.userId, userId)
          )
        );

      // Regenerate invite link token so removed user cannot silently rejoin
      await tx
        .update(workspaces)
        .set({ inviteLinkToken: crypto.randomUUID(), updatedAt: new Date() })
        .where(eq(workspaces.id, id));
    });

    await writeAuditLog({
      actorId:    session.user.id,
      action:     "member.removed",
      targetType: "workspace",
      targetId:   id,
      metadata:   { targetUserId: userId, previousRole: target.role },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}
