# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and human contributors when working with code in this repository. It is a **lean index** — the detailed references live under [docs/](docs/); read the relevant one before working in a subsystem.

## Project Overview

WorkFlik is an opinionated team workspace — "Notion's core, pre-assembled" — for small teams (3–15 people). Everything is a **block**; pages nest unlimitedly; databases are pages where each entry is itself a page. The product surface is described in [README.md](README.md) and one spec per feature under [Features/](Features/).

**Status: pre-development.** No application code exists yet — this repository is currently the full design + schema + architecture spec. The docs are the source of truth that the first implementation must follow. When code lands, keep these docs current (see Rule 1).

## Commands

Everyday commands below (the project is pre-development — these are the expected scripts; see [GETTING-STARTED.md](GETTING-STARTED.md) for setup).

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm worker` | pg-boss background-job worker (separate process — see Architecture) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm db:generate` | Generate a SQL migration from the Drizzle schema diff |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Browse data in Drizzle Studio |
| `pnpm lint` | ESLint / type-check |
| `pnpm test` | Vitest unit + integration |
| `pnpm test:e2e` | Playwright end-to-end |

## Tech Stack

Next.js (App Router, React, TypeScript strict) · Tailwind CSS · Radix UI (accessible primitives) · TipTap (ProseMirror) editor · KaTeX · react-hook-form + Zod (forms & validation) · PostgreSQL + Drizzle ORM · Better Auth (magic-link + admin plugins) · pg-boss (background jobs) · Nodemailer (SMTP) · S3-compatible object storage + CDN · SSE for real-time notifications · Vitest + Playwright · pnpm. Full rationale in [Features/development-plan.md](Features/development-plan.md).

## Architecture

WorkFlik runs as **two processes sharing one PostgreSQL database + codebase**: **Next.js** (web UI + API routes + server actions + SSE) and a **pg-boss worker** (`worker/`, background jobs — email, digests, search reindex, trash purge, exports). **All slow, retryable, or scheduled work goes through the worker via a pg-boss job — never inline in a Next.js request.** This is a critical invariant (Rule 2).

Detailed per-subsystem docs live under [docs/architecture/](docs/architecture/) (index: [docs/architecture/README.md](docs/architecture/README.md)). **Read the relevant file before working in that subsystem** — the list below is only a map.

- **Processes, worker scaling, route groups, service layer, the four registries** → [docs/architecture/backend-overview.md](docs/architecture/backend-overview.md)
- **Background jobs & queues** — every pg-boss job, schedule, retry policy, idempotency → [docs/architecture/background-jobs.md](docs/architecture/background-jobs.md)
- **Database schema** — every table, the closure table, single-table page inheritance, JSONB blocks, FTS triggers, the split `lib/db/schema/` layout → [DATABASE-PLAN.md](DATABASE-PLAN.md)
- **Security model** — permission resolution / BOLA, magic-link safety, file-upload safety, public-link & guest access → [docs/security.md](docs/security.md)
- **UI design system** — design tokens (colors, type, spacing), every component spec, feature UI patterns (editor, databases, settings modal, search, notifications), accessibility, responsive rules → [docs/ui-design.md](docs/ui-design.md)
- **API endpoints** — each `Features/*.md` spec lists the endpoints for its feature
- **Settings** — Account (profile, sessions, notifications) and Workspace (general, members, invite link) settings UI, endpoints, data model, and business rules → [Features/settings.md](Features/settings.md)

## Conventions

- **Path alias — always use `@/` for in-repo imports**, never relative `./`/`../`. `@/*` maps to project root (`tsconfig.json` `paths`).
- **Job handlers live in `lib/jobs/handlers/{job-name}.ts`** — one file per handler, exported as a named function in camelCase matching the job name. Handlers are imported and registered in `lib/jobs/register.ts`; never call `boss.work()` outside that file. `lib/jobs/job-names.ts` exports a `const` object (`export const JOB = { SEND_NOTIFICATION_EMAIL: 'send-notification-email', … }`) as the single source of truth for queue name strings.
- **Schema is split one file per domain** under `lib/db/schema/`, shared enums/helpers in `lib/db/schema/types.ts`, re-exported from `lib/db/schema/index.ts`. Never a single `schema.ts`. (See [DATABASE-PLAN.md § Schema file layout](DATABASE-PLAN.md#schema-file-layout).)
- **Server actions** live in `app/**/actions.ts` (or `lib/actions/`) and handle mutations with Zod-validated input.
- **Auth/permission enforcement order**: `requireSession` → `requireWorkspaceMember` → `requirePagePermission`. Never reimplement permission checking inline (Rule 3).
- **Reusable building blocks are registries** — the Block, Property, Notification, and Job registries each define one entry per type. Never scatter a `switch` on block/property/notification/job type across the codebase (Rule 12). See [backend-overview.md](docs/architecture/backend-overview.md#registry-pieces).
- **`updated_at` always uses the `updatedAt()` helper** so the timestamp refreshes on UPDATE, not just INSERT.
- **Timestamps are UTC in the DB**; render in the browser's local timezone, never inline-format on the server.
- **Email** goes through `lib/email/` templates rendered by the worker — never inline HTML strings in handlers.

## Development Practices

Behavioral guidelines (bias toward correctness over speed; use judgment on trivial tasks). The principles:

- **Quality over speed.** Verify (typecheck, lint, tests) before claiming anything works. After fixing one instance of a pattern, grep the codebase for the same pattern.
- **Research → Think → Ask → Implement.** Don't implement then ask. When unclear, stop and ask one tight question.
- **Simplicity & surgical changes.** Minimum code that solves the problem; touch only what the request needs; match existing style.
- **Third-party integrations — read the CURRENT docs** (Better Auth, TipTap, Drizzle, pg-boss), pin + confirm the version, never rely on training-data memory.
- **No fake features.** Every route/page/table ships with a real handler + reader/writer.
- **Reuse existing primitives** — search first, match established patterns, never invent a parallel one.

## Rules

These are derived from WorkFlik's [Phase-1 architecture decisions](README.md#phase-1-architecture-decisions) and schema invariants. They are **hard to change after data exists** — follow them from the first commit.

1. **Keep the docs current.** When you add a feature, change architecture, add a rule/convention, change setup, or alter the schema, update CLAUDE.md (the lean index) **and** the detailed doc: the relevant `docs/architecture/*` file, [DATABASE-PLAN.md](DATABASE-PLAN.md), or the matching `Features/*.md` spec. Add a pointer in the Architecture map for any new subsystem doc.
2. **Never do slow/IO/scheduled work inline in a Next.js route** — enqueue a pg-boss job and handle it in the worker. The only real-time exception is the SSE notification stream.
3. **Always resolve permissions through the shared resolver, at the SQL level.** Use the auth helpers (`requireSession` / `requireWorkspaceMember` / `requirePagePermission`); never filter restricted rows in application code after a broad fetch (that is a BOLA vulnerability — Phase-1 decision #5). A private page (`is_private = true`) short-circuits inheritance: only the creator + explicit grants apply, workspace Admins included in the denial. **Permission ceiling enforcement:** before inserting or updating a `page_permissions` row, the grant handler must check `workspace_members.role` for the target user and cap `access_level` accordingly — Viewer → `can_view` max, Editor → `can_edit` max, Admin → any level. Never trust the client-supplied `access_level` directly; return the downgraded value in the response so the UI can reflect the actual grant. **Impersonation sessions** have a hard 2-hour TTL — the session is created with `impersonated_at = NOW()`, and a `beforeRefresh` hook in `lib/auth/` must reject any refresh attempt where `NOW() - session.impersonated_at > 2 hours`. The `impersonated_by` and `impersonated_at` columns are added to the `sessions` table in `lib/db/schema/auth.ts`. Better Auth's default sliding-window refresh must not extend impersonation sessions.
4. **Page hierarchy is a closure table.** Maintain `page_closure` in the **same transaction** as any `parent_id` change (create, move, delete). Never compute descendants by recursive app-side queries (Phase-1 decision #1). All `parent_id` mutations **must go through `lib/pages/closure.ts`** — the module that exposes `insertPageWithClosure()`, `movePageWithClosure()`, and `deletePageClosure()`. Never call raw SQL or update `parent_id` directly without routing through this module; missing a closure update silently corrupts the entire page hierarchy and all permission checks that depend on it.
5. **Block content is JSONB with an explicit `schema_version`.** Never change a block's content shape without bumping its version and providing a migration path. Block definitions live in the Block Registry (Phase-1 decision #2).
6. **Search index is maintained by PostgreSQL triggers** on block-content / property-value / comment changes — not just on title changes (Phase-1 decision #4). Bulk operations (import, mass edit) must batch their writes so the trigger isn't fired row-by-row thousands of times in one transaction. There is no separate reindex job.
7. **No raw SQL** except FTS triggers, closure-table maintenance, DDL, or operations with no Drizzle equivalent. Use Drizzle helpers everywhere else.
8. **Schema changes go through `pnpm db:generate`** — never hand-write migration files or journal entries. Edit `lib/db/schema/*.ts` → `pnpm db:generate` → review SQL → commit → `pnpm db:migrate`. `pnpm db:push` is dev-only.
9. **All env vars are validated with Zod in `lib/env.ts`** — never read `process.env` directly elsewhere.
10. **All background job handlers must be idempotent** (pg-boss is at-least-once). Cron jobs use `policy: "exclusive"`. See [background-jobs.md § Idempotency](docs/architecture/background-jobs.md#idempotency--safety).
11. **Notifications are transactional** — only enqueue a notification job inside the same transaction that saved the triggering comment/mention. A user never gets a notification for their own action.
12. **Extend the registries, don't scatter switches** — Block, Property, Notification, Job. Adding a block/property/notification/job type means adding one registry entry, not editing ten files.
13. **File uploads use pre-signed direct-to-S3 PUT URLs.** Validate type + per-type size limit server-side **before** issuing the URL; never proxy file bytes through the app server. Limits live in one config module.
14. **The database "Title" property is virtual** — it lives in `pages.title`, is always column 1, never deletable/reorderable, doesn't count toward the 50-property limit, and is **never** written to `property_values`.
15. **Soft delete via `is_deleted` + `deleted_at`** (30-day Trash). Hard deletion happens only through the `auto-delete-expired-trash` job. Author/creator FKs are `ON DELETE SET NULL` and render as "Former Member".
16. **Magic-link tokens are short-lived and single-use** — deleted on use; expired/used tokens are invalidated by Better Auth's own token lifecycle (no custom job). Lock the Better Auth ↔ schema column mapping in `lib/auth/` once and never rename auth columns afterward (see [DATABASE-PLAN.md](DATABASE-PLAN.md) Auth ↔ schema mapping note).
17. **Every Orbit (platform-admin) mutation writes to `platform_audit_log`** — append-only, with actor, action, target, and metadata.
18. **All forms validate with Zod**; show errors inline, never via toast for validation. Disable submit until valid (and dirty, for edit forms).

> **When you introduce a new subsystem, rule, or invariant, add it here and to its detailed doc.** This file is the map; the territory is in [docs/](docs/).
