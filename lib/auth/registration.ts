import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";

export async function getUserCount(): Promise<number> {
  const [{ value }] = await db.select({ value: count() }).from(users);
  return value;
}

// Self-hosted instances are invite-only by default: self-serve registration
// is only ever allowed to bootstrap the very first (instance-admin)
// account. ALLOW_PUBLIC_REGISTRATION keeps it open indefinitely for
// organizations that want that instead. This is the single source of truth
// for the decision — every enforcement point (password signup, magic link,
// OAuth) and the sign-in UI itself all call this instead of re-deriving it.
export async function isRegistrationAllowed(): Promise<boolean> {
  if (env.ALLOW_PUBLIC_REGISTRATION) return true;
  return (await getUserCount()) === 0;
}
