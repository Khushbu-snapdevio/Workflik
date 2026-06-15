# Authentication

## Overview

Authentication handles user identity — who you are, how you prove it, and how your session is maintained. WorkFlik uses **Better Auth** with the **Magic Link Plugin** and the **Admin Plugin**, integrated directly into Next.js App Router.

Authentication is **passwordless** — the only way to sign in or sign up is via a magic link sent to your email. There are no passwords and no OAuth / social providers (including Google).

**Powered by:** [Better Auth](https://better-auth.com)

**Why Better Auth:**
- Built for Next.js (API Routes + Server Actions)
- Database-backed sessions (more secure than stateless JWT)
- Magic Link Plugin provides passwordless email sign-in out of the box
- Admin Plugin provides ban, impersonation, and session revocation out of the box
- Works natively with Drizzle ORM + PostgreSQL

---

## Auth Flows

| Flow | Description |
|------|-------------|
| Magic Link | Passwordless sign in / sign up via a one-time email link |
| Sign Out | End the current session |
| Session Management | View and revoke active sessions across devices |

---

## 1. Magic Link (Passwordless)

Users sign in or sign up by requesting a one-time link sent to their email. This is the only authentication method.

### Flow

1. User enters their email on `/sign-in` and chooses `"Email me a sign-in link"`
2. **Always shows:** `"If an account exists with this email, a sign-in link has been sent."` (prevents email enumeration)
3. Better Auth sends a magic link with a token valid for **15 minutes**, single-use
4. User clicks the link → `GET /api/auth/magic-link/verify?token=:token`
5. Better Auth verifies the token:
   - **New email** (not in DB): account auto-created (email marked verified — the link proves ownership), redirected to `/onboarding`
   - **Existing user**: session created, redirected to last active workspace
6. The link is invalidated immediately after use

> A successful magic-link sign-in counts as email verification — clicking the link proves the user controls the address. No separate verification step is needed.

### Session Duration

- Default: **7 days** sliding window (TTL resets on each authenticated request)

---

## 2. Session Management

### Access

`/settings/sessions`

### Session List

Each active session shows:
- Device type (Desktop / Mobile)
- Browser (Chrome, Safari, Firefox, etc.)
- Approximate location (city, country — IP-based, best-effort)
- Last active timestamp
- `"Current session"` badge on the active device

### Actions

| Action | Description |
|--------|-------------|
| Revoke session | End a specific session (log out that device) |
| Revoke all other sessions | End all sessions except the current one |

---

## 3. Account Settings

Available at `/settings/account`

**Profile:** Update display name, avatar (upload or use initials as default), Role / Title (`job_title`), and timezone (IANA tz, auto-detected from the browser on first sign-in; used for digest-email delivery — see [notifications.md](notifications.md))

**Danger Zone — Delete Account:**
- If the user is the Admin of any workspace, they must transfer ownership first
- Shown: `"You are the Admin of X workspace(s). Transfer ownership before deleting your account."`
- Requires typing email address to confirm deletion

**What happens to content on deletion:**

| Content type | Outcome |
|--------------|---------|
| Pages created in shared workspaces | Remain in the workspace; `created_by` is set to null and displayed as `"Former Member"` |
| Comments | Remain visible; author shown as `"Former Member"` |
| Private pages (visible only to the deleted user) | **Permanently deleted** — no other user has access to them, so they cannot be recovered or reassigned |
| Uploaded files on private pages | Deleted from object storage; workspace `bytes_used` decremented |
| Workspace memberships | Removed from all workspaces the user belonged to |

Private page deletion is queued as a pg-boss job (`delete-user-private-pages`) that runs immediately on account deletion confirmation.

---

## 4. Better Auth — Admin Plugin Features

Used by the WorkFlik platform team via **Orbit Admin** — not exposed to customers.

| Feature | Description |
|---------|-------------|
| Ban user | Immediately revokes all sessions. User cannot sign in. |
| Unban user | Restores sign-in access. |
| Impersonate user | Platform admin logs in as any user for support. Opens a separate marked session. |
| Revoke sessions | Revoke any user's sessions individually or all at once. |
| List sessions | View all active sessions for any user. |

---

## Background Jobs (pg-boss)

| Job | Trigger | Description |
|-----|---------|-------------|
| `delete-user-private-pages` | On account deletion confirmation | Permanently deletes all private pages owned by the deleted user and queues object-storage file deletion for any uploaded files on those pages. Runs immediately (not on a schedule). |

---

## Data Model

```
User
├── id                   (uuid, primary key)
├── name                 (string — display name)
├── email                (string, unique)
├── email_verified       (boolean, default: false)
├── image                (string — avatar CDN URL, nullable)
├── job_title            (string — free-text role/title, nullable)
├── timezone             (string — IANA tz for digest delivery, nullable)
├── is_platform_admin    (boolean, default: false)
├── banned               (boolean, default: false)
├── banned_reason        (string, nullable)
├── ban_expires          (timestamp, nullable)
├── onboarding_completed (boolean, default: false)
├── onboarding_step      (integer — 0 = not started, 1–4 = wizard screen, default: 0)
├── tour_completed       (boolean, default: false)
├── last_active_at       (timestamp, nullable)
├── created_at           (timestamp)
└── updated_at           (timestamp)

Session
├── id                  (uuid, primary key)
├── user_id             (foreign key → User)
├── token               (string, unique — hashed)
├── expires_at          (timestamp — 7-day sliding TTL)
├── ip_address          (string, nullable)
├── user_agent          (string, nullable)
├── impersonated_by     (uuid, nullable — set for Orbit impersonation; 2-hour TTL)
├── created_at          (timestamp)
└── updated_at          (timestamp)

Verification
├── id                  (uuid, primary key)
├── identifier          (string — email)
├── value               (string — hashed magic-link token)
├── expires_at          (timestamp — 15-minute TTL)
├── created_at          (timestamp)
└── updated_at          (timestamp)
```

> **Authoritative schema:** the Drizzle model in [DATABASE-PLAN.md § Auth](../DATABASE-PLAN.md) is the single source of truth. This data model sketch must stay in sync with it.

---

## API Endpoints

Better Auth exposes a unified handler at `/api/auth/[...all]`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sign-in/magic-link` | Request a magic-link sign-in email |
| GET | `/api/auth/magic-link/verify?token=` | Verify magic link and create session |
| POST | `/api/auth/sign-out` | Sign out current session |
| GET | `/api/auth/get-session` | Get current session + user |
| GET | `/api/auth/list-sessions` | List all active sessions |
| POST | `/api/auth/revoke-session` | Revoke a specific session |
| POST | `/api/auth/revoke-other-sessions` | Revoke all sessions except current |

---

## UI Screens

| Screen | Route | Access |
|--------|-------|--------|
| Sign In | `/sign-in` | Unauthenticated |
| Onboarding | `/onboarding` | Authenticated (new user) |
| Account Settings | `/settings/account` | Authenticated |
| Session Management | `/settings/sessions` | Authenticated |

---

## Security Considerations

- **Email enumeration** — Magic-link requests always return the same response regardless of whether the email exists.
- **Session hijacking** — Database-backed sessions; token is hashed in the DB.
- **Token reuse** — Magic-link tokens are single-use and expire after 15 minutes.
- **Banned users** — Sessions revoked immediately on ban.
- **Impersonation** — Logged to audit trail; session marked with `impersonated_by`.
- **Account deletion** — Requires email confirmation; ownership transfer enforced.

---

## Business Rules

1. Email addresses are unique across the platform — one account per email.
2. Authentication is passwordless — magic link is the only sign-in / sign-up method.
3. A successful magic-link sign-in marks the email as verified — clicking the link proves ownership, so there is no separate verification step.
4. Magic-link tokens are single-use and expire after 15 minutes.
5. A banned user's sessions are revoked immediately and cannot re-authenticate until unbanned.
6. A user cannot delete their account if they are the sole Admin of any workspace — ownership must be transferred first.
7. Magic-link requests always return the same response regardless of whether the email exists — prevents account enumeration.
8. Sessions use sliding expiry — TTL resets on each authenticated request, keeping active users logged in.
9. On account deletion: shared-workspace content (pages, comments) is retained with `"Former Member"` attribution. Private pages owned exclusively by the deleted user are permanently and irreversibly deleted — they are inaccessible to anyone else and cannot be recovered.

---

## Out of Scope (MVP)

- Email + password authentication
- OAuth / social sign-in (Google, GitHub, etc.)
- Two-factor authentication (2FA / TOTP)
- SSO / SAML (enterprise identity providers)
- Passkeys / WebAuthn
- Email address change (requires re-verification flow — Phase 2)
- Account merge across different emails