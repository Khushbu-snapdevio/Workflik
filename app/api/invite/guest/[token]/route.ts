import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestInvitations, pagePermissions, pages } from "@/lib/db/schema";
import { ApiError, apiError, getSession } from "@/lib/workspaces/auth";

type Ctx = { params: Promise<{ token: string }> };

// GET /api/invite/guest/[token] — validate token and return page info
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { token } = await params;

    const [inv] = await db
      .select({
        id:          guestInvitations.id,
        email:       guestInvitations.email,
        accessLevel: guestInvitations.accessLevel,
        expiresAt:   guestInvitations.expiresAt,
        acceptedAt:  guestInvitations.acceptedAt,
        pageId:      guestInvitations.pageId,
        pageTitle:   pages.title,
        pageIcon:    pages.icon,
      })
      .from(guestInvitations)
      .innerJoin(pages, eq(pages.id, guestInvitations.pageId))
      .where(eq(guestInvitations.token, token))
      .limit(1);

    if (!inv)                        return apiError(404, "Invitation not found");
    if (inv.expiresAt < new Date())  return apiError(410, "Invitation has expired");
    if (inv.acceptedAt)              return apiError(409, "Invitation already accepted");

    return Response.json({
      invitation: {
        id:          inv.id,
        email:       inv.email,
        accessLevel: inv.accessLevel,
        expiresAt:   inv.expiresAt,
        page:        { id: inv.pageId, title: inv.pageTitle, icon: inv.pageIcon },
      },
    });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}

// POST /api/invite/guest/[token]/accept — accept invitation
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const session   = await getSession();

    const [inv] = await db
      .select()
      .from(guestInvitations)
      .where(eq(guestInvitations.token, token))
      .limit(1);

    if (!inv)                        return apiError(404, "Invitation not found");
    if (inv.expiresAt < new Date())  return apiError(410, "Invitation has expired");
    if (inv.acceptedAt)              return apiError(409, "Invitation already accepted");

    // Verify session email matches the invitation
    if (session.user.email?.toLowerCase() !== inv.email) {
      return apiError(403, "This invitation was sent to a different email address");
    }

    await db.transaction(async (tx) => {
      // Mark accepted
      await tx
        .update(guestInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(guestInvitations.token, token));

      // Create page_permissions row
      await tx
        .insert(pagePermissions)
        .values({
          pageId:      inv.pageId,
          userId:      session.user.id,
          guestEmail:  inv.email,
          accessLevel: inv.accessLevel,
          grantedBy:   inv.invitedBy ?? session.user.id,
        })
        .onConflictDoUpdate({
          target: [pagePermissions.pageId, pagePermissions.userId],
          set:    { accessLevel: inv.accessLevel, updatedAt: new Date() },
        });
    });

    const [page] = await db
      .select({ shortId: pages.shortId, workspaceId: pages.workspaceId })
      .from(pages)
      .where(eq(pages.id, inv.pageId))
      .limit(1);

    return Response.json({ ok: true, pageId: inv.pageId, shortId: page?.shortId });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error(err);
    return apiError(500, "Internal server error");
  }
}
