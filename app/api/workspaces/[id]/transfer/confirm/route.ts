import { and, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifications, workspaceMembers } from "@/lib/db/schema";
import { apiError, ApiError } from "@/lib/workspaces/auth";
import { writeAuditLog } from "@/lib/orbit/audit";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/workspaces/:id/transfer/confirm?token=xxx
// Validates token and atomically completes ownership transfer
export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id }   = await params;
    const token    = new URL(req.url).searchParams.get("token");
    if (!token) return apiError(400, "Missing token");

    const identifier = `workspace-transfer:${id}:`;

    // Find the verification row — identifier prefix encodes workspaceId + targetUserId
    const allVerifications = await db
      .select()
      .from(verifications)
      .where(
        and(
          gt(verifications.expiresAt, new Date()),
          eq(verifications.value, token)
        )
      )
      .limit(1);

    const verification = allVerifications.find((v) =>
      v.identifier.startsWith(identifier)
    );

    if (!verification) return apiError(410, "Transfer link has expired or is invalid");

    const targetUserId = verification.identifier.split(":")[2];
    if (!targetUserId) return apiError(400, "Malformed transfer token");

    // Capture current admin before demoting
    const [currentAdmin] = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.role, "admin"),
          eq(workspaceMembers.status, "active")
        )
      )
      .limit(1);

    await db.transaction(async (tx) => {
      // Demote current admin → editor
      await tx
        .update(workspaceMembers)
        .set({ role: "editor" })
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.role, "admin"),
            eq(workspaceMembers.status, "active")
          )
        );

      // Promote target → admin
      await tx
        .update(workspaceMembers)
        .set({ role: "admin" })
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.userId, targetUserId),
            eq(workspaceMembers.status, "active")
          )
        );

      // Consume the token
      await tx
        .delete(verifications)
        .where(eq(verifications.id, verification.id));
    });

    if (currentAdmin?.userId) {
      await writeAuditLog({
        actorId:    currentAdmin.userId,
        action:     "workspace.ownership_transferred",
        targetType: "workspace",
        targetId:   id,
        metadata:   { fromUserId: currentAdmin.userId, toUserId: targetUserId },
      });
    }

    redirect(`/platform/dashboard?transfer=success`);
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}
