import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, workspaceMembers } from "@/lib/db/schema";
import { triggerWorkspaceInviteAcceptedNotification } from "@/lib/notifications/triggers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any;

// Looks up a user by email; if none exists yet, pre-creates a placeholder
// row so an invite's workspaceMembers.userId can be set immediately instead
// of staying null until the invitee signs up on their own. The invitee sets
// their name/password later, via /invite/[token]'s accept flow.
export async function getOrCreateInviteeUser(email: string) {
  const [existing] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return { user: existing, isNew: false as const };

  const [created] = await db
    .insert(users)
    .values({ email })
    .returning({ id: users.id, name: users.name });
  return { user: created, isNew: true as const };
}

// Marks a pending invite as accepted inside an existing transaction — shared
// by /api/invite/[token]/accept (already-signed-in user) and
// /api/invite/[token]/set-password (brand-new invitee setting a password).
export async function acceptWorkspaceInviteTx(
  tx: AnyTx,
  params: {
    memberId:     string;
    workspaceId:  string;
    userId:       string;
    invitedBy:    string | null;
    accepterName: string;
  }
) {
  const { memberId, workspaceId, userId, invitedBy, accepterName } = params;

  await tx
    .update(workspaceMembers)
    .set({
      userId,
      status:      "active",
      joinedAt:    new Date(),
      inviteToken: null,
    })
    .where(eq(workspaceMembers.id, memberId));

  if (invitedBy) {
    await triggerWorkspaceInviteAcceptedNotification(tx, {
      workspaceId,
      inviterId:    invitedBy,
      accepterId:   userId,
      memberId,
      accepterName,
    });
  }
}
