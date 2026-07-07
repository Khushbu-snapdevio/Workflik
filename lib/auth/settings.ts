import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authSettings } from "@/lib/db/schema";
import { env } from "@/lib/env";

export type AuthMethod = "emailPassword" | "magicLink" | "google";

const SINGLETON_ID = 1;

// Google is only ever offerable if OAuth credentials are actually
// configured — the admin toggle in Orbit layers on top of this, it can't
// turn Google on without real credentials present.
export function isGoogleConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

// Singleton row, lazily created on first read so a fresh install doesn't
// need a seed step — every method defaults to enabled (Google still gated
// by isGoogleConfigured() regardless of this row's value).
export async function getAuthSettings() {
  const [existing] = await db
    .select()
    .from(authSettings)
    .where(eq(authSettings.id, SINGLETON_ID))
    .limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(authSettings)
    .values({ id: SINGLETON_ID })
    .onConflictDoNothing()
    .returning();
  if (created) {
    return created;
  }

  // Lost a race with a concurrent first-read — the other request's insert
  // already committed the row.
  const [row] = await db
    .select()
    .from(authSettings)
    .where(eq(authSettings.id, SINGLETON_ID))
    .limit(1);
  return row;
}

export async function isAuthMethodEnabled(method: AuthMethod) {
  const settings = await getAuthSettings();
  switch (method) {
    case "emailPassword":
      return settings.emailPasswordEnabled;
    case "magicLink":
      return settings.magicLinkEnabled;
    case "google":
      return settings.googleEnabled && isGoogleConfigured();
    default:
      return false;
  }
}

export interface UpdateAuthSettingsInput {
  emailPasswordEnabled?: boolean;
  googleEnabled?: boolean;
  magicLinkEnabled?: boolean;
  updatedBy: string;
}

export class AuthSettingsError extends Error {}

export async function updateAuthSettings(input: UpdateAuthSettingsInput) {
  const current = await getAuthSettings();
  const next = {
    emailPasswordEnabled:
      input.emailPasswordEnabled ?? current.emailPasswordEnabled,
    magicLinkEnabled: input.magicLinkEnabled ?? current.magicLinkEnabled,
    googleEnabled: input.googleEnabled ?? current.googleEnabled,
  };

  if (
    !next.emailPasswordEnabled &&
    !next.magicLinkEnabled &&
    !next.googleEnabled
  ) {
    throw new AuthSettingsError(
      "At least one sign-in method must stay enabled."
    );
  }
  if (next.googleEnabled && !isGoogleConfigured()) {
    throw new AuthSettingsError(
      "Google sign-in can't be enabled until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set."
    );
  }

  const [updated] = await db
    .update(authSettings)
    .set({ ...next, updatedBy: input.updatedBy })
    .where(eq(authSettings.id, SINGLETON_ID))
    .returning();
  return updated;
}
