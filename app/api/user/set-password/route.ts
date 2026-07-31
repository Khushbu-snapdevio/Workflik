import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAuthMethodEnabled } from "@/lib/auth/settings";
import { passwordSchema } from "@/lib/auth/password";
import { apiError, ApiError, getSession } from "@/lib/workspaces/auth";

const setPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// POST /api/user/set-password — lets a Google-only user (no "credential"
// account row yet) add a password so email+password sign-in also works.
// better-auth's setPassword endpoint is server-only (no HTTP route of its
// own — see lib/auth/index.ts), so this route is what the profile page
// calls instead.
export async function POST(req: Request) {
  try {
    await getSession();

    if (!(await isAuthMethodEnabled("emailPassword"))) {
      return apiError(403, "Email and password sign-in is turned off on this instance.");
    }

    const body   = await req.json();
    const parsed = setPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message ?? "Invalid password");
    }

    await auth.api.setPassword({
      headers: await headers(),
      body: { newPassword: parsed.data.newPassword },
    });

    return Response.json({ success: true });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    // better-auth throws its own APIError for domain errors, e.g.
    // PASSWORD_ALREADY_SET if a credential account was created elsewhere
    // (another tab, the reset-password flow) between page load and submit.
    if (err instanceof APIError) return apiError(err.statusCode, err.message);
    console.error("[set-password]", err);
    return apiError(500, "Internal server error");
  }
}
