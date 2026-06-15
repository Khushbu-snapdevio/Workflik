# Background Jobs & Queues

WorkFlik runs all asynchronous work through **pg-boss**, a job queue that lives
inside the same PostgreSQL database as the application data. There is no Redis
and no separate message broker — one database is the single source of truth for
both app state and the queue.

This is the **one place** that lists every job the system runs. The job names
here are the canonical ones, drawn from the feature specs under
[../../Features/](../../Features/) and mirrored in
[GETTING-STARTED.md § 9](../../GETTING-STARTED.md). When you add, rename, or
reschedule a job, define it in its **feature spec first**, then update this
catalog and GETTING-STARTED so all three stay in sync (CLAUDE.md Rule 1).

---

## Why a job queue at all

Some work must not happen inside the HTTP request that triggers it — it is too
slow, must retry on failure, or must run on a schedule with no user present:

- **Slow / external work** — sending email, talking to S3, cascading deletes.
- **Scheduled work** — daily digests, nightly trash auto-delete, storage sweeps.
- **Retryable work** — anything that hits an external service (SMTP, S3) and can
  fail transiently.

The web process stays fast by **enqueuing a job and returning immediately**; the
worker process does the slow part.

---

## Two-process model

WorkFlik runs as **two processes against one database** (see
[backend-overview.md](backend-overview.md) for the full picture):

| Process | Command | Responsibility |
| --- | --- | --- |
| **Web** | `pnpm dev` / `next start` | Serves the UI + API; **enqueues** jobs, never runs slow work inline |
| **Worker** | `pnpm worker` | Boots pg-boss, registers handlers, runs jobs (scheduled + on-demand) |

The worker is a separate deployable. It is safe to scale to multiple replicas —
pg-boss claims each job with Postgres `FOR UPDATE SKIP LOCKED`, so two replicas
can never run the same job.

---

## Job catalog

Conventions: **Trigger** is `On demand` (enqueued by app code) or a cadence
(registered with `boss.schedule()`). All scheduled jobs use `policy: "exclusive"`
so a slow run can never overlap the next tick (see
[Idempotency & safety](#idempotency--safety)). The **Source** column points to
the feature spec that owns the job's behavior.

### File Storage — [file-storage.md](../../Features/file-storage.md)

| Job | Trigger | Purpose |
| --- | --- | --- |
| `cleanup-stale-uploads` | Every 30 min | Delete storage objects for uploads that were signed but never confirmed |
| `cleanup-orphaned-media` | Daily | Delete stored files no longer referenced by any active block — or by a page version within the 7-day window (preserves undo / Version History) |
| `sync-storage-usage` | Daily | Sum all `file_uploads.size` values per workspace and atomically update `workspace_storage_usage.bytes_used`. A no-op if the value has not drifted. Handles objects not yet cleaned by `cleanup-orphaned-media` by re-deriving usage from the DB, not from S3 directly |

### Auth — [authentication.md](../../Features/authentication.md)

| Job | Trigger | Purpose |
| --- | --- | --- |
| `delete-user-private-pages` | On account-deletion confirm | Purge a deleted user's private pages and their files |

> Session and magic-link **token** expiry are handled by Better Auth's own
> lifecycle, not a custom pg-boss job — don't invent one. (See
> [docs/security.md](../security.md).)

### Pages — [pages.md](../../Features/pages.md)

| Job | Trigger | Purpose |
| --- | --- | --- |
| `auto-delete-expired-trash` | Daily 02:00 UTC | Permanently remove trashed pages past the 30-day retention (cascades to subpages + files) |
| `warn-expiring-trash` | Daily 02:00 UTC | Two queries per run: (1) **Banner flag** — no DB write needed; the UI derives the 7-day banner from `deleted_at <= NOW() - INTERVAL '23 days'` at render time. (2) **3-day notification** — `SELECT … FROM pages WHERE is_deleted = true AND deleted_at <= NOW() - INTERVAL '27 days' AND deleted_at > NOW() - INTERVAL '30 days' AND trash_warning_sent = false`; for each matching page, atomically `UPDATE pages SET trash_warning_sent = true WHERE id = :id AND trash_warning_sent = false` (check return count to guard against concurrent runs), then enqueue the in-app + email notification to the page's deleter and creator |
| `auto-delete-expired-versions` | Daily | Prune page versions outside the retention window |

### Workspace & Members — [settings.md](../../Features/settings.md), [workspace.md](../../Features/workspace.md)

| Job | Trigger | Purpose |
| --- | --- | --- |
| `send-workspace-invite` | On demand — Admin invites member by email | Send the workspace invite email with a 7-day expiry token via Nodemailer; retries up to 3× with exponential backoff |
| `delete-workspace` | On demand — Admin confirms workspace deletion | Hard-delete all workspace data (pages, blocks, files, members, storage objects) asynchronously; cancels all pending workspace-scoped jobs before purging |
| `notify-storage-threshold` | Daily | Send an email to all workspace Admins the first time storage crosses 90 % — does not re-fire until the workspace drops below 90 % and crosses it again |
| `expire-invitations` | Daily | Set `workspace_members.status = 'expired'` for rows where `status = 'invited'` and `invite_expires < NOW()`; tokens already return 410 based on the timestamp check — the status update is audit cleanup only. Row is retained; not deleted. |

### Notifications — [notifications.md](../../Features/notifications.md)

| Job | Trigger | Purpose |
| --- | --- | --- |
| `send-notification-email` | On event (realtime frequency) | Deliver a per-event notification email (mention, comment reply, access granted) via Nodemailer/SMTP; retries up to 3× with exponential backoff (60s → 300s → 1500s) |
| `send-email-digest` | Hourly (see TZ note below) | Send the daily or weekly digest of unread notifications; skips users with nothing unread; retries up to 2× with exponential backoff; idempotency key is `(recipient_email, digest_date)` |
| `cleanup-old-notifications` | Nightly | Permanently delete notification rows older than 90 days |
| `cleanup-email-outbox` | Nightly | Sweep `email_outbox` rows stuck in `sending` > 10 min → `failed`; purge `sent` rows older than 30 days |

---

## Digest timezone scheduling

pg-boss cron expressions run in **UTC**. A user's digest target is `08:00` in their **local timezone** (`users.timezone`, IANA format). Because you cannot express a per-user UTC offset as a single cron, `send-email-digest` is scheduled to run **every hour** on the :00 mark. Each run:

1. Queries for users whose local time is currently between 08:00 and 08:59 (i.e. `NOW() AT TIME ZONE users.timezone` between `08:00` and `09:00`).
2. Filters to those with `email_frequency = 'daily'` (or `'weekly'` on the configured `weekly_digest_day`).
3. Enqueues one `send-email-digest` payload per qualifying user.

**Idempotency:** each payload includes a `digest_date` (the UTC calendar date for which the digest is being sent). The handler checks `email_outbox` for an existing `digest_email` row for that `(recipient_email, digest_date)` before inserting — a second run in the same UTC hour finds the row and skips sending. This prevents double-sends if the worker restarts mid-hour.

---

## Scheduled jobs at a glance

| Job | Cadence |
| --- | --- |
| `cleanup-stale-uploads` | Every 30 min |
| `cleanup-orphaned-media` | Daily |
| `sync-storage-usage` | Daily |
| `notify-storage-threshold` | Daily |
| `expire-invitations` | Daily |
| `auto-delete-expired-trash` | Daily 02:00 UTC |
| `warn-expiring-trash` | Daily 02:00 UTC |
| `auto-delete-expired-versions` | Daily |
| `send-email-digest` | Hourly (filters by user TZ — see Digest timezone scheduling) |
| `cleanup-old-notifications` | Nightly |
| `cleanup-email-outbox` | Nightly |

On-demand (not scheduled): `delete-user-private-pages`, `send-notification-email`, `send-workspace-invite`, `delete-workspace`.
Nightly (cleanup): `cleanup-old-notifications`, `cleanup-email-outbox`.
All scheduled jobs use `policy: "exclusive"`.

---

## How jobs are registered

Job definitions live in `lib/jobs/` (notification triggers in
`lib/notifications/`), per the repo structure in
[development-plan.md](../../Features/development-plan.md). The intended layout:

```
lib/jobs/
├── job-names.ts        # const map of every queue name (single source of truth)
├── register.ts         # boss.work() handler registration + boss.schedule() crons
├── enqueue.ts          # typed enqueue helpers used by web + worker
└── handlers/           # one file per job — the actual business logic
worker/
└── index.ts            # `pnpm worker` entry point: start pg-boss → register → drain on SIGTERM
```

- **Names** are declared once in `job-names.ts` and imported everywhere — no
  string literals scattered across the codebase.
- **Enqueue** from app code via a typed helper, never by hand-building payloads.
- **Schedules** are registered at worker boot, e.g.
  `await boss.schedule(JOB.AUTO_DELETE_EXPIRED_TRASH, "0 2 * * *")`.
- Each queue declares its retry/expiry budget when its handler is registered
  (`retryLimit`, `retryDelay`, `expireInSeconds`, `policy`).

This mirrors the **Job Registry** piece in
[backend-overview.md](backend-overview.md#registry-pieces): one definition per
job, so this catalog reflects code rather than drifting from it.

---

## Idempotency & safety

pg-boss guarantees **at-least-once** delivery, not exactly-once. A job can run
twice (retry after a worker crash, a duplicate enqueue). Every handler must be
safe to run more than once. The patterns WorkFlik uses:

1. **Atomic status transition** — flip a status-bearing row and act only if the
   flip succeeded (`UPDATE … WHERE status = 'queued' RETURNING id` → 0 rows means
   another run already took it; exit).
2. **Transactional enqueue** — a notification job is only created inside the same
   transaction that saved the triggering comment/mention. If the save rolls back,
   the job never exists (a rule in
   [notifications.md](../../Features/notifications.md)).
3. **Check-then-act for external side effects** — deleting an S3 object that is
   already gone is a no-op; re-sending an email keys off an idempotency marker so
   a retry can't double-send.
4. **`policy: "exclusive"` on every cron job** — pg-boss inserts each tick with a
   per-queue singleton key, so if a run takes longer than its interval the next
   tick is rejected at enqueue rather than running in parallel. Idempotent
   handlers self-heal on the next interval — an occasional skipped tick is
   acceptable; parallel execution is not.

### Retry policy

| Concern | Default |
| --- | --- |
| `retryLimit` | 3 for delivery jobs (email), 5 for cleanup/cron |
| `retryDelay` | Exponential backoff (notifications: 1 min → 5 min → 25 min, per [notifications.md](../../Features/notifications.md)) |
| Exhausted retries | Logged to error monitoring |
| `localConcurrency` | `1` per queue per replica — scale out with more replicas, not higher concurrency |

---

## What is **not** a background job

To keep the boundary clear:

- **Real-time notification delivery** is **Server-Sent Events (SSE)**, not a job —
  the in-app toast/badge is pushed over `GET /api/notifications/stream`. pg-boss
  only handles the **email** side and cleanup. (See
  [notifications.md](../../Features/notifications.md) and Phase-1 decision #6 in
  the [README](../../README.md).)
- **Search indexing** is maintained by **PostgreSQL triggers** on
  block-content / property-value / comment changes — there is no reindex job.
  Bulk operations (import, mass edit) must batch their writes so the trigger
  isn't fired row-by-row thousands of times in one transaction.
- **Permission resolution** is a synchronous recursive CTE in the request path,
  never deferred to a job.
- **Session / magic-link token expiry** is handled by Better Auth, not a job.

---

*Last updated: 2026-06-11*
