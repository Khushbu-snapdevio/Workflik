# Admin Panel (Orbit Admin)

## Overview

**Orbit Admin** is WorkFlik's internal operations dashboard — an exclusive tool for the platform team to manage users, workspaces, and platform health. It is **not accessible to any end user**, including workspace Admins. All capabilities here exist at the platform layer, separate from in-product workspace Admin features.

**Powered by:** Better Auth Admin Plugin + custom Orbit Admin interface.

---

## Access

- Route: `/orbit` (requires `is_platform_admin = true` on the user record)
- Platform admin status is set directly in the database — there is no UI to self-assign this role
- Impersonation sessions are logged to the audit trail

---

## Dashboard

**Overview metrics:**

| Metric | Description |
|--------|-------------|
| Total users | All registered accounts |
| Active workspaces | Workspaces with at least one login in the past 30 days |
| New signups (7d / 30d) | Signup trend |
| Active sessions | Current active sessions across all users |

---

## User Management (`/orbit/users`)

| Action | Description |
|--------|-------------|
| List all users | Paginated table with name, email, join date, last active |
| Search users | Filter by name, email |
| View user detail | Profile, linked workspaces, active sessions, account status |
| Ban user | Immediately revokes all sessions. User cannot sign in. Optionally set a ban reason. |
| Unban user | Restores sign-in access |
| Impersonate user | Opens a separate admin session logged in as the user — for support troubleshooting |
| Revoke all sessions | Signs the user out of all devices |
| View session list | All active sessions for a user with device, IP, and last active |

**Impersonation:** Marked with `impersonated_by` on the session record. Always logged to the audit trail. The impersonation session has a maximum duration of 2 hours. **Enforcement:** when the Better Auth Admin plugin creates the impersonation session, set `expiresAt = now() + 2 hours` (instead of the normal 7-day sliding window). The platform admin's request guard checks `session.expiresAt` on every request; an expired impersonation session redirects to the Orbit login screen. No sliding TTL refresh applies — the 2-hour window is fixed from session creation.

---

## Workspace Management (`/orbit/workspaces`)

| Action | Description |
|--------|-------------|
| List all workspaces | Paginated table with name, member count, created date |
| Search workspaces | Filter by name or ID |
| View workspace detail | Members list, page count, storage usage |
| Force delete workspace | Permanently delete a workspace and all its content (requires confirmation) |
| Impersonate workspace | View the workspace as an Admin (uses user impersonation for a workspace member) |

---

## Template Management (`/orbit/templates`)

Built-in template content is authored and managed here by the WorkFlik team. End users and workspace Admins have no access. See the [Templates](./templates.md) document for the full specification.

**Summary of capabilities:**

| Action | Description |
|--------|-------------|
| List built-in templates | All templates with name, category, and status (Draft / Published) |
| Create template | Author a new built-in template using the block-based editor |
| Edit template | Modify content, name, description, or category |
| Preview template | View the template exactly as users see it in the gallery |
| Publish / Unpublish | Toggle `status` between `draft` and `published` — only published templates appear in the user-facing gallery |
| Delete template | Permanently remove a template — does not affect pages already created from it |

---

## Platform Analytics (`/orbit/analytics`)

| Metric | Description |
|--------|-------------|
| Signups over time | Daily/weekly/monthly signup chart |
| Activation rate | % of new users who create a page within 7 days |
| Feature usage | How many workspaces are using each feature (databases, comments, etc.) |
| Notification open rate | % of email notifications that are opened |
| Search usage | Search queries per day, no-result rate |

Analytics data is aggregated and anonymized — individual user activity is not surfaced in charts.

---

## Audit Trail (`/orbit/audit`)

A read-only log of all platform-team actions:

| Column | Description |
|--------|-------------|
| Timestamp | When the action occurred |
| Actor | Platform admin who performed the action |
| Action | What was done (e.g., `user.banned`, `session.impersonated`) |
| Target | The user or workspace affected |
| Notes | Optional reason or context |

Audit trail is append-only — records cannot be deleted.

---

## Data Model

```
PlatformAuditLog
├── id                  (uuid, primary key)
├── actor_id            (foreign key → User — platform admin)
├── action              (string — e.g. "user.banned", "session.impersonated")
├── target_type         (enum: user | workspace)
├── target_id           (uuid — ID of the affected entity)
├── metadata            (jsonb — additional context, e.g. ban reason)
└── created_at          (timestamp)
```

---

## API Endpoints

All Orbit Admin endpoints require `is_platform_admin = true` on the authenticated user.

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orbit/users` | List all users (paginated) |
| GET | `/api/orbit/users/:id` | Get user detail + sessions |
| POST | `/api/orbit/users/:id/ban` | Ban a user |
| POST | `/api/orbit/users/:id/unban` | Unban a user |
| POST | `/api/orbit/users/:id/impersonate` | Start an impersonation session |
| POST | `/api/orbit/users/:id/revoke-sessions` | Revoke all sessions |

### Workspace Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orbit/workspaces` | List all workspaces (paginated) |
| GET | `/api/orbit/workspaces/:id` | Get workspace detail |
| DELETE | `/api/orbit/workspaces/:id` | Force delete workspace |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orbit/audit` | List audit trail entries (paginated, filterable) |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orbit/analytics` | Get aggregated platform analytics (signups, activation rate, feature usage, notification open rate, search usage) |

### Template Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orbit/templates` | List all built-in templates (paginated) |
| POST | `/api/orbit/templates` | Create a new built-in template |
| GET | `/api/orbit/templates/:id` | Get template detail and content |
| PATCH | `/api/orbit/templates/:id` | Update template name, description, category, or content |
| POST | `/api/orbit/templates/:id/publish` | Publish a template (sets `status = published`) |
| POST | `/api/orbit/templates/:id/unpublish` | Unpublish a template (sets `status = draft`) |
| DELETE | `/api/orbit/templates/:id` | Permanently delete a template |

---

## UI Screens

| Screen | Route | Access |
|--------|-------|--------|
| Orbit Admin Dashboard | `/orbit` | Platform admin |
| User List | `/orbit/users` | Platform admin |
| User Detail | `/orbit/users/:id` | Platform admin |
| Workspace List | `/orbit/workspaces` | Platform admin |
| Workspace Detail | `/orbit/workspaces/:id` | Platform admin |
| Built-in Template List | `/orbit/templates` | Platform admin |
| Template Editor | `/orbit/templates/new`, `/orbit/templates/:id/edit` | Platform admin |
| Template Preview | `/orbit/templates/:id/preview` | Platform admin |
| Analytics | `/orbit/analytics` | Platform admin |
| Audit Trail | `/orbit/audit` | Platform admin |

---

## Business Rules

1. Orbit Admin is accessible only to users with `is_platform_admin = true` in the database — this flag cannot be set from any in-product UI.
2. Every action performed in Orbit Admin is logged to the audit trail — the log is append-only.
3. Impersonation sessions are marked with `impersonated_by` on the session record and have a maximum 2-hour TTL. The TTL is enforced by setting `session.expires_at = now() + 2h` at creation — no sliding refresh applies. The auth guard rejects the session once `expires_at` is in the past. **Preventing Better Auth's default sliding refresh:** add a `beforeRefresh` hook in `lib/auth/` that checks `session.impersonated_by`; if set, the hook must reject the refresh (return an error or return the session unchanged with the original `expires_at`). Without this override, Better Auth will automatically extend the TTL on every request, defeating the 2-hour hard limit.
4. Banning a user immediately revokes all their active sessions — the ban takes effect with no grace period.
5. Force-deleting a workspace permanently removes all its data — this cannot be undone. Requires explicit text confirmation.
6. Platform Admins cannot see private page content — Orbit Admin only exposes private page titles for compliance.
7. Analytics data shown in Orbit Admin is aggregated — individual user browsing or content is not surfaced.

---

## Out of Scope (MVP)

- Customer support ticket management (external tool, e.g., Linear or Intercom)
- Feature flag management for product experiments
- Role-based access within Orbit Admin (all platform admins have full access)
- Multi-region data management
