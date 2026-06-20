"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { pages, users, workspaceMembers, workspaces, workspaceStorageUsage } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { JOB_NAMES } from "@/lib/jobs/job-names";
import { uniqueSlug } from "@/lib/workspaces/auth";
import { createId } from "@paralleldrive/cuid2";

export type InviteEntry = { email: string; role: "editor" | "viewer" };

interface OnboardingData {
  kind:          "personal" | "team";
  workspaceName: string;
  invites:       InviteEntry[];
  displayName:   string;
  jobTitle:      string;
  timezone:      string;
  templateKey:   string;
}

// Pages created for each template key (title + icon pairs)
const TEMPLATE_PAGES: Record<string, Array<{ title: string; icon: string }>> = {
  "getting-started":  [{ title: "Getting Started",  icon: "👋" }],
  "project-tracker":  [{ title: "Project Overview", icon: "📋" }, { title: "My Tasks", icon: "✅" }],
  "meeting-notes":    [{ title: "Meeting Notes",    icon: "📝" }],
  "personal-journal": [{ title: "My Journal",       icon: "📓" }],
};

export async function completeOnboardingAction(data: OnboardingData) {
  const session = await requireSession();
  const name = data.workspaceName.trim() || (data.kind === "team" ? "My Team" : "My Workspace");
  const slug = await uniqueSlug(name);

  const workspace = await db.transaction(async (tx) => {
    // Update user profile
    const profileUpdate: Partial<typeof users.$inferInsert> = {
      onboardingCompleted: true,
      onboardingStep:      4,
    };
    if (data.displayName) profileUpdate.name     = data.displayName;
    if (data.jobTitle)    profileUpdate.jobTitle  = data.jobTitle;
    if (data.timezone)    profileUpdate.timezone  = data.timezone;

    await tx.update(users).set(profileUpdate).where(eq(users.id, session.user.id));

    // Create workspace
    const [ws] = await tx
      .insert(workspaces)
      .values({ name, slug, kind: data.kind, createdBy: session.user.id })
      .returning();

    await tx.insert(workspaceStorageUsage).values({ workspaceId: ws.id });

    await tx.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId:      session.user.id,
      role:        "admin",
      status:      "active",
      joinedAt:    new Date(),
    });

    // Create template pages
    const templateDef = TEMPLATE_PAGES[data.templateKey];
    if (templateDef) {
      for (let i = 0; i < templateDef.length; i++) {
        const { title, icon } = templateDef[i];
        await tx.insert(pages).values({
          workspaceId: ws.id,
          shortId:     createId().slice(0, 10),
          title,
          icon,
          orderIndex:  i,
          createdBy:   session.user.id,
        });
      }
    }

    return ws;
  });

  // Enqueue invite emails for valid team invites (async via pg-boss)
  const validInvites = data.invites.filter(
    (inv) => inv.email.trim() && inv.email.includes("@"),
  );
  for (const inv of validInvites) {
    const email        = inv.email.trim().toLowerCase();
    const inviteToken  = crypto.randomUUID();
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

  redirect(`/app/${workspace.slug}`);
}
