# Contributing to Pagevo

Thanks for your interest in contributing! Pagevo is an open-source, self-hostable
Notion-style team workspace built with Next.js, Drizzle ORM, and PostgreSQL.

## Getting started

**Prerequisites:** Node.js 20+ (the Docker image itself uses 22), pnpm (version pinned in
`packageManager`, install via `corepack enable`), and either Docker or a local PostgreSQL 16+.

```bash
git clone <your-fork-url> pagevo
cd pagevo
pnpm install
cp .env.example .env          # set APP_SECRET (32+ chars) and NEXT_PUBLIC_APP_URL
pnpm dev                      # runs Next.js + the background worker together
```

No admin account yet? The first account to sign in on a fresh instance is auto-promoted to
admin. See [SELF-HOSTING.md](SELF-HOSTING.md) for every setup detail (database options,
file storage, email, sign-in methods).

## Project layout

```
app/            Next.js App Router (pages, API routes)
components/     UI components
lib/            db client, auth, permissions, storage, formula engine, background jobs
lib/db/schema/  Drizzle schema
drizzle/        generated SQL migrations + snapshots — never hand-edit
scripts/        migrate, seed/admin, and worker entrypoints
tests/          Vitest — pure-function tests only, see below
doc/            product spec, engineering conventions, and dated bug/fix logs
```

Read [doc/CLAUDE.md](doc/CLAUDE.md) before making any non-trivial change — it documents the
architecture invariants (closure tables, permission resolution, background jobs) and UI
conventions every change is expected to follow.

## Conventions

- **TypeScript everywhere.** Run `pnpm typecheck` before pushing — it must pass.
- **Lint/format with Biome:** `pnpm lint` (check) / `pnpm lint:fix` (autofix).
- **Tests:** `pnpm test` (Vitest, in `tests/`). The suite covers pure functions only —
  password rules, the secret-encryption helper, the Formula property language, display-name
  fallback logic — deliberately nothing that needs a database or network, so it can't flake.
  Add a test alongside similar pure logic; don't add a test that requires a live database.
- **Database:** add/change a schema file under `lib/db/schema/`, then run `pnpm db:generate`
  and commit the resulting file(s) under `drizzle/` (including the updated
  `drizzle/meta/_journal.json` snapshot). **CI fails if the schema changed without a
  committed migration.**
- **New env var:** add it to `lib/env.ts` **and** `.env.example`, with a comment explaining
  what it's for.

## Making a change

1. Create a branch off `main`.
2. Make your change; keep it focused. For anything beyond a small fix, open an issue first
   to discuss the approach.
3. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` locally — CI runs all
   four, plus a migrations check against a real Postgres. See
   [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
4. Open a pull request describing **what** changed and **why**. Screenshots help for UI
   changes.

## Reporting bugs / requesting features

Open an issue with clear reproduction steps (for bugs) or the problem you're trying to
solve (for features). Please check existing issues first.

**Security vulnerabilities don't go in issues** — see [SECURITY.md](SECURITY.md).

Everyone participating here is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

By contributing, you agree your contributions are licensed under this project's AGPL-3.0
license (see [LICENSE](LICENSE)).
