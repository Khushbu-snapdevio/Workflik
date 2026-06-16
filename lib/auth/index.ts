import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { magicLink } from "better-auth/plugins/magic-link";
import { PRODUCT_NAME } from "@/config/platform";
import * as schema from "@/lib/db/schema";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { magicLinkTemplate } from "@/lib/email/templates/magic-link";
import { env } from "@/lib/env";

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
  plugins: [
    admin({
      impersonationSessionDuration: 60 * 60 * 2,
      allowImpersonatingAdmins: false,
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
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
    session: {
      update: {
        before: async (session) => {
          const raw = session as Record<string, unknown>;
          if (raw["impersonatedBy"] && raw["createdAt"]) {
            const createdAt = new Date(raw["createdAt"] as string);
            const twoHoursMs = 2 * 60 * 60 * 1000;
            if (Date.now() - createdAt.getTime() > twoHoursMs) {
              return false;
            }
          }
          return { data: session };
        },
      },
    },
  },
});
