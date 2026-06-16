import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import {
  apiError,
  ApiError,
  getSession,
  requireWorkspaceMember,
} from "@/lib/workspaces/auth";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/workspaces/:id/invite-link — generate (or regenerate) the invite link
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSession();
    await requireWorkspaceMember(id, session.user.id, "admin");

    const [updated] = await db
      .update(workspaces)
      .set({
        inviteLinkToken:  crypto.randomUUID(),
        inviteLinkActive: true,
        updatedAt:        new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning({
        inviteLinkToken:  workspaces.inviteLinkToken,
        inviteLinkActive: workspaces.inviteLinkActive,
        inviteLinkRole:   workspaces.inviteLinkRole,
      });

    return Response.json(updated);
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}

// DELETE /api/workspaces/:id/invite-link — disable the invite link
// Old token is replaced so the previous URL is permanently dead
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSession();
    await requireWorkspaceMember(id, session.user.id, "admin");

    await db
      .update(workspaces)
      .set({
        inviteLinkToken:  crypto.randomUUID(),
        inviteLinkActive: false,
        updatedAt:        new Date(),
      })
      .where(eq(workspaces.id, id));

    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}
