import { and, eq, gt } from "drizzle-orm";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { AcceptInviteClient } from "./accept-invite-client";
import { WrongAccountError } from "./wrong-account";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  // Look up the invite
  const [member] = await db
    .select({
      id:           workspaceMembers.id,
      workspaceId:  workspaceMembers.workspaceId,
      role:         workspaceMembers.role,
      status:       workspaceMembers.status,
      invitedEmail: workspaceMembers.invitedEmail,
      inviteExpires:workspaceMembers.inviteExpires,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      workspaceIcon: workspaces.icon,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.inviteToken, token))
    .limit(1);

  if (!member) {
    return <InviteError message="This invite link is invalid." />;
  }

  if (member.status === "expired" || (member.inviteExpires && member.inviteExpires < new Date())) {
    return <InviteError message="This invite link has expired." />;
  }

  if (member.status === "active") {
    return <InviteError message="This invite has already been accepted." variant="success" />;
  }

  // Check if viewer is signed in
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    // Redirect to login with next param pointing back here
    redirect(`/auth/login?next=/invite/${token}`);
  }

  // Signed-in user's email must match the invite email (if email-specific invite)
  if (member.invitedEmail && member.invitedEmail !== session.user.email) {
    return (
      <WrongAccountError
        invitedEmail={member.invitedEmail}
        currentEmail={session.user.email}
        token={token}
      />
    );
  }

  // Check if user is already an active member
  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, member.workspaceId),
        eq(workspaceMembers.userId, session.user.id),
        eq(workspaceMembers.status, "active")
      )
    )
    .limit(1);

  if (existing) {
    redirect(`/platform/dashboard`);
  }

  return (
    <AcceptInviteClient
      token={token}
      workspaceName={member.workspaceName}
      workspaceIcon={member.workspaceIcon ?? null}
      role={member.role}
    />
  );
}

function InviteError({ message, variant = "warning" }: { message: string; variant?: "warning" | "success" }) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <main className="grid min-h-screen place-items-center bg-page px-4">
      <div className="w-full max-w-md text-center">
        <div
          className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-[var(--radius-lg)] ring-1 ${
            variant === "success" ? "bg-primary/10 ring-primary/20" : "bg-warning/10 ring-warning/20"
          }`}
        >
          <Icon className={`size-6 ${variant === "success" ? "text-primary" : "text-warning"}`} strokeWidth={1.5} />
        </div>
        <h1 className="mb-2 text-lg font-bold text-foreground">Invite Unavailable</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <a href="/platform/dashboard">Go to dashboard</a>
        </Button>
      </div>
    </main>
  );
}
