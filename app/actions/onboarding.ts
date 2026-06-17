"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { users, workspaceMembers, workspaces, workspaceStorageUsage } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { JOB_NAMES } from "@/lib/jobs/job-names";
import { uniqueSlug } from "@/lib/workspaces/auth";

export type InviteEntry = { email: string; role: "editor" | "viewer" };

export async function completeOnboardingAction(
  kind: "personal" | "team",
  workspaceName: string,
  invites: InviteEntry[] = [],
) {
  const session = await requireSession();
  const name = workspaceName.trim() || (kind === "team" ? "My Team" : "My Workspace");
  const slug = await uniqueSlug(name);

  const workspace = await db.transaction(async (tx) => {
    // Mark onboarding complete
    await tx
      .update(users)
      .set({ onboardingCompleted: true, onboardingStep: 3 })
      .where(eq(users.id, session.user.id));

    // Create workspace
    const [ws] = await tx
      .insert(workspaces)
      .values({ name, slug, kind, createdBy: session.user.id })
      .returning();

    await tx.insert(workspaceStorageUsage).values({ workspaceId: ws.id });

    await tx.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId:      session.user.id,
      role:        "admin",
      status:      "active",
      joinedAt:    new Date(),
    });

    return ws;
  });

  // Enqueue invite emails for valid team invites (Rule 2 — async via pg-boss)
  const validInvites = invites.filter(
    (inv) => inv.email.trim() && inv.email.includes("@"),
  );
  for (const inv of validInvites) {
    const email = inv.email.trim().toLowerCase();
    const inviteToken = crypto.randomUUID();
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId:  workspace.id,
        userId:       null,
        role:         inv.role,
        status:       "invited",
        invitedEmail: email,
        inviteToken,
        inviteExpires,
        invitedBy:    session.user.id,
      })
      .returning();

    await enqueueJob(JOB_NAMES.WORKSPACE_INVITE_SEND, {
      memberId:      member.id,
      workspaceId:   workspace.id,
      invitedEmail:  email,
      inviterName:   session.user.name ?? session.user.email,
      workspaceName: workspace.name,
      inviteToken,
    }).catch(() => {});
  }

  redirect(`/${workspace.slug}`);
}
