# Bug: sign-in form shows raw "[body.email] Invalid email address" instead of a clean message

**Reported:** 2026-07-16

## Symptom

On `/sign-in`, entering a malformed email address (magic link, password sign-in/sign-up, or Google) shows the error `[body.email] Invalid email address` instead of just `Invalid email address`.

## Reproduce

1. Go to `/sign-in`.
2. Type an invalid email (e.g. missing `@`) into the Work email field.
3. Submit.
4. Expected: `Invalid email address`. Actual: `[body.email] Invalid email address`.

## Root cause

Better Auth validates the request body with its own Zod schema before the request ever reaches app code. When that validation fails, its error message is prefixed with the failing field path (`[body.email] ...`). `app/auth/_components/auth-form.tsx` passed `result.error.message` straight into `setError()` for all three auth flows (magic link, password, Google), displaying that raw internal prefix verbatim to the user.
