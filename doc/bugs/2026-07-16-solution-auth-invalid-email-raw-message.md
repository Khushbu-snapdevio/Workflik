# Solution: strip the field-path prefix before displaying auth error messages

**Fixed:** 2026-07-16

## What changed

`app/auth/_components/auth-form.tsx` — added a `cleanAuthErrorMessage(message)` helper that strips a leading `[...]` bracket tag (e.g. `[body.email] `) from the front of a message, and applied it at all three places that set `error` from `result.error.message`: `onMagicLinkSubmit`, `onPasswordSubmit`, and `onGoogleClick`.

## Why this fixes the root cause

The message always contained the correct human-readable text after the prefix — the fix only strips the internal field-path tag at the point it's about to be shown, without touching the validation logic, request flow, or any other behavior. Since all three sign-in paths route through the same helper, the fix is consistent everywhere on the page.

## Verification

`tsc --noEmit` passes for the touched file. Not manually verified in a live browser in this session — worth confirming visually: submit an invalid email on each of the three flows (magic link, password, Google) and check the error reads `Invalid email address` with no bracketed prefix.
