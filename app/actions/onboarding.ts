"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function completeOnboardingAction() {
  const session = await requireSession();

  await db
    .update(users)
    .set({ onboardingCompleted: true, onboardingStep: 3 })
    .where(eq(users.id, session.user.id));

  redirect("/post-auth");
}
