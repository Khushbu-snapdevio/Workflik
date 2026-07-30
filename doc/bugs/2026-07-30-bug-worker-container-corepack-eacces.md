# Bug: worker container would crash-loop on first deploy (corepack EACCES)

**Reported:** 2026-07-30 (found during a pre-deployment Docker audit, before this stack had ever been deployed to a server)

## Symptom

Not yet observed in WorkFlik directly — caught proactively while comparing this repo's Docker setup against [Kanbanica](../../../Kanbanica), a sibling project with (nearly) the same Docker/Next.js/pg-boss architecture that is already running in production. Kanbanica hit this exact failure on its own first server deploy: the `worker` container would crash-loop immediately on start.

Expected behavior: `docker compose up -d` brings up `postgres`, `migrate`, `app`, and `worker`, and the worker stays running and processes pg-boss jobs.

## Root cause

`Dockerfile.worker`'s `runner` stage ran `RUN corepack enable` and then, after dropping to the non-root `workflik` user (`USER workflik`), used `CMD ["pnpm", "worker:start"]` to start the process.

Corepack doesn't just install shims at `corepack enable` time — the *first* invocation of `pnpm` at runtime checks whether the pinned package manager version (from `package.json`'s `packageManager` field) is already cached, and if not, tries to download and initialize it into `$HOME/.cache`. For the non-root `workflik` user on a fresh container/host, that directory either doesn't exist or isn't writable, so the download fails with `EACCES`, and `pnpm worker:start` — and therefore the whole worker container — never starts.

This didn't affect the `app` container (its runtime `CMD` is `node server.js`, which never invokes `pnpm`) or the `migrate` service (built from the `Dockerfile` `migrator` target, which runs as **root**, so corepack's cache directory is writable there).
