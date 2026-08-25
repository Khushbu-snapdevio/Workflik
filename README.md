# Pagevo

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

## Tech stack

Next.js (App Router) + TypeScript · PostgreSQL + Drizzle ORM · Better Auth (magic-link, email+password, Google) · TipTap editor · pg-boss background jobs · Tailwind CSS · S3-compatible storage or local disk · SMTP or console-logged email in dev.

## Contributing

Read [doc/CLAUDE.md](doc/CLAUDE.md) first — it documents the architecture invariants and UI conventions every change is expected to follow. For anything beyond a small fix, open an issue first to discuss the approach.

Local setup:

```bash
pnpm install
cp .env.example .env      # set APP_SECRET and NEXT_PUBLIC_APP_URL
pnpm dev                  # runs the Next.js app + background worker together
```

Before opening a PR, run:

```bash
pnpm lint
pnpm typecheck
```

## Security

Pagevo handles authentication, passwords, and workspace data. If you find a security vulnerability, please **don't** open a public issue — report it privately via [GitHub's private vulnerability reporting](../../security/advisories/new) for this repo, or by emailing the maintainer directly. Include a description, reproduction steps, and the version/commit affected.

Since you're running your own instance, you're also responsible for the security of your own deployment — keep `APP_SECRET` and your database/SMTP/S3 credentials out of source control and up to date.

## License

AGPL-3.0 — see [LICENSE](LICENSE). You're free to run, modify, and self-host Pagevo; if you distribute a modified version as a network service, you must make your changes' source available too.
