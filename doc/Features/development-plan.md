# Development Plan

## Overview

This document covers WorkFlik's technical architecture, development phases, and key engineering decisions. It is the primary reference for developers building the platform.

---

## Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|----------------|
| Framework | Next.js (App Router) | v15+ — server components, server actions, API routes |
| Language | TypeScript | Strict mode enabled |
| Database | PostgreSQL | v16+ — primary store, full-text search, job queue |
| ORM | Drizzle ORM | Type-safe queries, migrations, schema-as-code |
| Auth | Better Auth + Magic Link Plugin + Admin Plugin | Database-backed sessions, passwordless magic-link sign-in, ban/impersonate |
| Editor | TipTap | ProseMirror-based, extensible block editor |
| Job Queue | pg-boss | PostgreSQL-backed — notifications, email, cleanup |
| File Storage | S3-compatible object storage | Page covers, media blocks, file attachments |
| Email | Nodemailer (SMTP) | Transactional email delivery via SMTP |
| Admin | Orbit Admin | Custom internal ops dashboard (`/orbit`) |
| UI Primitives | Radix UI | Accessible, unstyled components (Dialog, Popover, Tooltip, etc.) |
| Forms | react-hook-form + `@hookform/resolvers/zod` | Form state + shared client/server Zod validation |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Math Rendering | KaTeX | LaTeX equation rendering in editor blocks |
| Testing | Vitest + Playwright | Unit + integration + E2E |
| Deployment | Vercel / Railway | Next.js hosting + managed PostgreSQL |

---

## Repository Structure

```
workflik/
├── app/                        # Next.js App Router pages
│   ├── (auth)/                 # Sign in / sign up (magic link), magic-link verify
│   ├── (app)/[workspace]/      # Main workspace UI
│   │   ├── [pageId]/           # Page editor
│   │   └── settings/           # Workspace settings
│   ├── orbit/                  # Orbit Admin (platform team only)
│   └── api/                    # API route handlers
├── components/                 # Shared UI components
│   ├── editor/                 # TipTap editor and block components
│   ├── database/               # Database views (Table, Board, Calendar, Gallery)
│   └── ui/                     # Design system primitives
├── lib/                        # Business logic and utilities
│   ├── auth/                   # Better Auth configuration
│   ├── db/
│   │   ├── schema/             # Drizzle schema — one file per domain (auth, pages, …)
│   │   │   ├── types.ts        #   shared enums + custom types + updatedAt() helper
│   │   │   └── index.ts        #   barrel: re-exports every domain file
│   │   ├── index.ts            # Drizzle client (postgres-js)
│   │   └── queries/            # Reusable query helpers
│   ├── jobs/                   # pg-boss job definitions + registration
│   ├── notifications/          # Notification triggers
│   └── storage/                # S3 pre-signed URL helpers
├── worker/                     # pg-boss worker entry point (pnpm worker)
├── drizzle/                    # Database migrations
└── public/                     # Static assets
```

---

## Development Phases

### Phase 1 — MVP (Current)

**Goal:** Core workspace, writing, and collaboration features. Every item below is mandatory and ships together.

| # | Feature Area | Key Deliverables |
|---|-------------|-----------------|
| 1 | **Foundation** | Next.js 15 + TypeScript strict + Tailwind v4, Drizzle + PostgreSQL, Zod env, pg-boss worker harness, `JOB_NAMES` + `QUEUE_OPTIONS` registry, ESLint + Vitest + Playwright scaffold |
| 2 | **Auth** | Magic-link sign-in/sign-up (passwordless only), database-backed sessions, session list + revoke, account settings, account deletion + `delete-user-private-pages` job |
| 3 | **Workspace** | Workspace CRUD, roles (Admin/Editor/Viewer), invite by email + invite link, member management, ownership transfer, workspace switcher |
| 4 | **Navigation** | Collapsible sidebar, hierarchical page tree (closure table), drag-and-drop reorder, favorites, recently visited (10), sidebar filter, trash section |
| 5 | **Pages** | Page CRUD, unlimited subpage hierarchy, icons (emoji + image), cover banner, move/duplicate, trash/restore, page lock, layout options (full-width / small text / font), version history (7-day), export (Markdown / HTML / PDF), trash + version cleanup jobs |
| 6 | **Block Editor** | TipTap setup, all block types (text / task / media / structure / code / equation / reference), `/` slash command, inline toolbar, Markdown shortcuts, drag-and-drop, multi-select, auto-save, IndexedDB offline queue, 200-step undo, `tsvector` triggers on block content |
| 7 | **File Storage** | S3 pre-signed upload flow, per-type size limits + workspace quota (5 GB) enforced at sign step, CDN URLs, storage usage UI, stale-upload + orphaned-media + sync-usage cleanup jobs, `email_outbox` table |
| 8 | **Databases** | Database schema extending pages, all 11 property types + system properties, Table + Board + Calendar + Gallery views, AND/OR filters, 5-level sort, grouping, multiple named views, inline + full-page modes |
| 9 | **Templates** | Built-in template gallery (5 categories), apply template, custom workspace templates (save page, max 5), Template Button block, built-in template authoring in Orbit Admin |
| 10 | **Search** | `search_index` table, tsvector + GIN index, PostgreSQL triggers on block content, permission-filtered search API, `Ctrl+K` command palette, filters (location / type / date / author), recently visited before query |
| 11 | **Comments + Mentions** | Block-level + text-range + page-level comments, threads (one level), resolve/reopen, `@name` mentions (triggers notification), `@page` live link, `@date` natural-language date |
| 12 | **Permissions** | `page_permissions` table, single recursive CTE for effective permission, SQL-level filtering (no post-fetch), subpage inheritance + per-page override, guest invites, public links, workspace role ceiling, private pages |
| 13 | **Notifications** | SSE stream (`/api/notifications/stream`, Railway-hosted), Notification Center panel, toast, all event triggers, `email_outbox` outbox pattern, `send-notification-email` + `send-email-digest` + cleanup jobs, notification preferences |
| 14 | **Onboarding** | Setup Wizard (Profile → Workspace → Invite → Template), 5-step Tooltip Tour, Contextual Hints (one-time, dismissable), `user_hint_states` + `user_preferences` tables |
| 15 | **Orbit Admin** | User management (ban/unban/impersonate/revoke), workspace management, template management, platform analytics, append-only `platform_audit_log` |
| 16 | **Testing + CI/CD** | Vitest unit + integration (real PostgreSQL), Playwright E2E (sign-up → page → editor → database → search → comment → notification), CI pipeline, EXPLAIN ANALYZE performance review on permission CTEs + FTS |

**Estimated timeline:** 16–20 weeks

> Full step-by-step sub-tasks for each row above are in [GETTING-STARTED.md §11](../GETTING-STARTED.md).

---

### Phase 2 — Collaboration & Views

**Goal:** Real-time multiplayer editing and advanced database views.

**Scope:**
- Real-time collaborative editing (Yjs CRDT + WebSocket server)
- Multiplayer cursors and presence indicators
- Page analytics (view count, unique visitors, traffic referrers)
- Version history improvements (named versions, compare diffs)
- Password-protected public links
- Granular notification preferences (per-event-type toggles)
- Mobile web — read-only optimized experience
- Dark mode / appearance settings

**Estimated timeline:** 12–16 weeks after Phase 1

---

### Phase 3 — Integrations & Scale

**Goal:** External integrations, enterprise features, and mobile.

**Scope:**
- Public REST API + API keys
- Webhooks for page and database events
- SSO / SAML (enterprise identity providers)
- Native iOS app
- Native Android app
- GitHub OAuth provider
- Import from Notion (page structure and content)

**Estimated timeline:** 16–20 weeks after Phase 2

---

### Phase 4 — AI & Advanced Features

**Goal:** AI-powered writing and knowledge management.

**Scope:**
- AI writing assistant (autocomplete, summarize, improve writing)
- AI-powered search (semantic / natural language)
- Smart database autofill (AI-suggested property values)
- Whiteboard (freehand drawing canvas)
- Custom domains for workspace public pages

**Estimated timeline:** TBD

---

### Phase 5 — Ecosystem

**Goal:** Platform extensibility and integrations marketplace.

**Scope:**
- Plugin / extension API
- Marketplace for third-party blocks and integrations
- Slack integration (notifications)
- GitHub integration (link PRs and issues to database entries)
- Zapier / Make connectors
- Jira import

**Estimated timeline:** TBD

---

## Key Architecture Decisions

### Why PostgreSQL for full-text search?

WorkFlik uses PostgreSQL's native `tsvector` / `tsquery` for search rather than a dedicated search service like Elasticsearch or Typesense. This reduces operational complexity for the MVP — one database to manage instead of two services. The tradeoff is lower relevance tuning flexibility. If search quality becomes a limitation at scale, migrating to a dedicated search service is a clean upgrade path.

---

### Why pg-boss for notifications?

pg-boss is a job queue built on PostgreSQL. It handles notification delivery, email digest scheduling, and cleanup jobs without introducing Redis or a separate message broker. Jobs are transactional — if the triggering action (a comment save) fails, the notification job is never created. The tradeoff is that pg-boss is less efficient than Redis pub/sub at very high message throughput, which is acceptable for an MVP-scale product.

### Worker Scaling

The pg-boss worker process (`pnpm worker`) is safe to run as multiple replicas. pg-boss uses `FOR UPDATE SKIP LOCKED` to claim job rows — two replicas cannot process the same job. All recurring queues use `policy: "exclusive"` so a slow tick never overlaps the next one across replicas.

**Concurrency rules:**
- `localConcurrency: 1` for every queue — each replica processes one job per type at a time; scale via replicas, not per-process concurrency.
- Postgres `max_connections` must cover all processes. Each worker replica uses ~20 connections (Drizzle pool) + ~10 pg-boss internal. Each Next.js process uses ~20. Set `max_connections ≥ 100` for up to 3 worker replicas.

**Job registry enforcement:** Every job name is defined in a `JOB_NAMES` enum; every entry has an explicit record in `QUEUE_OPTIONS: Record<JobName, PgBossQueueOptions>` — the TypeScript compiler fails at build time if a job is missing queue config. See [GETTING-STARTED.md §9](../GETTING-STARTED.md) for the full registry and per-job settings.

---

### Why Drizzle ORM over Prisma?

Drizzle provides a more direct mapping to SQL, better TypeScript inference, and lighter runtime overhead than Prisma. Schema changes require writing explicit migration files rather than relying on an ORM to infer them, which gives more control in production environments. The tradeoff is a steeper initial setup for developers new to Drizzle.

---

### Why TipTap over Slate or Lexical?

TipTap is built on ProseMirror, which is the most mature and battle-tested rich text editing foundation available. It has strong TypeScript support, a growing ecosystem of extensions, and Yjs integration for Phase 2 real-time collaboration. The tradeoff is that custom block types require writing ProseMirror node specs, which has a learning curve.

---

### Block storage — JSONB in PostgreSQL

Each block's content is stored as a `content` JSONB column in the `blocks` table. This allows flexible, schema-less storage of different block types without requiring a separate table per block type. Full-text indexing is maintained separately via a `search_vector` column updated by triggers.

---

## Database Schema Overview

```
Core tables:
  users, sessions, accounts, verifications
  workspaces, workspace_members
  pages (covers both pages and database entries)
  page_closure, page_versions, blocks

Database features:
  database_views
  database_properties
  property_values
  (a database is a "pages" row where kind='database' — no separate table)

Sharing:
  page_permissions
  public_links
  guest_invitations

Files:
  file_uploads
  workspace_storage_usage

Search:
  search_index

Templates:
  templates

Collaboration:
  comments
  notifications
  notification_preferences
  email_outbox

User preferences:
  user_preferences
  user_hint_states
  user_favorites
  user_recently_visited

Admin:
  platform_audit_log
```

> This lists the main tables by area; some columns and helper tables live in the per-feature specs.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secret for Better Auth session signing |
| `BETTER_AUTH_URL` | Base URL Better Auth uses to build magic-link URLs (matches `NEXT_PUBLIC_APP_URL`) |
| `S3_ENDPOINT` | S3-compatible storage endpoint (leave blank for the region default; set a custom endpoint URL otherwise) |
| `S3_BUCKET` | Storage bucket name |
| `S3_REGION` | Bucket region (e.g. `us-east-1`, or `auto` for some providers) |
| `S3_ACCESS_KEY_ID` | Storage access key ID |
| `S3_SECRET_ACCESS_KEY` | Storage secret access key |
| `CDN_URL` | CDN base URL for serving uploaded files |
| `EMAIL_FROM` | Sender address (e.g. `noreply@workflik.app`) |
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.sendgrid.net`) |
| `SMTP_PORT` | SMTP port (`587` for STARTTLS, `465` for TLS) |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASSWORD` | SMTP authentication password |
| `SMTP_SECURE` | `true` for TLS (port 465), `false` for STARTTLS (port 587) |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `https://workflik.app`) |
| `MAXMIND_LICENSE_KEY` | *Optional* — GeoIP lookup for the session list; omit to disable location display |

---

## Local Development

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Fill in DATABASE_URL and other required variables

# Generate + apply database migrations
pnpm db:generate     # build migration SQL from the Drizzle schema
pnpm db:migrate      # apply migrations to the database

# Start development server
pnpm dev

# Start the background-job worker (separate terminal)
pnpm worker          # pg-boss — notifications, email digests, cleanup jobs
```

> `pnpm dev` alone does **not** process background jobs (email digests, trash auto-delete, version pruning, stale-upload cleanup). Run `pnpm worker` in a second terminal or those features silently do nothing. See [GETTING-STARTED.md](../GETTING-STARTED.md) §8.

**Prerequisites:** Node.js v20+, PostgreSQL v16+

---

## Testing Strategy

| Layer | Tool | Coverage target |
|-------|------|----------------|
| Unit tests | Vitest | Business logic, utilities |
| Integration tests | Vitest + real PostgreSQL | API routes, database queries |
| E2E tests | Playwright | Critical user flows (sign up, create page, invite member) |

---

## Deployment

**Production stack:**
- Next.js app: Vercel (or Railway)
- PostgreSQL: Supabase / Neon / Railway managed PostgreSQL
- File storage: S3-compatible object storage + CDN
- Email: Nodemailer (SMTP)

> **Real-time (SSE) hosting constraint:** The notification SSE stream (`GET /api/notifications/stream`) is a long-lived connection and must run on a host that supports persistent connections (**Railway** or a VM/long-lived Node server). Vercel serverless functions cap stream duration and will drop the connection, so either host that route on Railway or rely on the client's `EventSource` auto-reconnect + polling fallback (the Notification Center stays the durable source of truth). See [notifications.md](notifications.md).

**CI/CD:**
- Push to `main` → automated tests → deploy to production
- Push to feature branch → automated tests → preview deployment

---

*Last updated: 2026-06-11*
