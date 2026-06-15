# Permissions & Sharing

## Overview

Access control in WorkFlik operates at two levels: **workspace roles** (what a member can do across the entire workspace) and **page-level permissions** (what they can do on a specific page). These two layers combine to give precise control without complexity.

---

## User Stories

- As an Admin, I want to set a page to private so only I and invited people can see it.
- As a team lead, I want to share a page with a specific member as "Can Comment" only.
- As a user, I want to share a page via a public link so external people can view it without a login.
- As a page owner, I want to invite an external guest to a specific page without giving them workspace access.
- As an Admin, I want subpages to inherit the parent's permissions automatically.

---

## Layer 1 — Workspace Roles

Controls what a user can do at the workspace level.

| Role | Description |
|------|-------------|
| Admin | Full control — all workspace settings, all members, all non-private pages. Private pages of other members are not accessible. Only one Admin per workspace. |
| Editor | Standard member. Can create pages and edit content. Subject to page-level restrictions. |
| Viewer | Read-only. Can view pages they have been explicitly granted access to. |

**Key rule:** Workspace roles are the **ceiling** of capability. Page-level permissions can further restrict — but never expand — what a member can do on a specific page. For example, a **Viewer** can only ever be granted **Can View** on a page; they can never be given Can Comment, Can Edit, or Full Access. An **Editor** can be granted any page-level permission up to **Full Access**.

---

## Layer 2 — Page-Level Permissions

Assigned per person per page. Controls what they can do on that specific page and its subpages (via inheritance).

| Level | Read | Comment | Edit content | Manage permissions | Share externally |
|-------|------|---------|-------------|-------------------|-----------------|
| Full Access | ✅ | ✅ | ✅ | ✅ | ✅ |
| Can Edit | ✅ | ✅ | ✅ | ❌ | ❌ |
| Can Comment | ✅ | ✅ | ❌ | ❌ | ❌ |
| Can View | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Permission Resolution

**Private pages short-circuit this:** if `is_private = true`, only the page **creator** and users holding an **explicit `page_permissions` grant** for that page have access. Parent inheritance and the workspace default are **not** consulted, and workspace Admins are denied too (see Private Pages). For all non-private pages, the system resolves in this order:

1. Is the user a workspace **Admin**? → full access to all content (except private pages, see below)
2. Does the user have an explicit **page-level permission** set? → use that level
3. Does the parent page have a permission set for this user? → inherit from parent (recursive up to root)
4. Does the workspace have a **default permission** set? → use workspace default
5. No match → no access

---

## Permission Inheritance

- Subpages inherit the parent page's permissions by default
- A visual indicator shows `"Inherited"` on pages using inherited permissions
- Any page can have its own **custom permissions** that override inheritance
- Custom permissions on a subpage are fully independent of the parent's changes
- A user with **Full Access** on a page can reset its permissions back to inherited

```
📄 Engineering (Can Edit for Alice)
  └── 📄 Backend Docs (inherits → Can Edit for Alice)
        └── 📄 API Reference (custom → Can View for Alice — overrides)
```

---

## Workspace-Wide Defaults

Workspace Admins can set the default for all newly created pages:

| Default | Behavior |
|---------|---------|
| Private by default | New pages are only visible to the creator until explicitly shared |
| Shared by default | New pages are visible and editable by all workspace members (Editor+) |

**Shared by default** is the shipped default for new workspaces (`workspaces.default_page_access = 'shared'`); an Admin can switch the workspace to Private by default in Workspace Settings → General.

This setting only affects **newly created pages** — existing pages are not modified.

---

## Private Pages

Any page can be set to **Private** — visible only to its creator and explicitly invited members.

- Private pages do **not appear** in the sidebar for other members (including Admins)
- Private pages are **not returned** in workspace-wide search results — **including for Admins** (intentional privacy guarantee)
- A lock icon (🔒) appears next to private pages in the sidebar for their owner
- The WorkFlik platform team (Platform Admins) can view a list of private page **titles only** (not content) via **Orbit Admin** for compliance purposes — this is **not** available to workspace Admins

---

## Share & Permissions Panel

Accessible from:
- `"Share"` button in the top-right area of any page
- Page options menu (`···`) → `"Permissions"`

**Panel layout:**
```
┌────────────────────────────────────────────────────┐
│ Share & Permissions                          [×]   │
├────────────────────────────────────────────────────┤
│ Invite someone...                    [Can Edit ▾]  │
├────────────────────────────────────────────────────┤
│ 🌐 Public link      ○ Off  /  ● Can View  ▾       │
├────────────────────────────────────────────────────┤
│ WHO HAS ACCESS                                     │
│  🙍 Sarah (Editor)       Full Access  ▾  [Remove] │
│  🙍 Tom (Viewer)         Can View     ▾  [Remove] │
│  🔗 Inherited from: Engineering                    │
└────────────────────────────────────────────────────┘
```

**Actions:**
- Search for workspace members to invite with a role
- Change a member's access level via dropdown
- Remove a member's explicit access (they revert to inherited or no access)
- Toggle public link on/off

---

## Public Link Sharing

Share a page with anyone on the internet — no WorkFlik account required.

### How it works

1. Open Share & Permissions panel
2. Toggle `"Public link"` to **On**
3. Choose access level: `"Can View"` or `"Can Comment"`
4. A unique URL is generated — copy and share it

### Public link behavior

- Visitors see the page as a clean read-only web view (no sidebar, no workspace navigation)
- Page icon and title are visible
- **Password protection:** Not supported in Phase 1
- **Subpages:** Not automatically public — each subpage requires its own public link
- **Disabling:** Toggle off immediately revokes access. The old URL stops working.
- **Re-enabling:** A new unique URL is generated (the old URL is permanently invalidated). The new token is a cryptographically random string — use `nanoid(21)` (URL-safe, 21 chars ≈ 126 bits of entropy). The token is stored directly in `public_links.token` (plain, not hashed — it is long enough to resist brute force, and leaking the DB grants no additional access beyond what the token itself would).
- **Non-public subpage links:** If a visitor on a public page clicks a link to a subpage that has no public link enabled, they are shown a `"This page is not publicly available"` screen with a `"Sign in to WorkFlik"` button. It is never a 404 — the page exists, it is simply not shared publicly.

| Public access level | Can read | Can comment | Can edit |
|---------------------|---------|------------|---------|
| Can View | ✅ | ❌ | ❌ |
| Can Comment | ✅ | ✅ | ❌ |

---

## Guest Access

Guests are external users (not workspace members) who are invited to access specific pages by email.

### How it works

1. Open Share & Permissions panel
2. Type the external user's email address in the invite field
3. Select access level: Can View, Can Comment, or Can Edit
4. Click `"Invite"` — an invitation email is sent

The invitation link expires in **7 days**. If not accepted, the inviting user must resend.

### Guest invitation acceptance flow

1. An email is sent with a link: `GET /invite/guest/:token`
2. The server looks up the `guest_invitations` row by `token`; rejects if `expires_at` is in the past or `accepted_at` is already set.
3. If the guest has no WorkFlik account, they complete a magic-link sign-in with their invited email (auto-creates the account).
4. Once authenticated, the server creates (or upserts) a `page_permissions` row: `(page_id, user_id, access_level)` matching the invitation.
5. Sets `guest_invitations.accepted_at = now()`.
6. Redirects the guest to the shared page directly — no workspace sidebar, no onboarding wizard (per [onboarding.md](onboarding.md) business rule 4).

### Guest limitations

- Can access only the specific page(s) they were invited to
- Cannot see the workspace sidebar or navigate to other pages
- Cannot create new pages in the workspace
- Appear in @mention suggestions only on pages they have access to
- Listed separately from full members in Workspace Settings → Members
- Are **not** required to create or join a workspace — accepting a page invite takes them straight to the shared page, bypassing the onboarding wizard (see [onboarding.md](onboarding.md) business rule 4)

### Revoking guest access

Remove the guest from the page's permission list. Access is revoked immediately. No notification is sent to the guest.

---

## Orbit Admin — Platform Access

Beyond workspace-level permissions, the WorkFlik platform team uses **Orbit Admin** for cross-workspace operations. These capabilities are not available to any end user, including workspace Admins.

| Action | Purpose |
|--------|---------|
| View private page titles (not content) in any workspace | Compliance and moderation |
| View workspace membership and ownership | Support and audit |
| Override workspace Admin role | Emergency access for critical support |
| Force-revoke sessions | Security incident response |

---

## Data Model

```
PagePermission
├── id                  (uuid, primary key)
├── page_id             (foreign key → Page)
├── user_id             (foreign key → User, nullable — null if guest)
├── guest_email         (string, nullable — for guest invitations)
├── access_level        (enum: full_access | can_edit | can_comment | can_view)
├── granted_by          (user_id)
├── created_at          (timestamp)
└── updated_at          (timestamp)

Inherited permissions are **not stored** as rows — they are computed at runtime by walking up the page parent chain. The UI displays `"Inherited"` when no explicit PagePermission row exists for a user on a given page.

PublicLink
├── id                  (uuid, primary key)
├── page_id             (foreign key → Page, unique)
├── token               (string, unique — used in URL)
├── access_level        (enum: can_view | can_comment)
├── is_active           (boolean, default: false)
├── created_by          (user_id)
├── created_at          (timestamp)
└── updated_at          (timestamp)

GuestInvitation
├── id                  (uuid, primary key)
├── page_id             (foreign key → Page)
├── workspace_id        (foreign key → Workspace)
├── email               (string)
├── access_level        (enum: can_view | can_comment | can_edit)
├── token               (string, unique — invitation link token)
├── expires_at          (timestamp — 7 days from creation)
├── accepted_at         (timestamp, nullable)
├── invited_by          (user_id)
└── created_at          (timestamp)
```

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/pages/:id/permissions` | List all permissions for a page | Full Access |
| POST | `/api/pages/:id/permissions` | Add or update a member's access | Full Access |
| DELETE | `/api/pages/:id/permissions/:userId` | Remove a member's access | Full Access |
| GET | `/api/pages/:id/public-link` | Get public link status | Full Access |
| POST | `/api/pages/:id/public-link` | Enable / update public link | Full Access |
| DELETE | `/api/pages/:id/public-link` | Disable public link | Full Access |
| POST | `/api/pages/:id/guests/invite` | Invite a guest by email | Full Access |
| DELETE | `/api/pages/:id/guests/:guestId` | Revoke guest access | Full Access |
| GET | `/invite/guest/:token` | Validate token, show page preview + accept screen | Public |
| POST | `/invite/guest/:token/accept` | Accept guest invitation, create `page_permissions` row | Authenticated |

---

## UI Screens

| Screen | Route / Location | Access |
|--------|----------------|--------|
| Share & Permissions panel | Modal on every page (Share button) | Full Access |
| Workspace Settings — Members | `/settings/members` | Admin |

---

## Business Rules

1. Workspace roles are the **ceiling** of permissions — page-level permissions can restrict but never expand a member's workspace role. (A Viewer is read-only on every page; an Editor can be granted up to Full Access.) **Enforcement point:** the `POST /api/pages/:id/permissions` handler and its equivalent server action must look up the target user's `workspace_members.role` before writing the `page_permissions` row, and cap `access_level` to: `can_view` if Viewer, `can_edit` if Editor, any level if Admin. If the submitted `access_level` exceeds the ceiling, silently downgrade it to the ceiling value and return the downgraded `access_level` in the response so the UI can reflect the actual grant.
2. A workspace Admin has implicit access to all non-private pages, regardless of page-level settings.
3. Private pages are completely hidden from all other users — Admins cannot discover private page content through any in-product UI.
4. Subpages inherit the parent's permissions by default unless the subpage has custom permissions explicitly set.
5. Disabling a public link immediately revokes access. Re-enabling generates a new, different URL — the old URL is permanently inactive.
6. Guest invitations expire after 7 days. After expiry, the guest cannot accept and a new invite must be sent.
7. A guest can only access the specific page(s) they were invited to — no other workspace content is visible.
8. Removing a member from a page revokes their explicit access. They fall back to inherited permissions from the parent, or no access if none applies.
9. Only users with **Full Access** on a page can manage that page's permissions, share it externally, or set it to private.
10. Guest invitation emails are normalized to **lowercase** before processing and storage. Duplicate invitations (same lowercased email + same page) are rejected with `409 Conflict` if an unexpired, unaccepted `guest_invitations` row already exists for that email+page, or if a `page_permissions` row already exists for a user with that email. A workspace member cannot use their own registered email address as a guest invite target.

---

## Out of Scope (MVP)

- Password-protected public links (Phase 2)
- Per-page guest invitation link (instead of email-only)
- Public link view count analytics
- Page permission audit log / history
- Block-level permissions (different access levels for different blocks within a page)
- Custom roles beyond Admin / Editor / Viewer
- SSO / SAML-based access (Phase 3)
