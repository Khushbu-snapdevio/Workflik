import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  userPreferences,
  users,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

export default async function PostAuthPage() {
  const session = await requireSession();

  // First-time users must complete onboarding before seeing a workspace
  const [freshUser] = await db
    .select({ onboardingCompleted: users.onboardingCompleted })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (freshUser && !freshUser.onboardingCompleted) {
    redirect("/onboarding");
  }

  // Redirect to last active workspace if available
  const [prefs] = await db
    .select({ lastWorkspaceId: userPreferences.lastWorkspaceId })
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1);

  if (prefs?.lastWorkspaceId) {
    const [ws] = await db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, prefs.lastWorkspaceId))
      .limit(1);
    if (ws) {
      redirect(`/${ws.slug}`);
    }
  }

  // Fall back to first active workspace membership
  const [firstMembership] = await db
    .select({ slug: workspaces.slug })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, session.user.id),
        eq(workspaceMembers.status, "active")
      )
    )
    .limit(1);

  if (firstMembership) {
    redirect(`/${firstMembership.slug}`);
  }

  // No workspace yet — send to workspace creation
  redirect("/workspaces/new");
}
