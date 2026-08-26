# Pagevo

[![CI](https://github.com/sahajtavethiya96/Workflik/actions/workflows/ci.yml/badge.svg)](https://github.com/sahajtavethiya96/Workflik/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

A Notion-style all-in-one workspace — notes, documents, databases, and project management in one place — that you run yourself.

Pagevo is self-hosted, open-source software: block-based editor, four database views (Table/Board/Calendar/Gallery), comments and mentions, permissions and sharing, real-time notifications, templates, and an instance admin panel (Orbit). Full feature list in [doc/README.md](doc/README.md).

## Get your own instance running

```bash
git clone <your-fork-url> pagevo
cd pagevo
cp .env.example .env      # set APP_SECRET and NEXT_PUBLIC_APP_URL
docker compose up -d --build
docker compose run --rm migrate
```

That's it — every other credential (database, file storage, email, sign-in methods) has a free, zero-account default or a documented alternative. **Full setup guide: [SELF-HOSTING.md](SELF-HOSTING.md)** — Docker and manual/Node paths, every credential option including third-party database providers, environment variables, backups, and troubleshooting.

## Documentation

- **[SELF-HOSTING.md](SELF-HOSTING.md)** — the complete setup guide for anyone cloning this repo
- **[SAAS-TO-SELF-HOSTED.md](SAAS-TO-SELF-HOSTED.md)** — what changed (and what's still planned) to make this self-hostable
- **[doc/README.md](doc/README.md)** — full product spec: features, architecture, database schema
- **[doc/CLAUDE.md](doc/CLAUDE.md)** — engineering conventions and hard rules for contributors
- **[RELEASING.md](RELEASING.md)** — how a version is tagged and published

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Sign-in | Better Auth (magic-link, email + password, Google) |
| Editor | TipTap (block-based) |
| Styling | Tailwind CSS |
| Background jobs | pg-boss |
| File storage | S3-compatible storage, or local disk |
| Email | SMTP, or console-logged in dev |

## Requirements

| Tool | Version | Needed for |
|---|---|---|
| Docker + Docker Compose | any recent version | The recommended path — see below |
| Node.js | 20+ (the Docker image itself uses 22) | Manual/Node path only |
| pnpm | matches `packageManager` in `package.json` — install via `corepack enable` | Manual/Node path only |
| PostgreSQL | 16+ | Manual/Node path only — Docker Compose runs Postgres for you |

You do **not** need a database account, an S3 account, an SMTP provider, or Google Cloud
credentials for either path — every one of those has a free, self-hosted, zero-account
alternative. See [SELF-HOSTING.md](SELF-HOSTING.md) §4-7 for every option.

## Environment variables

Only three are required; everything else has a working default or is optional. Full
reference with every alternative: [SELF-HOSTING.md §11](SELF-HOSTING.md#11-environment-variables--full-reference)
and the commented [`.env.example`](.env.example).

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string. Docker Compose builds this for you automatically. |
| `APP_SECRET` | **Yes** | Random 32+ char string signing sessions — `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Public base URL of your instance — used to build magic-link and invite URLs. |
| `STORAGE_DRIVER`, `SMTP_*`, `GOOGLE_CLIENT_*`, `S3_*` | No | File storage, email, and OAuth — all optional, all with free/local defaults. |

## Local development setup

Read [doc/CLAUDE.md](doc/CLAUDE.md) first — it documents the architecture invariants and UI conventions every change is expected to follow. For anything beyond a small fix, open an issue first to discuss the approach.

```bash
pnpm install
cp .env.example .env      # set APP_SECRET and NEXT_PUBLIC_APP_URL
pnpm dev                  # runs the Next.js app + background worker together
```

Before opening a PR, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Database setup and migrations

Schema lives under `lib/db/schema/`, generated SQL migrations under `drizzle/`.

```bash
pnpm db:generate     # after changing a schema file — writes a migration under drizzle/
pnpm db:migrate      # applies pending migrations (uses a custom per-file runner, not
                      # drizzle-kit's built-in one — see scripts/migrate.ts)
```

With Docker Compose, the one-shot `migrate` service runs this for you:
`docker compose run --rm migrate`. **Commit the generated migration** — CI fails if a
schema file changed without one.

## Running the application

```bash
pnpm dev          # app + worker together, for local development
pnpm build         # production build
pnpm start         # serve the production build (app only — see below)
```

## Running the worker

**The background worker is required, not optional, for production.** `pnpm start` /
the `app` container alone does **not** process background jobs. A separate process — the
pg-boss worker — handles sending emails (invites, magic links, notifications), notification
digests, reminders, trash/storage cleanup, and workspace deletion. Skip it and the app still
loads and page editing still works, but invites, notifications, and cleanup jobs silently do
nothing.

- **Docker:** the `worker` service in `docker-compose.yml` runs automatically alongside `app`.
- **Manual/Node:** run `pnpm worker` in a second terminal (`pnpm worker:start` for a
  one-shot, non-watching run in production).

See [SELF-HOSTING.md §9](SELF-HOSTING.md#9-running-the-background-worker) for details.

## Docker setup

Two images: `Dockerfile` (multi-stage — `migrator`/`builder`/`runner` targets) for the app
and the one-shot migration step, and `Dockerfile.worker` for the background worker.

```bash
docker compose up -d --build     # builds and starts postgres + app + worker
docker compose run --rm migrate  # apply the database schema (first run, and after updates)
```

## Docker Compose usage

Three compose files, alternatives for different setups — never used together:

| File | Use it when |
|------|-------------|
| `docker-compose.yml` | The base stack: PostgreSQL + app + worker, built from source |
| `docker-compose.local.yml` | Add on top to publish the app on `http://localhost:3000` without a reverse proxy |
| `docker-compose.external-db.yml` | You already have PostgreSQL (Neon, Supabase, RDS, etc.) |

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker compose logs -f worker     # watch background jobs (email, cleanup) run
docker compose down                # stop it — your data stays in named volumes
```

Optional local stand-ins for external services (no S3 account / SMTP provider needed):
`docker compose --profile extras up -d` starts Mailpit (fake SMTP) and MinIO
(S3-compatible storage). See [SELF-HOSTING.md §5-6](SELF-HOSTING.md).

## Testing

```bash
pnpm test        # runs the suite once (Vitest)
pnpm test:watch  # watch mode
```

The suite covers pure functions deliberately — password validation rules, the
secret-encryption helper used for stored SMTP/S3/OAuth credentials, the Formula property
language, and display-name fallback logic. No database, no network, so it can't flake. See
`tests/`.

## CI

Every push and pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
typecheck, lint, test, build, and a separate job that verifies database migrations apply
cleanly to a fresh PostgreSQL and that no schema change is missing its generated migration.
[`.github/workflows/docker-build.yml`](.github/workflows/docker-build.yml) additionally
sanity-checks that both Docker images still build (no push, no registry). See
[docs/CI-CD-COMPARISON.md](docs/CI-CD-COMPARISON.md) for the full breakdown.

## Production deployment

The documented, supported path is Docker Compose — see **Docker Compose usage** above and
[SELF-HOSTING.md §2](SELF-HOSTING.md#2-docker-compose-recommended) for the full walkthrough,
including running behind a reverse proxy (Dokploy/Traefik, Caddy, nginx) at
[SELF-HOSTING.md §12](SELF-HOSTING.md#12-reverse-proxy--production-notes). Whatever
platform you deploy to, you need **three** things running: the `app` process, the `worker`
process (see above — required, not optional), and the one-shot `migrate` step on each
deploy before the other two start.

Container platforms (Coolify, Dokploy, Portainer, Kubernetes, etc.) can build from this
repo's Dockerfiles directly today. Pre-built images published to GHCR are on the roadmap —
see [RELEASING.md](RELEASING.md) — but not yet the primary distribution path.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for project layout, conventions, and the full local
setup. Everyone participating is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Pagevo handles authentication, passwords, and workspace data. If you find a security vulnerability, please **don't** open a public issue — see [SECURITY.md](SECURITY.md) for how to report it privately.

Since you're running your own instance, you're also responsible for the security of your own deployment — keep `APP_SECRET` and your database/SMTP/S3 credentials out of source control and up to date.

## License

AGPL-3.0 — see [LICENSE](LICENSE). You're free to run, modify, and self-host Pagevo; if you distribute a modified version as a network service, you must make your changes' source available too.

Copyright (C) 2026 Pagevo contributors.
