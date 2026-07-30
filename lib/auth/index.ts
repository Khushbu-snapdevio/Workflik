import { and, desc, eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins/admin";
import { magicLink } from "better-auth/plugins/magic-link";
import { ADMIN_ROLE, PRODUCT_NAME } from "@/config/platform";
import { getUserCount, isRegistrationAllowed } from "@/lib/auth/registration";
import { isAuthMethodEnabled } from "@/lib/auth/settings";
import * as schema from "@/lib/db/schema";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { changeEmailTemplate } from "@/lib/email/templates/change-email";
import { magicLinkTemplate } from "@/lib/email/templates/magic-link";
import { resetPasswordTemplate } from "@/lib/email/templates/reset-password";
import { env } from "@/lib/env";
import { writeAuditLog } from "@/lib/orbit/audit";

export const auth = betterAuth({
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user:         schema.users,
      session:      schema.sessions,
      account:      schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret: env.APP_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  // This app never runs a local email-verification flow (see
  // `emailVerification` below), so `emailVerified` stays `false` on every
  // account regardless of how it signed up. Better Auth's default account
  // linking requires the existing local account to be email-verified before
  // linking a new provider to it — with our accounts always unverified,
  // that default would permanently block every invited/password user from
  // ever using "Continue with Google". Trusting Google (which verifies
  // emails itself) and dropping the local-verification requirement lets
  // linking proceed instead.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  // The `enabled` flags below just make the endpoints exist — whether each
  // method is actually *offered* on this instance is an admin-configurable,
  // DB-backed toggle (lib/auth/settings.ts), enforced per-request in the
  // `hooks.before` middleware below. Toggling is instant, no restart needed.
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      console.log("[reset-password] sending to:", user.email);
      console.log("[reset-password] link:", url);

      // A user with no existing sign-in method yet (no `accounts` row at
      // all) is setting a password for the first time — either because
      // they were just invited to a workspace (see members/route.ts) or
      // they previously only had magic-link/Google. Personalize that case
      // with welcome copy instead of "reset" wording.
      const [existingAccount] = await db
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(eq(schema.accounts.userId, user.id))
        .limit(1);

      if (!existingAccount) {
        const [pendingInvite] = await db
          .select({ workspaceName: schema.workspaces.name })
          .from(schema.workspaceMembers)
          .innerJoin(
            schema.workspaces,
            eq(schema.workspaces.id, schema.workspaceMembers.workspaceId)
          )
          .where(
            and(
              eq(schema.workspaceMembers.userId, user.id),
              eq(schema.workspaceMembers.status, "invited")
            )
          )
          .orderBy(desc(schema.workspaceMembers.createdAt))
          .limit(1);

        const { html, text } = await resetPasswordTemplate({
          email: user.email,
          resetUrl: url,
          workspaceName: pendingInvite?.workspaceName ?? null,
        });
        await enqueueEmail({
          to: user.email,
          subject: pendingInvite
            ? `You've been invited to ${pendingInvite.workspaceName}`
            : `Set your ${PRODUCT_NAME} password`,
          html,
          text,
        });
        return;
      }

      const { html, text } = await resetPasswordTemplate({
        email: user.email,
        resetUrl: url,
      });
      await enqueueEmail({
        to: user.email,
        subject: `Reset your ${PRODUCT_NAME} password`,
        html,
        text,
      });
    },
  },
  // Powers the "Change email" flow in Settings → My profile. Deliberately
  // left at its default (no `sendChangeEmailConfirmation`, no
  // `updateEmailWithoutVerification`) so every request — regardless of the
  // account's current emailVerified state — falls through to the single
  // "send a verification link to the NEW address" path below: the old
  // email keeps working until that link is clicked, so nobody can lock
  // themselves out mid-change.
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  emailVerification: {
    // Only ever reached via the change-email flow above — this app doesn't
    // require email verification at signup, so there's no other caller.
    sendVerificationEmail: async ({ user, url }) => {
      console.log("[change-email] verification link for:", user.email);
      console.log("[change-email] link:", url);
      const { html, text } = await changeEmailTemplate({
        newEmail: user.email,
        verifyUrl: url,
      });
      await enqueueEmail({
        to: user.email,
        subject: `Confirm your new ${PRODUCT_NAME} email address`,
        html,
        text,
      });
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        // Self-serve signup only ever exists to bootstrap the very first,
        // instance-admin account (or to stay open indefinitely when
        // ALLOW_PUBLIC_REGISTRATION=true). Once that's not the case, this
        // is a private self-hosted instance — new accounts are pre-created
        // by an admin's invite (members/route.ts) and set their password
        // via the reset-password flow instead of signing up here.
        if (!(await isRegistrationAllowed())) {
          throw APIError.from("FORBIDDEN", {
            code: "REGISTRATION_DISABLED",
            message:
              "This instance is invite-only. Ask an administrator for an invite.",
          });
        }
        if (!(await isAuthMethodEnabled("emailPassword"))) {
          throw APIError.from("FORBIDDEN", {
            code: "EMAIL_PASSWORD_DISABLED",
            message: "Email and password sign-in is turned off on this instance.",
          });
        }
      }
      if (ctx.path === "/sign-in/email") {
        if (!(await isAuthMethodEnabled("emailPassword"))) {
          throw APIError.from("FORBIDDEN", {
            code: "EMAIL_PASSWORD_DISABLED",
            message: "Email and password sign-in is turned off on this instance.",
          });
        }
      }
      if (ctx.path === "/sign-in/magic-link") {
        if (!(await isAuthMethodEnabled("magicLink"))) {
          throw APIError.from("FORBIDDEN", {
            code: "MAGIC_LINK_DISABLED",
            message: "Magic-link sign-in is turned off on this instance.",
          });
        }
        // Magic link auto-creates an account for any email that doesn't
        // already have one — reject that up front on an invite-only
        // instance instead of letting it fail later at verify time, so the
        // sender gets an immediate, clear error instead of a dead link.
        const magicLinkEmail = (ctx.body as { email?: string } | undefined)?.email
          ?.trim()
          .toLowerCase();
        if (magicLinkEmail && !(await isRegistrationAllowed())) {
          const [existingUser] = await db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.email, magicLinkEmail))
            .limit(1);
          if (!existingUser) {
            throw APIError.from("FORBIDDEN", {
              code: "REGISTRATION_DISABLED",
              message:
                "This instance is invite-only. Ask an administrator for an invite.",
            });
          }
        }
      }
      if (
        ctx.path === "/sign-in/social" &&
        (ctx.body as { provider?: string } | undefined)?.provider === "google"
      ) {
        if (!(await isAuthMethodEnabled("google"))) {
          throw APIError.from("FORBIDDEN", {
            code: "GOOGLE_DISABLED",
            message: "Google sign-in is turned off on this instance.",
          });
        }
      }
    }),
  },
  plugins: [
    admin({
      impersonationSessionDuration: 60 * 60 * 2,
      allowImpersonatingAdmins: false,
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.log("[magic-link] sending to:", email);
        console.log("[magic-link] link:", url);
        const { html, text } = await magicLinkTemplate({
          email,
          magicLinkUrl: url,
        });
        await enqueueEmail({
          to: email,
          subject: `Sign in to ${PRODUCT_NAME}`,
          html,
          text,
        });
      },
    }),
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  // Guard: reject any session refresh where the session was created via
  // impersonation and the 2-hour hard TTL has elapsed.
  databaseHooks: {
    user: {
      create: {
        // Catch-all enforcement for the invite-only model: closes the gap
        // that `hooks.before` above can't reach — magic-link and Google
        // OAuth both auto-create a new user row directly (no `/sign-up/*`
        // request path to intercept), so a per-request check on `ctx.path`
        // alone isn't sufficient. Returning `false` aborts the insert; both
        // Better Auth flows handle that gracefully by redirecting with an
        // error instead of crashing (verified against the installed
        // better-auth version's source — see plan notes).
        before: async () => {
          if (await isRegistrationAllowed()) return;
          return false;
        },
        after: async (user) => {
          console.log(`[signup] new account created: ${user.email} (${user.id})`);

          try {
            await writeAuditLog({
              actorId:    user.id,
              action:     "user.signup",
              targetType: "user",
              targetId:   user.id,
              metadata:   { email: user.email, name: user.name ?? null },
            });
          } catch { /* never fail signup due to audit */ }

          // Self-hosted instances have no separate "request platform admin
          // access" flow — the very first account created on a fresh
          // install becomes the instance admin automatically, so there's no
          // shell/DB-access step required to reach Orbit for the first time.
          // `pnpm make:admin` remains available to promote additional users.
          try {
            const userCount = await getUserCount();
            if (userCount === 1) {
              console.log(`[signup] first account on this instance — auto-promoting to platform admin: ${user.email}`);
              await db
                .update(schema.users)
                .set({ role: ADMIN_ROLE, isPlatformAdmin: true })
                .where(eq(schema.users.id, user.id));
              await writeAuditLog({
                actorId:    user.id,
                action:     "user.auto_promoted_first_admin",
                targetType: "user",
                targetId:   user.id,
                metadata:   { email: user.email },
              });

              // Seed built-in templates immediately rather than leaving a
              // brand-new instance's template gallery empty for up to ~10
              // minutes waiting on the scaffold-healthcheck cron tick.
              const { autoSeedTemplates } = await import(
                "@/lib/jobs/handlers/scaffold-healthcheck"
              );
              await autoSeedTemplates();
            }
          } catch { /* never fail signup due to auto-promotion */ }
        },
      },
    },
    session: {
      update: {
        before: async (session) => {
          const raw = session as Record<string, unknown>;
          if (raw["impersonatedBy"] && raw["impersonatedAt"]) {
            const impersonatedAt = new Date(raw["impersonatedAt"] as string);
            const twoHoursMs = 2 * 60 * 60 * 1000;
            if (Date.now() - impersonatedAt.getTime() > twoHoursMs) {
              return false;
            }
          }
          return { data: session };
        },
      },
    },
  },
});
