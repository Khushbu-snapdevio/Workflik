import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ProfileSection } from "@/components/settings/profile-section";

export const metadata: Metadata = { title: "My Profile — Settings" };

type Props = { params: Promise<{ workspace: string }> };

export default async function ProfileSettingsPage({ params }: Props) {
  await params; // consume params (workspace slug not needed for profile)
  const session = await requireSession();

  const [user] = await db
    .select({
      id:       users.id,
      name:     users.name,
      email:    users.email,
      jobTitle: users.jobTitle,
      timezone: users.timezone,
      image:    users.image,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return <ProfileSection user={user!} />;
}
