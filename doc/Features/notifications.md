# Notifications

## Overview

Notifications keep users informed about activity that involves them — @mentions, replies to their comments, and changes to pages they care about. WorkFlik delivers notifications in-app in real time and via email on a configurable schedule.

**Powered by:** pg-boss (PostgreSQL-backed job queue) for delivery and scheduling; **Server-Sent Events (SSE)** for real-time in-app push — no Redis or separate message broker needed.

---

## User Stories

- As a team member, I want to be notified when someone @mentions me so I can respond quickly.
- As a comment author, I want to know when someone replies to my thread.
- As a page creator, I want to be alerted when a teammate leaves a comment on my page.
- As a user, I want to choose between real-time email and a daily digest so I'm not overwhelmed.
- As a user, I want to see all my unread notifications in one place without leaving the page.

---

## Notification Triggers

| Event | Who is notified | `notification_type` |
|-------|----------------|---------------------|
| @mention in a comment | Mentioned user | `mention` |
| @mention in page content | Mentioned user | `mention` |
| New comment on a page you created | Page creator | `comment` |
| Reply in a thread you participated in | All prior thread participants | `reply` |
| Comment thread resolved | All prior thread participants | `resolved` |
| Comment thread reopened | All prior thread participants | `reopened` |
| You are added to a workspace | New member | `workspace_invite` |
| You are granted access to a page | The user who was granted access | `access_granted` |
| A guest invite you sent is accepted | The inviting user | `guest_accepted` |
| A trashed page is 3 days from permanent deletion | The user who deleted the page and the page creator | `trash_warning` |

> The table has **ten trigger rows** but only **nine `notification_type` enum values** — because both "@mention in a comment" and "@mention in page content" produce `type = 'mention'`. They differ only in where the mention occurs (comment vs block), but the notification row stores the same type. The `source_id` field (pointing to the comment or block) distinguishes them in the UI.

> **`comment` notifications fire only for the page creator**, not for all members who have access to the page. Members who want to follow a page's comments must be mentioned or reply to a thread. Per-page notification subscriptions are deferred to Phase 2.

---

## In-App Notification Center

**Opening:**
- Click the 🔔 bell icon in the sidebar
- Keyboard shortcut: `Ctrl+Shift+N` / `Cmd+Shift+N`
- Panel slides in from the right side of the screen

**Panel layout:**
```
┌─────────────────────────────────────────────┐
│ Notifications            [Mark all read]    │
│ [All ▾]  [Mentions]  [Comments]  [Updates]  │
├─────────────────────────────────────────────┤
│ ● [Avatar] Sarah mentioned you              │
│   Meeting Notes · Engineering               │
│   "...review the @You section before..."    │
│   2h ago                          [✓ Read] │
├─────────────────────────────────────────────┤
│   [Avatar] Tom replied to your comment      │
│   Sprint Board · Product                    │
│   "Sounds good, let's go with that."        │
│   Yesterday                       [✓ Read] │
├─────────────────────────────────────────────┤
│   [Avatar] System                           │
│   You've been added to Engineering Space    │
│   3 days ago                      [✓ Read] │
└─────────────────────────────────────────────┘
```

---

## Notification Card

Each notification shows:
- **Sender avatar** + name (or "System" for automated events)
- **Summary line** — one sentence describing what happened
- **Location path** — breadcrumb to the page (e.g., `Engineering > Sprint Board`)
- **Content snippet** — up to 100 characters of relevant content (highlighted mention or comment text)
- **Timestamp** — relative (e.g., "2h ago", "Yesterday", "Jun 3")
- **Unread indicator** — blue dot on the left for unread notifications
- **Hover actions** — `"Go to source"` (navigates and highlights the relevant block), `"Mark as read"`

---

## Notification Filters

| Filter | Shows |
|--------|-------|
| All | All notifications (default) |
| Mentions | Only @mention notifications |
| Comments | Comment, reply, and resolution events |
| Updates | Access grants, workspace invites, guest-invite acceptances, trash auto-deletion warnings |

---

## Read / Unread State

- Notifications are **unread by default** (blue dot)
- Clicking a notification marks it as read and navigates to the source
- `"Mark as read"` button marks individually without navigating
- `"Mark all as read"` button in the header clears all unread in one click
- The bell icon badge shows unread count:
  - 0 → no badge
  - 1–99 → exact number
  - 100+ → `99+`

---

## Real-Time Toast

When a notification arrives while the user is active in the app, a toast appears in the bottom-right corner.

```
┌────────────────────────────────────────────┐
│ [Avatar] Sarah — Meeting Notes             │
│ "Can you review the intro section @You"    │
│                              [View →]      │
└────────────────────────────────────────────┘
```

- Auto-dismisses after **5 seconds**
- Multiple notifications within 5 seconds are batched: `"3 new notifications"`
- Clicking `"View →"` opens the notification center and the source page

Real-time delivery via **Server-Sent Events (SSE)** while the user is active. If the user is offline or the tab is inactive, notifications are queued and delivered on next notification center open.

> **Deployment note:** The SSE stream (`GET /api/notifications/stream`) is a long-lived HTTP connection and must run on a host that supports persistent connections — **Railway** or any VM/long-lived Node server. Vercel serverless functions cap function/stream duration (≈10–300s depending on plan) and will terminate the connection, so the stream route should not be deployed as a standard serverless function. The client uses the browser's native `EventSource`, which **auto-reconnects** on drop; if the stream is unavailable, the client falls back to polling `GET /api/notifications` and the Notification Center remains the durable source of truth (see business rule 8). Decide the hosting target for this route before building real-time delivery.

---

## Email Notifications

### Frequency Options

| Option | Description |
|--------|-------------|
| Real-time | One email per event, sent immediately |
| Daily digest | One digest email each morning (default) |
| Weekly digest | One digest email on a configurable day |
| Off | No email — in-app and toast only |

**Default:** Daily digest.

### Timezone

- Digest emails are delivered at 8:00 AM in the user's local timezone
- Timezone is set in Account Settings or auto-detected from the browser on first sign-up
- Changes take effect from the next scheduled delivery

### Daily / Weekly Digest Format

```
Subject: Your WorkFlik activity for Wednesday, Jun 4

== Meeting Notes (Engineering) ==
  → Sarah: "@You can you review before Friday?"
  → Tom replied to your comment: "Will do, thanks!"

== Sprint Board (Product) ==
  → Alex mentioned you: "Assigned to @You per yesterday's discussion"

───────────────────────────────────
View all notifications →  |  Manage email settings →
```

**Rules:**
- Only **unread** notifications are included
- Notifications already read in-app are excluded from the digest
- Empty digests (no unread activity) are not sent
- Notifications are grouped by page

### Real-time Email

- Sent immediately when the triggering event occurs
- One email per notification (not batched)
- Uses the same content as the digest but with a single notification

---

## Notification Preferences

Available at `/settings/notifications`

| Setting | Options |
|---------|---------|
| Email frequency | Real-time / Daily digest / Weekly digest / Off |
| Weekly digest day | Monday / Tuesday / Wednesday / Thursday / Friday / Saturday / Sunday |

Phase 1: global frequency setting only. Granular per-event-type control is a Phase 2 feature.

---

## Notification Retention

- Notifications are retained for **90 days**
- Read notifications older than 30 days are shown greyed out / muted in the panel
- Nightly pg-boss cleanup job permanently deletes notifications older than 90 days
- No manual export or archive in Phase 1

---

## Delivery Reliability

All notification jobs are managed by **pg-boss** within the same PostgreSQL database:

- Notification writes are **transactional** — if the triggering event (comment, @mention) fails to save, no notification is enqueued
- Email sending uses **Nodemailer** via SMTP — configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_SECURE`
- All email jobs must be idempotent (pg-boss is at-least-once); use the outbox pattern below

### Email Delivery — Outbox Pattern

Email delivery uses an `email_outbox` table to guarantee idempotency across pg-boss retries:

```
email_outbox
├── id              (uuid, primary key — used as SMTP Message-ID for dedup)
├── recipient_email (string)
├── subject         (string)
├── html_body       (text)
├── type            (enum: notification_email | digest_email)
├── status          (enum: queued | sending | sent | failed)
├── attempt_count   (integer, default: 0)
├── last_error      (string, nullable)
├── created_at      (timestamp)
└── updated_at      (timestamp)
```

**State machine:** `queued → sending → sent` (terminal). The worker atomically transitions `queued → sending` before calling SMTP; on success flips to `sent`; on failure increments `attempt_count` and reverts to `queued` for retry. A nightly reaper sweeps rows stuck in `sending` > 10 minutes → `failed`. Never resend a `failed` row automatically — log and let an operator decide.

**Idempotency:** The outbox row `id` is passed as the SMTP `Message-ID` header. If the same job fires twice, the second run finds `status='sending'` or `status='sent'` and short-circuits without sending a duplicate email.

### Background Jobs (pg-boss)

| Job | Schedule | `retryLimit` | Description |
|-----|----------|-------------|-------------|
| `send-notification-email` | On event | 3 (60s / 300s / 1500s backoff) | Enqueue into `email_outbox`, then send via SMTP; outbox row tracks state |
| `send-email-digest` | Hourly (filters by user TZ — see [background-jobs.md § Digest timezone scheduling](../docs/architecture/background-jobs.md)) | 2 | Collect unread notifications, build digest, enqueue into `email_outbox`; idempotency key is `(recipient_email, digest_date)` |
| `cleanup-old-notifications` | Nightly | 2 | Permanently delete notifications older than 90 days |
| `cleanup-email-outbox` | Nightly | 1 | Sweep `sending` rows stuck > 10 min → `failed`; delete `sent` rows older than 30 days |

---

## Data Model

```
Notification
├── id                  (uuid, primary key)
├── workspace_id        (foreign key → Workspace)
├── recipient_id        (foreign key → User)
├── sender_id           (foreign key → User, nullable — null for system events)
├── type                (enum: mention | comment | reply | resolved | reopened |
│                        access_granted | workspace_invite | guest_accepted |
│                        trash_warning)
├── page_id             (foreign key → Page)
├── source_id           (uuid — ID of the entity that triggered it; see mapping below)
├── content_snippet     (string — up to 100 chars of relevant content)
├── is_read             (boolean, default: false)
├── read_at             (timestamp, nullable)
├── created_at          (timestamp)

**`source_id` mapping by `type`:**

| `type` | `source_id` points to |
|--------|----------------------|
| `mention` (in a comment) | `comments.id` — the comment containing the @mention |
| `mention` (in page content) | `blocks.id` — the block containing the @mention |
| `comment` | `comments.id` — the new comment on the page |
| `reply` | `comments.id` — the reply comment (not the thread root) |
| `resolved` | `comments.id` — the thread root comment |
| `reopened` | `comments.id` — the thread root comment |
| `access_granted` | `page_permissions.id` — the grant row |
| `workspace_invite` | `workspace_members.id` — the pending member row |
| `guest_accepted` | `guest_invitations.id` — the accepted invitation row |
| `trash_warning` | `pages.id` — the trashed page |

> For `type = 'mention'`, the notification center distinguishes comment mentions from block mentions by checking whether `source_id` resolves to a `comments` row or a `blocks` row. Both display the same mention card but the "Go to source" action navigates differently (comment thread vs. block highlight).

NotificationPreference
├── id                  (uuid, primary key)
├── user_id             (foreign key → User, unique)
├── email_frequency     (enum: realtime | daily | weekly | off, default: daily)
├── weekly_digest_day   (integer — 0=Sunday, 1=Monday ... 6=Saturday, default: 1)
└── updated_at          (timestamp)
```

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/notifications` | List notifications for current user | Authenticated |
| PATCH | `/api/notifications/:id/read` | Mark a specific notification as read | Authenticated |
| POST | `/api/notifications/read-all` | Mark all notifications as read | Authenticated |
| GET | `/api/user/notification-preferences` | Get notification preferences | Authenticated |
| PATCH | `/api/user/notification-preferences` | Update email frequency / digest day | Authenticated |
| GET | `/api/notifications/stream` | SSE stream for real-time notifications (requires a persistent-connection host — see Deployment note) | Authenticated |

---

## UI Screens

| Screen | Route / Location | Access |
|--------|----------------|--------|
| Notification Center | Sidebar panel (bell icon) | All members |
| Notification Settings | `/settings/notifications` | All members |

---

## Business Rules

1. Notification delivery is transactional — a notification is only enqueued if the triggering action (comment, @mention) is successfully saved.
2. A user does not receive notifications for their own actions (you cannot @mention yourself and receive a notification).
3. Notifications are scoped to the workspace — activity in Workspace A does not generate notifications visible in Workspace B.
4. Email digests only include unread notifications — activity already seen in-app is excluded.
5. Empty digests are not sent. A daily digest is skipped if there are no unread notifications.
6. Notification retention is 90 days. Notifications older than 90 days are permanently deleted.
7. Changing email frequency takes effect from the next scheduled delivery cycle.
8. Real-time SSE delivery is best-effort. The client auto-reconnects on connection drop and falls back to polling `GET /api/notifications` if the stream is unavailable; notifications are always available in the Notification Center regardless of SSE delivery status.
9. Email delivery uses the `email_outbox` outbox pattern — the outbox row `id` is the SMTP `Message-ID`, providing provider-level dedup. A `failed` row is never automatically resent; an operator must inspect and re-queue manually.
10. The `cleanup-email-outbox` job sweeps rows stuck in `sending` > 10 minutes to `failed` and purges `sent` rows where `updated_at < NOW() - INTERVAL '30 days'`. Using `updated_at` (not `created_at`) ensures the 30-day retention counts from when the email was actually delivered, not from when it was first queued. Never delete a `failed` row without operator sign-off.

---

## Out of Scope (MVP)

- Granular per-event-type notification control (Phase 2 — e.g., "only @mentions, no comment replies")
- Muting a specific page or thread
- Browser push notifications (PWA)
- Mobile push notifications (Phase 3 with mobile app)
- Notification grouping by sender or page in the panel
- Slack / Teams integration for notifications (Phase 5)
