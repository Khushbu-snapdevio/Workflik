import { z } from "zod";

// Single source of truth for the password policy. Before this, the only rule
// was `min(8)`, hand-repeated across six call sites (two API routes, signup,
// reset-password, invite set-password, and the profile panel) — so tightening
// it meant finding all six and keeping their wording in sync. Everything
// imports from here instead; better-auth's own minPasswordLength/
// maxPasswordLength in lib/auth/index.ts are kept aligned with MIN/MAX below.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// Ordered so the message a user sees is the most basic unmet rule first
// (length before character classes), rather than whichever regex happened to
// be listed first. `label` is the checklist text shown live under the field;
// `message` is the sentence shown once submission is blocked.
export const PASSWORD_RULES: { id: string; label: string; message: string; test: (v: string) => boolean }[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN} characters`,
    message: `Password must be at least ${PASSWORD_MIN} characters.`,
    test: (v) => v.length >= PASSWORD_MIN,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    message: "Password must include at least one uppercase letter.",
    // \p{Lu} not [A-Z] — consistent with the special-character rule below, so
    // non-Latin scripts (Cyrillic, Greek) satisfy this the same way Latin does.
    test: (v) => /\p{Lu}/u.test(v),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    message: "Password must include at least one lowercase letter.",
    test: (v) => /\p{Ll}/u.test(v),
  },
  {
    id: "digit",
    label: "One number",
    message: "Password must include at least one number.",
    test: (v) => /\p{N}/u.test(v),
  },
  {
    id: "special",
    label: "One special character",
    message: "Password must include at least one special character.",
    // Anything that is not a letter, a number, or whitespace — in ANY script.
    // Deliberately not an allow-list of ASCII punctuation, so "£" or "€" from a
    // password manager still counts; and deliberately \p{L} rather than
    // [A-Za-z], or an accented letter like "ñ" would satisfy this rule on its
    // own and let "Contraseña1" through with no symbol at all.
    test: (v) => /[^\p{L}\p{N}\s]/u.test(v),
  },
];

/** The first unmet rule's message, or null when the password satisfies all of
 *  them. Used for the inline field error on every password form. */
export function passwordError(value: string): string | null {
  if (value.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  return PASSWORD_RULES.find((r) => !r.test(value))?.message ?? null;
}

export function isPasswordValid(value: string): boolean {
  return passwordError(value) === null;
}

/** Server-side equivalent, for API routes that parse a request body. Surfaces
 *  the same sentences the client shows, so a request that slips past the
 *  client (or comes from elsewhere) fails with identical wording. */
export const passwordSchema = z
  .string()
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters.`)
  .superRefine((value, ctx) => {
    const message = passwordError(value);
    if (message) ctx.addIssue({ code: "custom", message });
  });
