import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isSmtpConfigured } from "@/lib/smtp/client";
import { OnboardingUI } from "./_onboarding-ui";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const session = await requireSession();

  const [user] = await db
    .select({ onboardingCompleted: users.onboardingCompleted, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Already onboarded — skip straight to workspace
  if (user?.onboardingCompleted) {
    redirect("/platform/post-auth");
  }

  return <OnboardingUI initialName={user?.name ?? ""} smtpConfigured={isSmtpConfigured()} />;
}
