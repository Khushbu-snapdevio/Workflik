import { count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthSettings, isGoogleConfigured } from "@/lib/auth/settings";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isSmtpConfigured } from "@/lib/smtp/client";

// Public (pre-login) — the sign-in page needs to know which methods to
// render before there's any session to check permissions against.
export async function GET() {
  const settings = await getAuthSettings();
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);

  return NextResponse.json({
    emailPassword: settings.emailPasswordEnabled,
    magicLink: settings.magicLinkEnabled,
    google: settings.googleEnabled && isGoogleConfigured(),
    // Lets the sign-in UI tell the truth about whether a magic-link email
    // will actually be sent, instead of always claiming one was (§5.9).
    smtpConfigured: isSmtpConfigured(),
    // No account exists yet anywhere on this instance — the very first
    // signup bootstraps the instance admin, so the sign-in page forces a
    // password-only signup view. Once this flips false, the instance is
    // invite-only: self-serve signup is retired entirely.
    isBootstrap: userCount === 0,
  });
}
