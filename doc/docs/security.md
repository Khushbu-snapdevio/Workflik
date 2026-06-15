# Security Model

WorkFlik's security model, consolidated from the feature specs. Read this before working on anything touching auth, permissions, sharing, or file uploads. As the surface grows this file can split into a `docs/security/` folder (per-topic).

The single most important principle: **access control is enforced in the database query, never in application code after a broad fetch.** That is [Phase-1 decision #5](../README.md#phase-1-architecture-decisions) and Rule 3 in [CLAUDE.md](../CLAUDE.md#rules).

## Authentication

- **Passwordless, magic-link only** (Better Auth). No passwords, no OAuth/social in the MVP — fewer credential-handling surfaces to secure.
- **Magic-link tokens are short-lived (15-minute TTL) and single-use.** A token is deleted the moment it's consumed; expired/unused token expiry is handled by Better Auth's own lifecycle. A delivered link that's already been used must fail closed.
- **Sessions are database-backed, have a 7-day sliding TTL, and are revocable.** Each use of a valid session token renews its expiry. Users can list active devices and revoke any session; TTL-based cleanup is handled by Better Auth, not a custom job.
- **The Better Auth ↔ schema column mapping is locked once** in `lib/auth/` (see the mapping note in [DATABASE-PLAN.md](../DATABASE-PLAN.md)). Never rename auth columns after sessions/accounts exist.

## Impersonation Sessions

- **Platform-admin only** (Orbit Admin — `is_platform_admin = true`). Never exposed to workspace Admins.
- Impersonation sessions are created with `impersonated_by = <admin user_id>` and `impersonated_at = NOW()` and have a **hard 2-hour TTL** — no sliding-window refresh.
- A `beforeRefresh` hook in `lib/auth/` rejects any refresh attempt where `NOW() - session.impersonated_at > 2 hours`. Without this hook, Better Auth's default sliding-window refresh would silently extend the session indefinitely.
- Every impersonation is logged to `platform_audit_log` with actor, target user, and timestamp — before the session is created, not after.

## Authorization (the core)

Two layers: **workspace role** (Admin / Editor / Viewer) and **page-level permission** (Full Access / Can Edit / Can Comment / Can View).

- **Effective permission is resolved by a single recursive CTE** that walks `parent_id` up to the first explicit `page_permissions` row, then falls back to `workspaces.default_page_access`. One query — never an N+1 walk in application code (Phase-1 decision #3).
- **Private-page short-circuit.** When `pages.is_private = true`, inheritance and the workspace default are skipped — only the page creator and explicit grants apply, **and workspace Admins are denied too.** Honor this in the resolver, not as a special case sprinkled across callers. The one exception: **Platform Admins** (`is_platform_admin = true`) can see private page **titles only** (never content) via Orbit Admin (`/orbit`) for compliance and moderation — this is enforced by a separate Orbit-specific query that returns only `pages.title` and never exposes `blocks` or `property_values`. This capability is not available to workspace Admins through any in-product path.
- **Filtering happens in SQL.** Every list/search/tree query joins the permission resolution so restricted rows never leave the database. Fetching broadly and filtering in JS is a **BOLA (Broken Object-Level Authorization)** vulnerability — the restricted rows have already left the trust boundary.
- **Permission ceiling enforcement.** Before inserting or updating a `page_permissions` row, validate the target user's `workspace_members.role` and cap `access_level` accordingly: Viewer → `can_view` max, Editor → `can_edit` max, Admin → any level. Never persist the client-supplied `access_level` directly; return the (possibly downgraded) value in the response.
- **Use the shared auth helpers** in the documented order: `requireSession` → `requireWorkspaceMember` → `requirePagePermission`. Never reimplement a permission check inline (Rule 3).

## Sharing & external access

- **Public links** grant `can_view` or `can_comment` with **no login required.** The public render path must expose only the shared page and its permitted descendants — re-resolve permissions per request; never trust a client-supplied page id alone.
- **Guest access** invites an external email to specific pages. Guests are scoped to exactly the pages they're granted — they are not workspace members and must never see the workspace tree, search across it, or other pages.
- **Subpage inheritance with per-page override** — a child inherits the parent's sharing unless it has its own explicit grant. The override must be evaluated by the same resolver, not bolted on.

## File uploads

- **Pre-signed direct-to-S3 PUT URLs.** Files upload straight to the bucket; bytes never transit the app server.
- **Validate before issuing the URL** — check the authenticated user's permission on the target, the declared content type, and the per-type size limit (page cover 5 MB, icons/avatars 1 MB, image 10 MB, video/audio 50 MB, file 100 MB) **server-side** before signing. A signed URL is a capability; only mint it for a validated request.
- **Serve via CDN**; treat user-uploaded files as untrusted content (correct `Content-Type`, no inline execution of arbitrary types).
- **Orphan sweep** — the `cleanup-orphaned-media` job deletes objects no longer referenced by any block/page (and `cleanup-stale-uploads` removes never-confirmed uploads) so abandoned uploads can't accumulate.

## Notifications & real-time

- **The SSE stream is per-user.** `GET /api/notifications/stream` must validate the session on the initial connection using the standard `requireSession` helper and reject unauthenticated or expired sessions before opening the stream. Once open, only the authenticated user's own notifications are emitted — never another user's events. Long-lived SSE connections do not re-authenticate on each event, so session expiry must be caught at connection time.
- **Notification enqueue is transactional** — only inside the transaction that saved the triggering event, so a rolled-back action never produces a phantom notification.

## Platform admin (Orbit)

- **Orbit is not reachable by end users** — gate every `/orbit` route and API on `users.is_platform_admin`.
- **Every Orbit mutation writes an append-only `platform_audit_log` row** (actor, action, target, metadata). Admins cannot escalate or modify their own admin status through the user-edit path.

## Token storage policy

Every token in WorkFlik belongs to one of three storage patterns:

| Token | Column | Stored as | Rationale |
|-------|--------|-----------|-----------|
| Magic-link token | `verifications.value` | **Hashed** (Better Auth handles this) | Short-lived credential; hashing means a DB leak can't be immediately used for sign-in |
| Session token | `sessions.token` | **Hashed** (Better Auth handles this) | Long-lived session; hash prevents a DB dump from yielding active sessions |
| Workspace invite token | `workspace_members.invite_token` | **Plaintext** | Single-use, 7-day TTL, high entropy (UUID). Lookup is by raw token from the link — hashing would require a full table scan or a separate lookup table. Entropy alone is sufficient. |
| Workspace invite link token | `workspaces.invite_link_token` | **Plaintext** | Not a credential — it's the public invite link. Anyone with it can join; revocation is by regeneration. |
| Public link token | `public_links.token` | **Plaintext** | 21-char `nanoid` (≈ 126 bits). Not a session credential; used as a URL path segment. Entropy makes brute-force infeasible. |
| Guest invitation token | `guest_invitations.token` | **Plaintext** | Single-use, 7-day TTL. Same reasoning as workspace invite token. |
| Ownership transfer confirmation token | `workspace_members` (transient, passed in email link) | **Plaintext, short-lived** | Sent in email, consumed on click, expiry enforced server-side. Not persisted beyond the transfer flow. |

**General rule:** tokens used as session credentials are hashed (Better Auth manages this). Invite and capability tokens with sufficient entropy (≥ 128 bits) are stored plaintext — the bit-space makes offline attacks infeasible, and hashing them complicates point-lookup without meaningfully improving security.

---

## Forward-looking (post-MVP, document now so it's not forgotten)

- **Outbound webhooks (Phase 3)** — sign payloads (HMAC), guard against **SSRF** by re-resolving the destination URL on every delivery and blocking private/loopback/link-local ranges, and auto-disable flapping endpoints.
- **Public API + API keys (Phase 3)** — scoped keys, the same SQL-level permission enforcement as the web app.

---

*Last updated: 2026-06-12*
