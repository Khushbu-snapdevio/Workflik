# Bug: "Continue with Google" fails with `account_not_linked` for every existing user

**Reported:** 2026-07-27

## Symptom

Clicking "Continue with Google" while already having an account (created via invite/password or magic link) failed with a `CODE: account_not_linked` error page, for every user, every time.

## Root cause

`lib/auth/index.ts` (Better Auth config) had no `account.accountLinking` block, so Better Auth fell back to its default: before linking a new OAuth identity onto an existing local account, it requires that local account's `emailVerified` column to already be `true` (`requireLocalEmailVerified` defaults to `true`).

This app never runs a local email-verification flow — `emailVerified` (`lib/db/schema/auth.ts`) defaults to `false` and nothing in the signup/invite/password-reset paths ever sets it to `true`. So that verification check was unconditionally failing for every account, permanently blocking Google linking regardless of who the user was.
