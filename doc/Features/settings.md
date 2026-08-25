# Settings

## Overview

Settings is the centralized control surface for a user's personal preferences and for workspace-level configuration (Admin only). It is organized into two scopes — **Account** (per-user, global) and **Workspace** (per-workspace, Admin-restricted) — and accessed from the sidebar gear icon or the user avatar menu.

**Cross-references:** Authentication tokens and session lifecycle → [authentication.md](authentication.md) · Member roles and access levels → [permissions.md](permissions.md) · Notification delivery → [notifications.md](notifications.md) · File upload limits → [file-storage.md](file-storage.md) · Sidebar and navigation preferences → [navigation.md](navigation.md) · Orbit admin panel → [admin-panel.md](admin-panel.md).

> **Sidebar preferences** (width, collapsed state, last visited workspace) are managed implicitly via navigation interactions — drag to resize, click to collapse — and are not exposed as a Settings UI page. Their data model and APIs are documented in this file under Data Model and API Endpoints for completeness.

---

## User Stories

- As a user, I want to update my display name, avatar, and timezone so my profile is accurate.
- As a user, I want to view and revoke active sessions so I can secure my account.
- As a user, I want to control how often I receive notification emails so my inbox isn't flooded.
- As a member, I want to see who else is in my workspace so I know who to collaborate with.
- As an Admin, I want to change the workspace name, icon, and URL slug to match our branding.
- As an Admin, I want to invite new team members by email or via a shareable link.
- As an Admin, I want to change a member's role or remove them from the workspace.
- As an Admin, I want to see total storage consumption so I know when we're approaching limits.
- As an Admin, I want to transfer workspace ownership to another member before I leave.
- As an Admin, I want to delete the workspace when it is no longer needed.

---

## Settings Navigation

Settings is a modal sheet (or dedicated page on small screens) with a left-hand nav sidebar and a main content area. It opens in the context of the currently active workspace; switching workspaces while Settings is open closes Settings and reopens it for the new workspace.

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙ Settings                                        [✕ Close] │
├──────────────────┬──────────────────────────────────────────┤
│  ACCOUNT         │                                          │
│  ▸ My Profile    │   (section content renders here)         │
│    Sessions      │                                          │
│    Notifications │                                          │
│                  │                                          │
│  WORKSPACE       │                                          │
│    General  🔒   │   (🔒 = Admin only; lock icon in nav)    │
│    Members       │                                          │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

- **ACCOUNT** sections are visible and editable by all authenticated users.
- **WORKSPACE › Members** is visible to all workspace members — non-Admins see a read-only member directory with no action menus.
- **WORKSPACE › General** is Admin-only; non-Admins see a lock icon in the nav and a "Contact your Admin" placeholder if they navigate directly.
- Navigating away (close button or `Esc`) discards unsaved draft changes with a confirm dialog if a form is dirty.

---

## Section 1 — My Profile

**Route:** `/settings/account`
**Access:** Authenticated user (personal, not workspace-scoped)

### Fields

| Field | Type | Rules |
|-------|------|-------|
| Display Name | Text input | Required. 1–100 characters. Shown in sidebar, comments, sharing UI, and member cards. |
| Avatar | Image upload | Square image, max 1 MB, JPEG / PNG / WebP. Falls back to auto-generated initials monogram if not set. |
| Role / Title | Text input | Optional. Free text, max 80 characters (e.g., "Head of Product"). Shown on member hover cards in the workspace. |
| Timezone | Dropdown | IANA timezone list. Auto-detected from the browser on first sign-in. Controls digest email send time. |
| Email | Read-only display | The email address used for magic-link sign-in. Cannot be changed — email is the user's permanent identity. Contact platform support for email migration. |

### Behaviors

- **Auto-save on blur** — each editable field saves independently on focus-out; no submit button needed.
- **Avatar upload** — clicking the avatar circle opens a file picker; the new image is uploaded via pre-signed S3 PUT (see [file-storage.md](file-storage.md)) and the URL is stored in `users.image`. Cropping to square is done client-side before upload.
- **Initials fallback** — when no avatar is set, the system renders the first letter(s) of the display name on a deterministic background color derived from `user_id`.
- **Timezone** — used exclusively for digest email delivery timing (`8:00 AM local`). Never exposed in shared or public views.
- **Email is immutable** — the field renders as text with a lock icon and a tooltip: "Your email is your sign-in identity and cannot be changed." No edit affordance is shown.

### Danger Zone — Delete Account

- Separate collapsible section at the bottom of the page.
- **Pre-condition:** If the user is the sole Admin of any workspace, they must transfer ownership first. A banner lists the affected workspaces with deep-links to the Members settings for each.
- **Confirmation flow:** Enter account email address in a text field → click "Permanently delete my account".
- **Effects:** Better Auth revokes all sessions; the user row is soft-deleted; owned private pages are soft-deleted (appear in trash for 7 days before the pg-boss cleanup job purges them); all other content (comments, blocks, page authorship) remains with author FK set to NULL, rendered as "Former Member".

---

## Section 2 — Sessions

**Route:** `/settings/sessions`
**Access:** Authenticated user

### Session List

Each active session is a card showing:

```
┌──────────────────────────────────────────────────────────────┐
│  💻 macOS · Chrome · San Francisco, CA          [Revoke]    │
│     Last active: 2 hours ago  ●  This session               │
├──────────────────────────────────────────────────────────────┤
│  📱 iOS · Safari · New York, NY                 [Revoke]    │
│     Last active: Yesterday                                   │
├──────────────────────────────────────────────────────────────┤
│  💻 Windows · Firefox · London, UK              [Revoke]    │
│     Last active: 5 days ago                                  │
├──────────────────────────────────────────────────────────────┤
│  💻 macOS · Chrome · [Platform Admin]     ⚠ Impersonated    │
│     Last active: 10 minutes ago                              │
└──────────────────────────────────────────────────────────────┘
                               [Revoke all other sessions]
```

| Column | Source |
|--------|--------|
| Device type | Parsed from `user_agent` (mobile / desktop / tablet) |
| OS + Browser | Parsed from `user_agent` |
| Location | Resolved from `ip_address` (city + country) |
| Last active | Relative timestamp from `sessions.updated_at` |
| "This session" badge | Matched by current session token |
| "⚠ Impersonated" badge | Shown when `sessions.impersonated_by` is non-null; cannot be revoked by the user |

### Actions

| Action | Behavior |
|--------|----------|
| **Revoke** (individual) | Calls `POST /api/auth/revoke-session`; removes that session row; user on that device is signed out immediately on next request. Cannot revoke the current session from this button. Cannot revoke an impersonated session. |
| **Revoke all other sessions** | Calls `POST /api/auth/revoke-other-sessions`; all sessions except the current one are deleted. Requires no extra confirmation. Impersonated sessions are excluded. |

### Security Notes

- Sessions have a **7-day sliding TTL** managed by Better Auth — each use of a session token renews the expiry. Idle sessions expire automatically without any user action. The session list shows only non-expired sessions.
- Impersonated sessions (created by platform Admins via Orbit) expire automatically after **2 hours** regardless of activity and are listed with a warning badge.

---

## Section 3 — Notifications

**Route:** `/settings/notifications`
**Access:** Authenticated user

### Preferences

| Setting | Options | Default |
|---------|---------|---------|
| Email frequency | Real-time · Daily digest · Weekly digest · Off | Daily digest |
| Weekly digest day | Monday · Tuesday · Wednesday · Thursday · Friday · Saturday · Sunday | Monday |

- The "Weekly digest day" selector is **only visible** when "Weekly digest" is selected as the frequency.
- Changes take effect from the **next delivery cycle** — a user switching from Daily to Weekly at 9 AM on Wednesday will receive their first weekly digest on the configured day of the following week.
- "Off" disables all email delivery; in-app notifications and toasts continue to work normally.

> Full notification trigger list and delivery rules: [notifications.md](notifications.md).

---

## Section 4 — Workspace General

**Route:** `/settings/general`
**Access:** Workspace Admin only

### Workspace Identity

| Field | Type | Rules |
|-------|------|-------|
| Workspace Name | Text input | Required. 1–80 characters. |
| Icon | Emoji picker or image upload | Emoji (any standard emoji) or square image max 1 MB (kind: `workspace_icon`). Shown in the sidebar switcher and browser tab. |
| URL Slug | Text input | Required. 3–40 characters, lowercase, alphanumeric + hyphens only. Must be unique across all workspaces. Changing this invalidates old share links. |

- Changes are applied on save (single "Save changes" button for this group).
- Slug change shows a warning: "All existing share links will break. Users will be redirected for 30 days via a server-side 308 redirect from the old slug."
- **Implementation:** when the slug is saved, the handler inserts a `workspace_slug_redirects` row with the previous slug **in the same transaction** as the `workspaces.slug` update. A Next.js middleware (or catch-all route `GET /[old-slug]/[[...path]]`) looks up `workspace_slug_redirects.old_slug`, resolves the current `workspaces.slug`, and responds with `308 Permanent Redirect` to the new path. Rows are retained for 30 days; after that the URL returns 404.

### Default Page Access

Controls the default sharing behavior when any new page is created in this workspace.

| Option | Behavior |
|--------|----------|
| **Shared** (default) | New pages inherit workspace-member access. All workspace members can view immediately. |
| **Private** | New pages start private (visible only to creator). Creator must explicitly share each page. |

- This setting affects **new pages only**. Existing pages are not changed.
- Stored as `workspaces.default_page_access` (enum: `shared` | `private`).

### Storage Usage

All workspace members see the aggregate storage bar. Admins see the full per-category breakdown.

```
Storage used by this workspace

███████████████░░░░░░░░░░░  3.2 GB / 5 GB  (64%)

  File blocks (images, PDFs, video)   1.8 GB   ← kind: block_media
  Page covers                         0.9 GB   ← kind: page_cover
  Page icons                          0.4 GB   ← kind: page_icon
  Workspace icon                      0.1 GB   ← kind: workspace_icon
```

> **User avatars are not workspace storage.** `file_uploads` rows with `kind = user_avatar` have `workspace_id = null` — they are user-scoped, not workspace-scoped, and are **exempt** from the 5 GB workspace quota. They are not shown in this breakdown.

- Usage is read from `workspace_storage_usage.bytes_used`, updated transactionally on every confirmed upload and deletion.
- Four `file_upload.kind` values count toward the workspace quota: `block_media`, `page_cover`, `page_icon`, `workspace_icon`.
- At **≥ 90 % capacity**: a yellow warning banner appears at the top of the General tab and in the workspace sidebar for all members.
- At **100 % capacity**: new uploads are blocked. Members see "Storage full — contact your Admin." The Admin sees the same message plus a breakdown of where space is being used.

### Danger Zone

Collapsible section at the bottom of the General page.

#### Delete Workspace

- **Pre-condition:** Must be the only Admin, or transfer ownership first. (The transfer button is deep-linked from here.)
- **Confirmation flow:** Type the exact workspace name in a text field → click "Delete this workspace".
- **Effects:** All pages, blocks, comments, members, and files are hard-deleted asynchronously via a `delete-workspace` pg-boss job. The job cancels all pending jobs scoped to that workspace. The workspace URL becomes a 404 immediately.

---

## Section 5 — Members

**Route:** `/settings/members`
**Access:** All workspace members (read-only for non-Admins; full management for Admins)

### Member List — All Members View

All members (Admin and non-Admin) can see the full member directory. Non-Admins see the list without action menus.

```
┌─────────────────────────────────────────────────────────────────┐
│  Members (12)                              [+ Invite members]   │
│  (Invite button shown to Admins only)                           │
├─────────────────────────────────────────────────────────────────┤
│  [Avatar] Alice Chen     alice@corp.com   Admin    Jun 2025 [⋯] │
│  [Avatar] Bob Park       bob@corp.com     Editor   Jan 2026 [⋯] │
│  [Avatar] Carol Davis    carol@corp.com   Viewer   Mar 2026 [⋯] │
│  ...                                                            │
├─────────────────────────────────────────────────────────────────┤
│  Pending Invitations (2)          (visible to Admins only)      │
├─────────────────────────────────────────────────────────────────┤
│  dana@startup.com                          Editor  [Cancel]     │
│  evan@startup.com                          Viewer  [Cancel]     │
└─────────────────────────────────────────────────────────────────┘
```

**Columns (all members can see):** Avatar · Display name · Email · Role badge · Joined date (month + year) · Actions menu `[⋯]` (Admins only)

**Pending Invitations section** is shown to Admins only.

### Admin Actions (per member)

| Action | Condition |
|--------|-----------|
| Change role → Admin / Editor / Viewer | Not applicable to self; cannot change the sole Admin's role |
| Remove from workspace | Not applicable to self; cannot remove the sole Admin |
| Transfer ownership | Only shown on other members → promotes them to Admin, demotes self to Editor |

### Invite Members

**Trigger:** "+ Invite members" button (Admin only).

**Modal:**

```
┌───────────────────────────────────────────────────────────────┐
│  Invite to [Workspace Name]                              [✕]  │
│                                                               │
│  Email addresses                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  dana@startup.com ×   evan@startup.com ×   _          │   │
│  └───────────────────────────────────────────────────────┘   │
│  Add multiple emails separated by comma or Enter              │
│                                                               │
│  Role for all invitees                                        │
│  ○ Admin   ● Editor (default)   ○ Viewer                      │
│                                                               │
│  Personal message (optional)                      0/300       │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                        [Cancel]  [Send invite]│
└───────────────────────────────────────────────────────────────┘
```

- Each email is validated as the user types (format check only).
- Up to **20 emails** can be invited in a single batch.
- Invalid-format or already-active-member emails are flagged inline with a red chip. Already-pending emails show a yellow chip ("Already invited").
- On submit: a `workspace_invite` notification + invite email is enqueued per recipient via pg-boss (`send-workspace-invite` job). Pending invitations appear in the Pending section until accepted or cancelled.
- Invite emails expire in **7 days**. Resend is available from the pending row.

### Invite Link

Below the member list (Admin only):

```
┌──────────────────────────────────────────────────────────────┐
│  Invite link                                                 │
│  Anyone with this link can join as Editor                    │
│                                                              │
│  https://pagevo.app/invite/abc123def456  [Copy] [Disable]  │
│                                            [Regenerate]      │
└──────────────────────────────────────────────────────────────┘
```

| Action | Behavior |
|--------|----------|
| **Copy** | Copies link to clipboard |
| **Disable** | Calls `DELETE /api/workspaces/:id/invite-link`; link becomes invalid immediately; new joiners see a 410 Gone |
| **Regenerate** | Issues new token, old link is invalidated; requires confirmation dialog |
| **Enable** (when disabled) | Calls `POST /api/workspaces/:id/invite-link` to create a new link |

- All members joining via link are assigned the **Editor** role in Phase 1. The role is stored as `workspaces.invite_link_role` (default `editor`) but the UI does not expose configuration — configurable invite-link roles are Phase 2.
- New members who join via link bypass the workspace creation step of onboarding (they are already in a workspace).

### Invite Link Acceptance Flow (Invited User)

When a user clicks an invite link or an email invite link:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│         You've been invited to join                          │
│                                                              │
│         [Workspace Icon]  Engineering Team                   │
│                                                              │
│         12 members · Created June 2025                       │
│                                                              │
│         [  Accept invitation  ]                              │
│         [  Decline            ]                              │
│                                                              │
│  You'll join as Editor. Sign in first if not already.        │
└──────────────────────────────────────────────────────────────┘
```

- If not signed in: user is redirected to `/sign-in`, then returned to the invite acceptance screen after magic-link verification.
- If already signed in: the acceptance screen shows immediately.
- If the link is expired or already used: a 410 page is shown with "This invite link has expired. Ask your Admin for a new one."
- On accept: member row is created, the inviting Admin receives a `guest_accepted` notification (for email invites), and the user is redirected to the workspace.

### Transfer Ownership

- Appears in the `[⋯]` menu of any non-self member (Admin only).
- **Flow:** Select member → confirm dialog: "Transfer Admin to [Name]? You will become an Editor." → **email confirmation link** sent to the current Admin → click link to complete transfer.
- The transfer is atomic: both role updates happen in a single transaction. There is always exactly one Admin per workspace.
- If the workspace has only one Admin and they want to leave, they must transfer first.

---

## Data Model

```
User
├── id                   (uuid, primary key)
├── name                 (string — display name)
├── email                (string, unique — immutable magic-link identity)
├── image                (string — avatar CDN URL, nullable)
├── job_title            (string — free-text role/title, nullable, max 80 chars)
├── timezone             (string — IANA tz for digest delivery, nullable)
├── email_verified       (boolean)
├── is_platform_admin    (boolean, default false)
├── banned               (boolean, default false)
├── banned_reason        (string, nullable)
├── ban_expires          (timestamp, nullable)
├── onboarding_completed (boolean)
├── onboarding_step      (integer, 0–4)
├── tour_completed       (boolean)
├── last_active_at       (timestamp, nullable)
├── created_at           (timestamp)
└── updated_at           (timestamp)

Session
├── id               (uuid, primary key)
├── user_id          (FK → User)
├── token            (string, unique, hashed)
├── expires_at       (timestamp — 7-day sliding TTL, renewed on each use by Better Auth)
├── ip_address       (string, nullable)
├── user_agent       (string, nullable)
├── impersonated_by  (FK → User, nullable — set when Orbit Admin impersonates; 2-hour TTL)
├── created_at       (timestamp)
└── updated_at       (timestamp)

NotificationPreference
├── user_id           (FK → User, unique)
├── email_frequency   (enum: realtime | daily | weekly | off, default: daily)
├── weekly_digest_day (integer — 0=Sunday … 6=Saturday, default: 1)
└── updated_at        (timestamp)

UserPreferences        ← global per-user, not workspace-scoped; managed via navigation interactions
├── user_id           (FK → User, unique)
├── last_workspace_id (FK → Workspace, nullable — for post-login redirect)
├── sidebar_width     (integer — pixels, default: 240, range: 200–480)
├── sidebar_collapsed (boolean, default: false)
└── updated_at        (timestamp)

UserHintState          ← tracks dismissed onboarding hints; managed via onboarding/feature hints
├── id           (uuid, primary key)
├── user_id      (FK → User)
├── hint_key     (string — e.g., "database_view_tour", "share_panel_hint")
├── dismissed_at (timestamp)
└── UNIQUE (user_id, hint_key)

UserFavorite           ← workspace-scoped; managed via navigation sidebar star actions
├── id            (uuid, primary key)
├── user_id       (FK → User)
├── page_id       (FK → Page)
├── workspace_id  (FK → Workspace)
├── order_index   (integer, default: 0 — for manual reordering)
├── created_at    (timestamp)
└── UNIQUE (user_id, page_id)

UserRecentlyVisited    ← workspace-scoped; managed automatically on page navigation
├── id           (uuid, primary key)
├── user_id      (FK → User)
├── workspace_id (FK → Workspace)
├── page_id      (FK → Page)
├── visited_at   (timestamp)
└── UNIQUE (user_id, page_id)

Workspace                  ← invite link fields are columns here, not a separate table
├── id                  (uuid, primary key)
├── name                (string)
├── slug                (string, unique)
├── icon                (string — emoji or image CDN URL, nullable)
├── default_page_access (enum: shared | private, default: shared)
├── invite_link_token   (string, unique, nullable — null when link has never been created)
├── invite_link_active  (boolean, default: false)
├── invite_link_role    (enum: admin | editor | viewer, default: editor — stored but UI hardcodes editor in Phase 1)
├── created_by          (FK → User)
├── created_at          (timestamp)
└── updated_at          (timestamp)

WorkspaceMember            ← per-email invitation fields are columns here, not a separate table
├── id            (uuid, primary key)
├── workspace_id  (FK → Workspace)
├── user_id       (FK → User, nullable — null while invite is pending)
├── role          (enum: admin | editor | viewer, default: editor)
├── status        (enum: active | invited)
├── invited_email (string, nullable — email the invite was sent to)
├── invite_token  (string, unique, nullable — hashed; used by the email invite link)
├── invite_expires (timestamp, nullable — 7 days from invite send)
├── invited_by    (FK → User, nullable)
├── joined_at     (timestamp, nullable — null until invite accepted)
└── created_at    (timestamp)

WorkspaceStorageUsage
├── workspace_id (FK → Workspace, primary key)
├── bytes_used   (bigint, default: 0)
└── updated_at   (timestamp)
```

---

## API Endpoints

### Account — Profile

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/auth/get-session` | Get current session + user | Authenticated |
| PATCH | `/api/user/profile` | Update name, image, job_title, timezone | Authenticated |
| DELETE | `/api/user/account` | Delete own account (requires email confirmation) | Authenticated |

### Account — Sessions

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/auth/list-sessions` | List all active sessions | Authenticated |
| POST | `/api/auth/revoke-session` | Revoke a specific session by ID | Authenticated |
| POST | `/api/auth/revoke-other-sessions` | Revoke all sessions except current | Authenticated |

### Account — Notifications

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/user/notification-preferences` | Get email frequency + digest day | Authenticated |
| PATCH | `/api/user/notification-preferences` | Update email frequency / digest day | Authenticated |

### Per-User State (managed by Navigation & Onboarding, not Settings UI)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/user/preferences` | Get sidebar width, collapsed state, last workspace | Authenticated |
| PATCH | `/api/user/preferences` | Update sidebar width / collapsed / last_workspace_id | Authenticated |
| GET | `/api/user/hints` | List dismissed hint keys | Authenticated |
| POST | `/api/user/hints/:key/dismiss` | Dismiss a contextual hint by key | Authenticated |
| PATCH | `/api/user/onboarding` | Update onboarding step / mark completed | Authenticated |
| GET | `/api/user/favorites` | List favorite pages for current workspace | Authenticated |
| POST | `/api/user/favorites` | Add page to favorites | Authenticated |
| DELETE | `/api/user/favorites/:pageId` | Remove page from favorites | Authenticated |
| PATCH | `/api/user/favorites/reorder` | Reorder favorites | Authenticated |
| GET | `/api/user/recently-visited` | Get last 10 recently visited pages for current workspace | Authenticated |
| POST | `/api/user/recently-visited` | Record a page visit | Authenticated |

### Workspace — General

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/workspaces/:id` | Get workspace details (name, icon, slug, storage bar) | Member |
| PATCH | `/api/workspaces/:id` | Update name / icon / slug / default_page_access | Admin |
| DELETE | `/api/workspaces/:id` | Delete workspace (enqueues delete-workspace job) | Admin |
| GET | `/api/workspaces/:id/storage` | Get storage usage aggregate + per-category breakdown | Admin |

### Workspace — Members

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/workspaces/:id/members` | List active members + (Admin only) pending invitations | Member |
| POST | `/api/workspaces/:id/members/invite` | Invite one or more members by email | Admin |
| PATCH | `/api/workspaces/:id/members/:userId` | Change member role | Admin |
| DELETE | `/api/workspaces/:id/members/:userId` | Remove member from workspace | Admin |
| POST | `/api/workspaces/:id/transfer` | Initiate ownership transfer (sends email confirmation link to current Admin) | Admin |
| GET | `/api/workspaces/:id/transfer/confirm` | Validate confirmation token and complete transfer atomically | Admin (via link) |
| POST | `/api/workspaces/:id/invitations/:inviteId/resend` | Resend invite email | Admin |
| DELETE | `/api/workspaces/:id/invitations/:inviteId` | Cancel pending invitation | Admin |

### Workspace — Invite Link

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/workspaces/:id/invite-link` | Get current invite link status (token + is_active) | Admin |
| POST | `/api/workspaces/:id/invite-link` | Create / regenerate invite link | Admin |
| DELETE | `/api/workspaces/:id/invite-link` | Disable invite link | Admin |
| GET | `/invite/:token` | Validate token, show workspace preview + accept screen | Public |
| POST | `/invite/:token/accept` | Accept invite link, join workspace as Editor | Authenticated |

---

## UI Screens

| Screen | Route | Access |
|--------|-------|--------|
| My Profile | `/settings/account` | All authenticated users |
| Sessions | `/settings/sessions` | All authenticated users |
| Notification Preferences | `/settings/notifications` | All authenticated users |
| Workspace General | `/settings/general` | Admin only |
| Workspace Members | `/settings/members` | All members (read-only for non-Admins) |
| Invite acceptance | `/invite/:token` | Public (sign-in required to accept) |

---

## Background Jobs

| Job | Trigger | Description |
|-----|---------|-------------|
| `send-workspace-invite` | Admin sends email invite | Sends invite email with 7-day expiry token via Nodemailer; retries up to 3× with exponential backoff |
| `delete-workspace` | Admin confirms workspace deletion | Hard-deletes all workspace data (pages, blocks, files, members) asynchronously; cancels all pending workspace-scoped jobs |
| `notify-storage-threshold` | Daily cron | Sends an email to all workspace Admins when storage crosses 90 % for the first time in a billing cycle |
| `expire-invitations` | Daily cron | Sets `workspace_members.status = 'expired'` for rows where `status = 'invited'` and `invite_expires < NOW()` — audit cleanup only; tokens already return 410 based on the timestamp check. Rows are retained (not deleted) for audit history. |

---

## Business Rules

1. **One Admin per workspace at all times.** The sole Admin cannot be removed or have their role changed. They must transfer ownership first.
2. **Ownership transfer requires email confirmation** from the current Admin. The transfer is atomic — both role changes happen in one transaction.
3. **Email is the user's immutable identity.** It is the magic-link sign-in credential and cannot be changed via the Settings UI. Display name, avatar, and job title can be changed freely.
4. **Slug changes invalidate share links.** A 308 redirect from the old slug is served for 30 days to ease the transition.
5. **Invite links grant Editor role in Phase 1.** The role is stored in `workspaces.invite_link_role` (default `editor`) but the UI does not expose configuration — configurable roles are Phase 2.
6. **Invite emails expire in 7 days.** After expiry the invite token returns 410 Gone. The Admin must resend. The `workspace_members` row has its `status` set to `expired` (by the `expire-invitations` daily job) and is retained for audit history — it is never deleted.
7. **Regenerating or disabling the invite link immediately invalidates the old token.** Anyone who clicks an old link sees a 410.
8. **Storage quota is 5 GB per workspace.** Four upload kinds count toward it: `block_media`, `page_cover`, `page_icon`, `workspace_icon`. **`user_avatar` uploads are user-scoped (`workspace_id = null`) and are exempt from the workspace quota.** Uploads are blocked at 100 %. The quota check is enforced server-side before a pre-signed URL is issued (see [file-storage.md](file-storage.md)).
9. **Account deletion requires ownership transfer** if the user is the sole Admin of any workspace. The UI blocks deletion and lists the affected workspaces with deep-links.
10. **Session revocation takes effect immediately.** The next API request from a revoked session returns 401.
11. **Impersonated sessions expire after 2 hours** regardless of activity. They appear with a warning badge in the session list and cannot be revoked by the account owner.
12. **Notification preference changes take effect from the next delivery cycle** — not retroactively.
13. **Default page access affects new pages only.** Existing pages are not retroactively changed when the setting is toggled.
14. **All members can view the member directory.** Non-Admins see name, email, role, and joined date. Only Admins see pending invitations and action menus (change role, remove, transfer ownership).
15. **Pending invitation emails are shown only to Admins.** Non-Admin members cannot see who has been invited but not yet joined.
16. **The per-user state APIs** (`/api/user/preferences`, `/api/user/hints`, `/api/user/favorites`, `/api/user/recently-visited`) are managed implicitly by the app (navigation, onboarding), not via the Settings UI. They are authenticated endpoints with the same session guard as all other `/api/user/*` routes.

---

## Out of Scope (Phase 1 / MVP)

- SSO / SAML integration (Phase 4)
- SCIM provisioning (Phase 4)
- Per-event granular notification controls — e.g., "off for comment replies, on for @mentions" (Phase 2)
- Audit log visible to workspace Admins — platform-team only via Orbit (Phase 3 for workspace-level audit)
- Workspace-level storage increase / paid plan upgrade (Phase 3)
- Custom email domain for invite and notification emails (Phase 4)
- 2FA / TOTP — Better Auth plugin is available, deferred (Phase 2)
- Export all workspace data as a ZIP archive (Phase 2)
- Member directory search / filter — relevant once teams exceed ~15 members (Phase 2)
- Configuring a role for the shareable invite link (Phase 2 — currently hardcoded to Editor)
- Per-member notification muting — "only notify me about pages I created" (Phase 2)
- Resetting dismissed hints or replaying the onboarding tour from Settings (Phase 2)
