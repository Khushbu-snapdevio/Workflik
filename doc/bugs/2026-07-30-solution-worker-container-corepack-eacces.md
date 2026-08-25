# Solution: worker container would crash-loop on first deploy (corepack EACCES)

## What changed

**`Dockerfile.worker`** (`runner` stage):
- Dropped `ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0` and the `RUN corepack enable` call — neither is needed once the runtime path no longer invokes `pnpm`.
- Changed `CMD ["pnpm", "worker:start"]` to `CMD ["/app/node_modules/.bin/tsx", "scripts/worker.ts"]`, invoking the already-installed `tsx` binary directly instead of going through the `pnpm` → corepack indirection.

This mirrors the fix already shipped and verified working in Kanbanica's `Dockerfile.worker`.

## Why this fixes the root cause

`tsx` is a `dependencies` entry (not `devDependencies`) in `package.json`, so it's already present in `node_modules/.bin` after the `deps` stage's `pnpm install --frozen-lockfile --prod`, and that `node_modules` is copied wholesale into the `runner` stage. Running it directly skips corepack entirely at runtime — there's no package-manager-version check, no cache directory, and nothing for the non-root `pagevo` user to fail to write to. The container now starts the worker process the same way `pnpm worker:start` would have (`tsx scripts/worker.ts`), just without the corepack indirection that only worked for the root user.

The `deps` stage (build-time) and the `migrator` target in the main `Dockerfile` (runtime, but runs as root) both still use `corepack enable` + `pnpm` — that's fine, since both have a writable `$HOME` for whichever user runs them.

## Also fixed in this pass (same audit, same root class of bug — Dokploy volume orphaning)

While comparing against Kanbanica, its `docker-compose.yml` documents a second production incident: some deploy tools (observed with Dokploy) don't keep the Compose project name stable across redeploys, so unnamed top-level volumes (`<project>_<volume>`) can silently be recreated empty on redeploy — orphaning the old volume (Postgres data or uploads) without any error.

Pagevo hadn't been deployed yet, so this hadn't caused data loss here, but it's the same class of proactive fix: pin the named volumes in `docker-compose.yml` to fixed literal names before the first real deploy, rather than after data is lost.

- `postgres_data` → `name: pagevo_postgres_data`
- `uploads` → `name: pagevo_uploads`
- `minio_data` → `name: pagevo_minio_data`

## Also fixed: `.dockerignore` hygiene

Added `pnpm-debug.log*`, `coverage`, and `.DS_Store` to `.dockerignore` to match Kanbanica's build-context exclusions (avoids accidentally sending log/coverage artifacts into the Docker build context).

## Verification

- Not live-tested — Docker is not available in this sandbox, so the image was not actually built or run.
- Verified by inspection: `tsx` is confirmed present in `dependencies` (not `devDependencies`) in `package.json`, so it will exist in `node_modules/.bin` inside the `runner` stage. The `Dockerfile.worker` still `COPY`s `config`, `lib`, and `scripts` (unchanged), which is everything `scripts/worker.ts` needs.
- The `migrate` service and `app` container's startup paths were checked and confirmed unaffected (root user / no `pnpm` at runtime, respectively).
- Recommend a real `docker compose up -d --build` on the target server as the first real-world confirmation before relying on this in production.
