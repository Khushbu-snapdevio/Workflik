# Backend Architecture & Reusable Pieces

How Pagevo is put together at the process, route, and module level — and the
reusable **pieces** the whole product is assembled from. Read this before working
in `app/`, `lib/`, or `components/`.

---

## Two-process model

Pagevo runs as **two processes against one PostgreSQL database**:

| Process | Entry point | Does | Never does |
| --- | --- | --- | --- |
| **Web** | Next.js (`next start`) | Serves UI, API routes, server actions; reads/writes the DB; **enqueues** background jobs | Slow work inline (email, large copies, S3 transfers) |
| **Worker** | `worker/index.ts` (`pnpm worker`) | Boots pg-boss, registers handlers, runs scheduled + on-demand jobs | Serve HTTP |

**Invariant:** slow, retryable, or scheduled work goes through the worker via a
pg-boss job — never inline in a Next.js request. The full job list is in
[background-jobs.md](background-jobs.md).

### Worker scaling & idempotency

- The worker is **safe to run as multiple replicas.** pg-boss claims each job row
  with Postgres `FOR UPDATE SKIP LOCKED`, so two replicas can never process the
  same job.
- Every cron job uses `policy: "exclusive"`, so a slow run cannot overlap its next
  tick.
- pg-boss is **at-least-once**, so every handler is **idempotent** (atomic status
  transitions, transactional enqueue, check-then-act). See
  [background-jobs.md § Idempotency](background-jobs.md#idempotency--safety).
- `localConcurrency` is `1` per queue per replica — scale out with more replicas,
  not higher per-process concurrency.

---

## Route groups (`app/`)

Routes are organized with Next.js App Router route groups (parentheses are
grouping only — they don't appear in the URL):

| Group | Purpose | Access |
| --- | --- | --- |
| `(auth)/` | Magic-link sign in / sign up, link verification, invite accept | Public |
| `(app)/[workspace]/` | The workspace UI — page tree, editor, databases, settings | Members |
| `(app)/[workspace]/[pageId]/` | Page editor | Per-page permission |
| `orbit/` | Orbit Admin — internal platform-team ops | Platform team only |
| `api/` | REST API routes (incl. `GET /api/notifications/stream` SSE) | Mixed (guarded) |

Every protected route resolves access through the **auth & permission pieces**
below — never by ad-hoc checks inside the route.

---

## The service layer (`lib/`) — backend pieces

Reusable backend modules. Each has one responsibility and is imported wherever
it's needed, so the rule (e.g. "how is page permission resolved?") lives in
exactly one place.

| Piece | Path | Responsibility |
| --- | --- | --- |
| **Auth config** | `lib/auth/` | Better Auth setup — magic-link plugin, admin plugin, DB-backed sessions |
| **Auth guards** | `lib/auth/guards.ts` | `requireSession()`, `requireWorkspaceMember()`, `requirePagePermission()`, `requireAdmin()` — used by every protected route & action |
| **Permission resolver** | `lib/permissions/` | The single recursive CTE that walks a page's ancestors to the first explicit grant or workspace root (Phase-1 decision #3). Enforced at the SQL level, never after fetch. **Exception:** `is_private = true` short-circuits inheritance — only the creator and explicit grants apply; see [security.md](../security.md#authorization-the-core) |
| **Page tree** | `lib/pages/tree.ts` | Closure-table operations — descendants, move, duplicate-subtree, breadcrumb (Phase-1 decision #1) |
| **Blocks** | `lib/blocks/` | JSONB block read/write with `schema_version` (Phase-1 decision #2); serialize/deserialize per block type |
| **Search** | `lib/search/` | `tsvector` / `tsquery` helpers, permission-filtered result scoping |
| **Notifications** | `lib/notifications/` | Trigger detection (mention, reply, resolve) + transactional enqueue |
| **Jobs** | `lib/jobs/` | pg-boss queue names, enqueue helpers, handler registration (see [background-jobs.md](background-jobs.md)) |
| **Storage** | `lib/storage/` | Pre-signed PUT/GET URL helpers for S3; per-type size-limit enforcement |
| **Email** | `lib/email/` | Nodemailer SMTP transport + templated transactional emails |
| **Export** | `lib/jobs/handlers/export-page.ts` | Markdown / HTML renderers for pages |
| **Members & invites** | `lib/workspace/` | Membership, roles, invite + guest-access flows, ownership transfer |
| **DB** | `lib/db/` | Drizzle instance, schema, query helpers |
| **Env** | `lib/env.ts` | Validated environment variables — fail fast on missing/invalid config |

---

## The UI component library (`components/`) — frontend pieces

| Piece | Path | Examples |
| --- | --- | --- |
| **Design-system primitives** | `components/ui/` | Button, Input, Dialog, Sheet, Dropdown, Tooltip, Table, Badge, Toast — the atoms every feature composes from |
| **Editor blocks** | `components/editor/` | One component per block type (Paragraph, Heading, To-Do, Callout, Code, Image, Columns, Linked Page…). Registered through the **Block Registry** below |
| **Database views** | `components/database/` | The four views — `TableView`, `BoardView`, `CalendarView`, `GalleryView` — plus per-property cell renderers/editors driven by the **Property Registry** |
| **Navigation** | `components/navigation/` | Sidebar, page tree, workspace switcher, breadcrumb, search launcher (Ctrl/Cmd-K) |
| **Collaboration** | `components/comments/` | Comment threads, text-range anchors, mention autocomplete |
| **Notifications** | `components/notifications/` | Notification center panel, cards, real-time toast (SSE) |
| **Sharing** | `components/sharing/` | Permission dialogs, public-link controls, guest invite |

---

## Registry pieces

Instead of `switch` statements on a type scattered across the codebase, each "kind of thing" is
defined **once** in a registry — a map from a type to everything that type needs.
Adding a new block, property, notification, or job means adding **one entry**, not
editing ten files.

### Block Registry

`lib/blocks/registry.ts` — one entry per editor block type. Each entry declares:

| Field | What it provides |
| --- | --- |
| `type` | The block's stable id (stored in JSONB) |
| `schemaVersion` | Version of this block's content shape |
| `slashCommand` | Label/icon/keywords for the `/` insert menu |
| `markdownShortcut` | Auto-convert rule (e.g. `# ` → Heading 1) |
| `render` | The React component (`components/editor/`) |
| `serialize` | Block → Markdown/HTML for export |

Drives: the slash menu, the editor renderer, markdown export, and migration when
a block's shape changes. (See [editor.md](../../Features/editor.md).)

### Property Registry

`lib/database/property-registry.ts` — one entry per database property type (Text,
Number, Select, Multi-Select, Date, Checkbox, URL, Email, Phone, Person,
Relation). Each entry declares:

| Field | What it provides |
| --- | --- |
| `type` | Property type id |
| `cell` | Read-only cell renderer |
| `editor` | In-place edit control |
| `filterOps` | Allowed filter operators (e.g. `is`, `contains`, `before`) |
| `sortComparator` | How values sort |
| `validate` | Value validation |

Drives: every database view, the filter/sort UI, and validation. (See
[database-properties.md](../../Features/database-properties.md).)

### Notification Registry

`lib/notifications/registry.ts` — one entry per notification type (mention,
comment, reply, resolved, reopened, access_granted, workspace_invite,
guest_accepted, trash_warning). Each entry declares its icon, in-app copy
template, and email template. Drives the notification center, the email digest,
and which job fires. (See [notifications.md](../../Features/notifications.md).)

### Job Registry

`lib/jobs/job-names.ts` + `lib/jobs/register.ts` — one entry per queue (name,
handler, schedule, retry/expiry budget, policy). It is the source the
[background-jobs.md](background-jobs.md) catalog reflects.

**Implementation:** `job-names.ts` exports a `const` object as the single source of truth for queue name strings:
```ts
export const JOB = {
  SEND_NOTIFICATION_EMAIL: 'send-notification-email',
  AUTO_DELETE_EXPIRED_TRASH: 'auto-delete-expired-trash',
  // … one key per job
} as const
```
`register.ts` imports `JOB` and calls `boss.work(JOB.QUEUE_NAME, handler, opts)` and `boss.schedule(JOB.QUEUE_NAME, cronExpr, {}, { policy: 'exclusive' })` for each queue. **Never call `boss.work()` or `boss.schedule()` outside `register.ts`.** Individual handlers live in `lib/jobs/handlers/{job-name}.ts`, one file per handler.

---

## How a request flows (example: posting a comment with an @mention)

1. **Web** — `POST` server action → `requirePagePermission(pageId, 'comment')`
   (auth guard piece).
2. In one transaction: insert the comment, detect the `@mention` via the
   **Notifications** piece, and enqueue `send-notification-email` **only if the
   transaction commits** (transactional enqueue).
3. The Postgres trigger updates the page's `search_vector` (search piece).
4. Web returns immediately; the in-app recipient gets a real-time toast over SSE.
5. **Worker** — picks up `send-notification-email`, renders the template from the
   **Notification Registry**, sends via the **Email** piece, retrying up to 3×.

Each numbered step is a named piece doing its one job — that's the point of the
structure.

---

*Last updated: 2026-06-12*
