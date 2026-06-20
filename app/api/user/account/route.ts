import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, workspaceMembers } from "@/lib/db/schema";
import { apiError, ApiError, getSession } from "@/lib/workspaces/auth";

const deleteSchema = z.object({ email: z.string().email() });

// DELETE /api/user/account
// Blocked if the user is the sole Admin of any workspace.
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const body    = await req.json();
    const parsed  = deleteSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid input");

    if (parsed.data.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return apiError(400, "Email does not match your account email");
    }

    // Block deletion if user is sole admin of any workspace
    const adminMemberships = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, session.user.id),
          eq(workspaceMembers.role, "admin"),
          eq(workspaceMembers.status, "active"),
        )
      );

    for (const m of adminMemberships) {
      const otherAdmins = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, m.workspaceId),
            eq(workspaceMembers.role, "admin"),
            eq(workspaceMembers.status, "active"),
            ne(workspaceMembers.userId, session.user.id),
          )
        )
        .limit(1);

      if (otherAdmins.length === 0) {
        return apiError(409, "You are the sole Admin of one or more workspaces. Transfer ownership before deleting your account.");
      }
    }

    await db.delete(users).where(eq(users.id, session.user.id));

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}
