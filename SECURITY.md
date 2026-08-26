# Security Policy

## Supported versions

Pagevo is pre-1.0 and has not yet published a tagged release. Security fixes land on
`main`; there are no long-term support branches. If you are self-hosting, run a recent
commit from `main`.

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| Anything older | ❌ — upgrade |

## Reporting a vulnerability

**Please do not open a public GitHub issue for a security vulnerability.**

Report it privately via **GitHub's private vulnerability reporting**:
[Security → Report a vulnerability](../../security/advisories/new) on this repository.

Helpful to include: affected version or commit, deployment shape (Docker Compose vs
manual/Node, which storage driver), reproduction steps or a proof of concept, and what an
attacker gets out of it.

### What to expect

- An acknowledgement once the report is triaged.
- An assessment and a rough fix timeline after that.
- Credit in the release notes, unless you'd rather stay anonymous.

This is a small, volunteer-maintained project — there is no bug bounty. Please give
maintainers a reasonable window to ship a fix before disclosing publicly.

## Scope

In scope: anything in this repository — the Next.js app, the background worker, auth flows
(sessions, magic links, workspace invites), permission resolution, and the Docker
images/Compose files built from here.

Out of scope:

- Vulnerabilities in third-party dependencies with no exploitable path through this app —
  report those upstream instead.
- Findings that require an already-compromised host, database, or admin account.
- Misconfiguration of *your own* deployment: a weak or default `APP_SECRET`, a publicly
  exposed Postgres port, running without TLS, a world-readable `.env`.
- Reports generated wholesale by an automated scanner with no verified exploit path.

## Notes for self-hosters

A few things are your responsibility, not the application's — worth checking before you go
live:

- `APP_SECRET` must be 32+ genuinely random characters, unique per deployment
  (`openssl rand -base64 32`). It signs sessions — a guessable one is game over.
- Terminate TLS in front of the app (Nginx, Caddy, Traefik, or your platform's proxy).
  `NEXT_PUBLIC_APP_URL` should be the `https://` URL.
- Never expose the Postgres port publicly. The bundled Compose service isn't published to
  the host by default, and it should stay that way — see `docker-compose.yml`.
- The background **worker** process must be running for invites, notifications, and
  cleanup jobs to work — see the README and [SELF-HOSTING.md](SELF-HOSTING.md#9-running-the-background-worker).

> **Maintainer note:** this file does not list a dedicated security-contact email — GitHub
> private vulnerability reporting (linked above) is the only channel documented right now.
> Add a monitored security-contact address here if the project wants a fallback channel for
> reporters without a GitHub account.
