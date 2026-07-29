# WorkFlik

Structured workspace for small teams — Notion's core, pre-assembled.

An opinionated, pre-structured workspace for **small teams (3–15 people) who tried Notion, found it overwhelming to set up, and just want to get working.** Instead of a blank canvas with infinite options, WorkFlik ships with the structure those teams actually need — a fast block editor, a shared wiki, databases that feel like documents, and good search — ready to use on day one.

**Status: pre-development — this repository is a design and architecture specification. No application code exists yet.**

[Features](#features) · [Architecture](#architecture) · [Tech Stack](#tech-stack) · [Database Schema](#database-schema) · [Getting Started](#getting-started)

---

## What is WorkFlik?

WorkFlik is a team workspace built around one bet: **fewer decisions, faster time-to-value.** It is not "Notion but faster" — it is **Notion's core, pre-assembled** into a smaller, opinionated surface that trades configurability for getting a team productive in minutes, not hours.

**Who it's for:**
- A 3–15 person startup that needs a structured team wiki + lightweight project tracking
- Teams who want Notion's core value without its setup overhead or power-user complexity
- *Not* power users chasing formulas, rollups, or API-driven automation — those are deliberately out of scope

**Design goals:**
- Everything is a block — flexible, composable content
- Fast, distraction-free writing experience
- Powerful databases where every entry is a full page
- Opinionated defaults so a team is productive in minutes

**Content model:**

```text
Workspace
  └── Page  ◄─────────────────────────────────────┐
        ├── Blocks (text, media, tasks, code, etc.) │
        │         └── Inline Database (embedded)    │
        └── Subpages                                │
              └── Database (full-page)              │
                    └── Entry (is itself a Page) ───┘
                          (has blocks, subpages, nested databases — recurses)
```

---

## Documentation

- **Product specs** — one file per feature in [Features/](Features/)
- **Engineering reference** — [docs/](docs/): the [backend & reusable-pieces overview](docs/architecture/backend-overview.md), the [background-jobs & queues catalog](docs/architecture/background-jobs.md), the [security model](docs/security.md), and the [UI design system](docs/ui-design.md)
- **Contributor guide** — [CLAUDE.md](CLAUDE.md)
- **Setup** — [GETTING-STARTED.md](GETTING-STARTED.md) · **Schema** — [DATABASE-PLAN.md](DATABASE-PLAN.md) · **Plan** — [Features/development-plan.md](Features/development-plan.md)

---

## Features

### Authentication

Passwordless identity and session management. **Powered by Better Auth** with the Magic Link + Admin plugins.

- Passwordless sign in / sign up via magic link (the only auth method — no passwords, no OAuth/social)
- Database-backed session management; multi-device session list and revocation
- Ban / unban users (surfaced in Orbit Admin — see [Admin Panel](#admin-panel-orbit))

See [Features/authentication.md](Features/authentication.md).

### Workspaces

Top-level organizational container. Every user belongs to at least one workspace.

- Create, edit, delete; switch between multiple workspaces (workspace switcher)
- Invite members via email or invite link; manage members and roles; transfer ownership

| Role | Description |
|------|-------------|
| Admin | Full control — settings, members, all non-private content |
| Editor | Create and edit content; subject to page-level restrictions |
| Viewer | Read-only access to pages they have been granted access to |

See [Features/workspace.md](Features/workspace.md).

### Onboarding

Guided setup for new users: a **Setup Wizard** (Profile → Create/Join Workspace → Invite teammates → Choose starting template), a 5-step **Tooltip Tour**, and one-time **Contextual Hints**. See [Features/onboarding.md](Features/onboarding.md).

### Navigation

Sidebar and workspace navigation: workspace switcher, collapsible + resizable sidebar, hierarchical page tree with drag-and-drop reordering, Favorites (per-user), Recently Visited (last 10), Trash (30-day retention), and a sidebar filter (filter the page tree by name). See [Features/navigation.md](Features/navigation.md).

### Pages

Universal content container — everything lives on a page.

- Page icon (emoji or image) and cover banner; unlimited subpage nesting; breadcrumb navigation
- Move, duplicate, delete, restore from trash; favorites and page lock
- Export (Markdown, HTML); page version history; public link sharing

See [Features/pages.md](Features/pages.md).

### Editor

Block-based rich text editor — every element is a block. **Powered by TipTap (ProseMirror).**

| Category | Blocks |
|----------|--------|
| Text | Paragraph, H1, H2, H3, Bulleted List, Numbered List, Toggle, Quote, Callout, Divider |
| Task | To-Do (checkbox) |
| Media | Image, Video, Audio, File |
| Structure | Table of Contents, Simple Table, Columns (2–3 column layout) |
| Code & Math | Code Block (syntax highlighting), Equation (LaTeX via KaTeX) |
| Reference | Linked Page, Inline Database |
| Template | Template Button (clones a predefined block structure on click) |

`/` slash command to insert any block, floating inline-format toolbar, markdown shortcuts, block drag-and-drop, multi-block selection, continuous auto-save with a local queue that buffers writes during brief connectivity loss, and 200-step undo. See [Features/editor.md](Features/editor.md).

### Templates

Reusable page structures — a curated **Built-in** library (Personal, Productivity, Project Management, Team & Knowledge, Personal CRM) plus **Custom** workspace-scoped templates. Includes a **Template Button Block** that clones a predefined structure on click. See [Features/templates.md](Features/templates.md).

### Databases

Structured data collections where each entry is a full page.

| View | Description |
|------|-------------|
| Table | Spreadsheet-style rows and columns |
| Board | Kanban columns grouped by a Select property |
| Calendar | Entries placed on a month grid by a Date property |
| Gallery | Visual card grid with cover images |

Full-page or inline; multiple named views per database; filters with AND/OR logic; up to 5 stacked sorts; grouping by Select. See [Features/databases.md](Features/databases.md).

### Database Properties

Typed columns that define database structure: Text, Number, Select, Multi-Select, Date, Checkbox, URL, Email, Phone, Person (`@me` default), and Relation (bidirectional, auto back-relation). System properties — Created Time, Created By, Last Edited Time, Last Edited By — are auto-generated. Limit: 50 user-created properties per database. See [Features/database-properties.md](Features/database-properties.md).

### Search

Global search across all workspace content. **Powered by PostgreSQL full-text search (`tsvector` / `tsquery`).**

- `Ctrl/Cmd+K` to open; real-time results across titles, content, entries, property values, and comments
- Results filtered by user permissions (private pages never surface for others); filters by location, type, date, author

See [Features/search.md](Features/search.md).

### Comments & Mentions

In-context collaboration: block comments (threaded, one level deep), text-level comments anchored to a selection, and page-level comments; resolve/reopen threads. Mentions: `@name` (notifies), `@page` (live link), `@date` (formatted reference). See [Features/comments.md](Features/comments.md).

### Permissions & Sharing

Two-layer access control: workspace roles + page-level permissions.

| Level | Can do |
|-------|--------|
| Full Access | Read, edit, manage permissions, share externally |
| Can Edit | Read and edit content, comment |
| Can Comment | Read and leave comments |
| Can View | Read only |

Public links (no login), guest access (external users invited to specific pages by email), and subpage permission inheritance with per-page override. See [Features/permissions.md](Features/permissions.md).

### Notifications

**In-App:** bell icon with unread badge — @mentions, comment replies, thread resolutions, access granted, workspace invites, and trash auto-deletion warnings. Real-time delivery via **Server-Sent Events (SSE)**.

**Email:** Real-time, Daily digest (default), Weekly digest, or Off — timezone-aware. **Powered by pg-boss** (delivery + scheduling). Retention: 90 days. See [Features/notifications.md](Features/notifications.md).

### Admin Panel (Orbit)

**Orbit Admin** — internal operations tool for the WorkFlik platform team (not accessible to end users): user management (ban/impersonate/revoke sessions), workspace management, built-in template management (`/orbit/templates`), platform analytics, and an append-only audit trail. See [Features/admin-panel.md](Features/admin-panel.md).

### File Storage

Binary uploads stored in **S3-compatible object storage served via a CDN** — page covers, icons, avatars, workspace icons, and all media blocks. Uploads use **pre-signed PUT URLs** so files go directly to the bucket, never transiting the app server.

| Type | Max size |
|------|---------|
| Page cover image | 5 MB |
| Page icon / User avatar / Workspace icon | 1 MB |
| Image block | 10 MB |
| Video / Audio block | 50 MB |
| File block | 100 MB |

See [Features/file-storage.md](Features/file-storage.md).

### Settings

User and workspace configuration in a single modal — five sections:

- **My Profile** — display name, job title, avatar, email (read-only)
- **Sessions** — list active devices, revoke individual sessions; logout everywhere
- **Notifications** — per-channel (in-app / email) and per-frequency (realtime / daily / weekly / off) preferences
- **Workspace General** — name, icon, default page access, storage usage, danger zone (delete workspace)
- **Workspace Members** — invite by email, change roles, remove members, manage invite link

See [Features/settings.md](Features/settings.md).

---

## Architecture

### Two-Process Model

WorkFlik runs as **two processes sharing a single PostgreSQL database**:

```text
┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │
│   Next.js Server    │     │   pg-boss Worker    │
│                     │     │                     │
│  • Web UI           │     │  • Email delivery   │
│  • API routes       │     │  • Digest schedules │
│  • Server actions   │     │  • Trash purge      │
│  • Auth + SSE       │     │  • Page exports     │
│  • Enqueues jobs    │     │  • File cleanup     │
└────────┬────────────┘     └────────┬────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────┴───────┐
              │  PostgreSQL   │
              │  + pg-boss    │
              └───────────────┘
```

**Critical invariant:** slow, retryable, or scheduled work flows through the worker via a pg-boss job — never inline in a Next.js request. The worker is a separate deployable and is safe to scale to multiple replicas (pg-boss claims each job with `FOR UPDATE SKIP LOCKED`). See [docs/architecture/backend-overview.md](docs/architecture/backend-overview.md).

### Content Model & Storage

- **Single-table page inheritance** — databases and entries are rows in `pages`, discriminated by `pages.kind` (`page` / `database` / `entry`). Entries get every page feature (icon, cover, blocks, comments, versions, permissions, trash) for free.
- **Closure table** (`page_closure`) backs the hierarchy so "all descendants" is one query — needed for permissions, search scoping, and bulk ops.
- **Blocks are JSONB with a `schema_version`** field so block shapes can be migrated later.

### Permission Resolution

Effective permission is resolved at runtime by a **single recursive CTE** that walks `parent_id` up to the first explicit `page_permissions` row, then falls back to `workspaces.default_page_access`. A private page short-circuits this — only the creator and explicit grants apply. **Filtering happens at the SQL level, never after fetch** (an app-level filter after a broad query is a BOLA risk).

### Background Jobs

All async work runs through **pg-boss** in the same database. Representative jobs (full catalog in [docs/architecture/background-jobs.md](docs/architecture/background-jobs.md)):

| Job | Schedule | Purpose |
| --- | --- | --- |
| `send-notification-email` | On event | Deliver a per-event notification email |
| `send-email-digest` | Daily 08:00 (user TZ) / weekly | Send daily/weekly digest of unread notifications |
| `cleanup-old-notifications` | Nightly | Delete notifications older than 90 days |
| `auto-delete-expired-trash` | Daily 02:00 UTC | Permanently delete pages in trash past 30-day retention |
| `warn-expiring-trash` | Daily 02:00 UTC | Warn deleter/creator about pages nearing trash deletion |
| `auto-delete-expired-versions` | Daily | Prune page versions outside the retention window |
| `cleanup-orphaned-media` | Daily | Delete stored files no longer referenced by any block/version |
| `cleanup-stale-uploads` | Every 30 min | Delete objects for uploads never confirmed |
| `sync-storage-usage` | Daily | Reconcile workspace `bytes_used` against storage |

All handlers are **idempotent** — safe to retry. Every cron job uses `policy: "exclusive"` so a slow tick can't overlap the next.

### Real-time Events (SSE)

| Stream | Events | Access |
| --- | --- | --- |
| `GET /api/notifications/stream` | `mention`, `comment-reply`, `thread-resolved`, `thread-reopened`, `access-granted`, `workspace-invite`, `guest-accepted`, `trash-warning` | The authenticated user's own stream |

Real-time toast/badge delivery is **best-effort** — the client's `EventSource` auto-reconnects and falls back to polling `GET /api/notifications`, so the Notification Center is always correct regardless of stream health. The SSE route requires a persistent-connection host (see [Phase-1 decision #6](#phase-1-architecture-decisions)).

### Reusable Pieces

The product is assembled from named building blocks rather than ad-hoc code: a `lib/` **service layer** (auth guards, permission resolver, page-tree, blocks, search, jobs, storage, email) and a `components/` **UI library** (design-system primitives, editor blocks, the four database views). Four **registries** define each "kind of thing" once — the **Block**, **Property**, **Notification**, and **Job** registries. Full map in [docs/architecture/backend-overview.md](docs/architecture/backend-overview.md).

---

## Tech Stack

### Frontend

| Technology | Purpose |
| --- | --- |
| **Next.js (App Router) v15+** | UI, routing, React server components, server actions |
| **TipTap (ProseMirror)** | Block-based rich text editor |
| **Tailwind CSS** | Utility-first styling |
| **Radix UI** | Accessible, unstyled UI primitives (Dialog, Popover, Tooltip, etc.) |
| **react-hook-form + Zod** | Form state management and schema validation (shared client/server) |
| **KaTeX** | LaTeX equation rendering in editor blocks |

### Backend

| Technology | Purpose |
| --- | --- |
| **PostgreSQL** | Primary data store + full-text search + pg-boss queue |
| **Drizzle ORM** | Type-safe database access, schema-as-code, migrations |
| **Better Auth** (Magic Link + Admin plugins) | Passwordless sessions, user management |
| **pg-boss** | Background job queue — notifications, email, search, cleanup |
| **Nodemailer (SMTP)** | Transactional email delivery |
| **Orbit Admin** | Internal ops dashboard (`/orbit`) |

### Infrastructure & Tooling

| Technology | Purpose |
| --- | --- |
| **S3-compatible object storage + CDN** | Images, covers, file attachments (pre-signed direct uploads) |
| **Vitest + Playwright** | Unit / integration + end-to-end tests |
| **Vercel / Railway** | Next.js hosting + managed PostgreSQL |

---

## Database Schema

Full plan in [DATABASE-PLAN.md](DATABASE-PLAN.md). Core tables by domain:

| Domain | Tables |
| --- | --- |
| Auth (Better Auth) | `users`, `sessions`, `accounts`, `verifications` |
| Workspace | `workspaces`, `workspace_members` |
| Pages & content | `pages`, `page_closure`, `page_versions`, `blocks` |
| Databases | `database_views`, `database_properties`, `property_values` |
| Sharing | `page_permissions`, `public_links`, `guest_invitations` |
| Collaboration | `comments`, `notifications`, `notification_preferences`, `email_outbox` |
| Search | `search_index` |
| Templates & files | `templates`, `file_uploads`, `workspace_storage_usage` |
| Per-user state | `user_preferences`, `user_hint_states`, `user_favorites`, `user_recently_visited` |
| Platform admin | `platform_audit_log` |

Notable decisions: single-table page inheritance (`pages.kind`), a closure table for the hierarchy, JSONB blocks with `schema_version`, a virtual Title property, and Postgres FTS triggers maintaining `search_index.search_vector`. pg-boss owns its own queue tables.

---

## Email Notifications

| Template | Trigger |
| --- | --- |
| **Magic Link** | Passwordless sign-in request |
| **Workspace Invite** | A member is invited to a workspace |
| **Guest Invite** | A page is shared with an external email |
| **Mention** | You are `@`-mentioned (real-time frequency) |
| **Comment Reply** | Someone replies in a thread you're in |
| **Access Granted** | You are granted access to a page |
| **Daily / Weekly Digest** | Scheduled summary of unread notifications |
| **Trash Warning** | A page you own nears 30-day trash deletion |

Email sends via **Nodemailer (SMTP)**, delivered and scheduled by **pg-boss** jobs; empty digests are never sent.

---

## MVP Scope

### Included in MVP

- [x] Authentication (passwordless magic link) + session management
- [x] Workspaces (multiple per account, switcher, create, invite, roles)
- [x] Onboarding (wizard, tour, hints)
- [x] Sidebar navigation with page tree
- [x] Pages (unlimited hierarchy, icon, cover, export, version history)
- [x] Block-based editor (all block types, including Columns)
- [x] Templates (built-in + custom)
- [x] Databases (Table, Board, Calendar, Gallery views)
- [x] Database Properties (all types, including Relation + system properties)
- [x] Global Search (PostgreSQL FTS)
- [x] Comments & Mentions (block, text-level, and page-level)
- [x] Permissions & Sharing (roles, page permissions, public links, guest access)
- [x] In-app and Email Notifications
- [x] Orbit Admin (user + workspace + template management)
- [x] File Storage (S3-compatible object storage + CDN, pre-signed direct uploads)

### Excluded from MVP (Post-MVP)

- [ ] Real-time collaboration / multiplayer cursors (Phase 2)
- [ ] API access for third-party integrations (Phase 3)
- [ ] SSO / SAML (Phase 3)
- [ ] Mobile app — iOS/Android (Phase 3)
- [ ] AI features — summarize, draft, smart search (Phase 4)
- [ ] Whiteboard (Phase 4)
- [ ] Custom domains (Phase 4)
- [ ] Integrations — Slack, GitHub, Zapier (Phase 5)
- [ ] Plugin marketplace (Phase 5)
- [ ] Dark mode / appearance settings (Post-MVP)
- [ ] Language / localization (Post-MVP)

---

## Phase-1 Architecture Decisions

Decisions that are **hard or impossible to change after data exists** — they must be settled before any pages, blocks, or permissions are persisted.

| # | Decision | Commitment for MVP | Why it can't wait |
|---|----------|--------------------|-------------------|
| 1 | **Page hierarchy storage** | **Closure table** (not a plain adjacency list) | "Get all descendant pages" is needed for permissions, search scoping, and bulk ops. Adjacency lists make this slow and are extremely hard to migrate once pages exist. |
| 2 | **Block content storage** | **JSONB with an explicit `schema_version` field from day one** | Adding or reshaping block types later requires migrating existing block JSON. Without versioning, block shapes become unmaintainable. |
| 3 | **Permission resolution** | **Single recursive CTE** that walks parents to the first explicit permission or workspace root | Computing effective permissions in application code is an N+1 query trap. Must be one query, designed up front. |
| 4 | **Search index maintenance** | **PostgreSQL triggers that fire on block-content changes, not just page-title changes** | Block content lives separately from the title; a title-only trigger silently produces stale search results. Test triggers under bulk ops (import, mass delete). |
| 5 | **Permission filtering location** | **Enforced at the SQL query level**, never in application code after fetch | App-level filtering after a broad query is a BOLA vulnerability — restricted rows leave the database before they're filtered. |
| 6 | **Real-time delivery (SSE)** | Host the `GET /api/notifications/stream` route on a **persistent-connection target** (Railway / long-lived Node server, PM2 / Docker). On Vercel that one route can't be a standard serverless function — but the client's `EventSource` auto-reconnect + polling fallback keeps the Notification Center correct, so Vercel remains viable with degraded liveness. | Serverless function timeouts kill long-lived SSE connections. The deploy target for this route is a prerequisite for choosing SSE; settle it before building real-time delivery. (Consistent with [development-plan.md](Features/development-plan.md) and [notifications.md](Features/notifications.md).) |

---

## Accessibility (MVP baseline)

Accessibility is cheapest to build in from the start. Minimum bar for Phase 1:

- **Keyboard accessibility** for all interactive elements (Tab, Enter, Escape); logical Tab order in complex views (database Table, comment panel)
- **ARIA labels** on the sidebar tree, database cells, and comment panels
- **Color is never the only indicator** — badges, callouts, and highlights pair color with an icon or text
- **WCAG AA contrast** (4.5:1 for text) enforced in the color palette

---

## Getting Started

Full walkthrough in [GETTING-STARTED.md](GETTING-STARTED.md).

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- pnpm 9+
- An SMTP provider (or local Mailpit) — required so magic-link sign-in emails send
- An S3-compatible bucket + CDN URL (or local MinIO)

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Required: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
#           S3 storage (bucket + keys + CDN URL), SMTP (host/port/user/pass)
# Full reference: GETTING-STARTED.md § 3

# Generate + apply database migrations
pnpm db:generate
pnpm db:migrate

# Start the dev server
pnpm dev

# In a second terminal, start the background-job worker
# Required — without it, email delivery, notifications, exports, trash purge, and digests are non-functional
pnpm worker
```

> To test Orbit Admin locally there is no UI to grant access — set `is_platform_admin = true` on your user row (`pnpm db:studio` or SQL).

### Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm worker` | pg-boss job worker (long-running) |
| `pnpm db:generate` | Generate migration SQL from the Drizzle schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio to inspect data |
| `pnpm lint` | ESLint / type-check |
| `pnpm test` | Vitest unit + integration |
| `pnpm test:e2e` | Playwright end-to-end |

---

*Last updated: 2026-06-11*
