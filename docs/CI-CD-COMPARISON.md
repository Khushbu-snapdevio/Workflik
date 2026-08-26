# CI/CD Comparison — Workflik (Pagevo) vs Docket

Analysis only — no changes made to either repo.

## Summary

| | Workflik | Docket |
|---|---|---|
| GitHub Actions | Available (partial) | Available |
| Docker image | Available | Available |
| CI (lint/typecheck/test/build) | **Not available** | Available |
| Release/Publish (GHCR) | **Not available** | Available |

Workflik has real, working Docker infrastructure and one GitHub Actions workflow — but that workflow only sanity-checks the Docker build. It does not run lint/typecheck/tests, and there is no pipeline that publishes an image anywhere. Docket has both: a `ci.yml` that gates every push/PR, and a `release.yml` that builds, tags, and publishes multi-arch images to GHCR automatically off a `package.json` version bump.

---

## 1. Workflik — current state

### GitHub Actions
**[.github/workflows/docker-build.yml](../.github/workflows/docker-build.yml)**
- Triggers: `push`/`pull_request` on `main`.
- Sets up QEMU + Buildx, then runs `docker/build-push-action@v6` three times with `push: false`:
  - `Dockerfile` target `migrator`
  - `Dockerfile` target `runner`
  - `Dockerfile.worker`
  - All built for `linux/amd64,linux/arm64`, cached via `type=gha`.
- Copies `.env.example` → `.env` and runs `docker compose config --quiet` to validate `docker-compose.yml` structurally.
- **This is the only workflow in the repo.** It never runs `pnpm lint`, `pnpm typecheck`, or any tests, and it never pushes an image anywhere (`push: false` throughout, no registry login step).

### Docker
- **[Dockerfile](../Dockerfile)** — multi-stage (`deps` → `migrator` / `builder` → `runner`), Next.js `standalone` output, non-root user, baked-in `HEALTHCHECK` hitting `/api/health`. Solid.
- **[Dockerfile.worker](../Dockerfile.worker)** — separate slim image for the pg-boss worker, heartbeat-file healthcheck.
- **[docker-compose.yml](../docker-compose.yml)** + `docker-compose.local.yml` + `docker-compose.external-db.yml** — all three services (`postgres`, `migrate`, `app`, `worker`) plus optional `mailpit`/`minio` profiles. Named volumes pinned for redeploy safety.
- Every compose file **builds from source** (`build: {context: ., dockerfile: Dockerfile}`) — there is no variant that pulls a pre-built image, because no image is ever published.
- No OCI labels (`org.opencontainers.image.*`) on the image, and no `APP_VERSION` build-arg — nothing stamps a version into the running container or into `/api/health`.

### CI
- No `pnpm typecheck`, `pnpm lint`, or test step is wired into any workflow.
- **No test suite exists at all** — no `vitest`/`jest` dependency, no `tests/` directory, and `package.json` has no `test` script.
- No CI job validates that Drizzle migrations are checked in (the "schema changed but migration wasn't generated" failure mode).

### Release/Publish
- No `release.yml` or equivalent.
- No GHCR (or any registry) login/push step anywhere.
- No semver tagging, no GitHub Releases, no `CHANGELOG.md` at the repo root.
- No `.node-version` file (not currently needed since the only workflow is Docker-only and never runs Node directly).

---

## 2. Docket — reference implementation

### GitHub Actions
**`.github/workflows/ci.yml`**
- Triggers: `push` to `main`, all `pull_request`s, `workflow_dispatch`. Uses a `concurrency` group to cancel superseded runs.
- Job `check` (typecheck/lint/build):
  1. `pnpm docs:check` — fails fast if the README's version references drift from `package.json` (runs before install, since it's a plain-Node script).
  2. `pnpm install --frozen-lockfile`
  3. `pnpm typecheck`
  4. `pnpm lint` (Biome, zero-findings policy)
  5. `pnpm test` (Vitest — pure-function tests only: tokens, hashing, webhook signatures, IP extraction; no DB/network, so it can't flake)
  6. `pnpm build`, with placeholder `DATABASE_URL`/`APP_SECRET`/`NEXT_PUBLIC_APP_URL` env vars so `lib/env.ts` Zod validation passes without a real database.
- Job `migrations` (parallel, own Postgres service container):
  1. Installs deps.
  2. Runs `pnpm setup` (migrate + seed) against a fresh Postgres.
  3. Runs `pnpm db:generate` again and fails the build if `git diff` shows uncommitted changes under `db/migrations` — catches schema changes that shipped without a generated migration.

**`.github/workflows/release.yml`**
- Triggers on `workflow_run` **after `CI` completes successfully on `main`** (not a plain `push` — this makes CI a real gate; a red CI publishes nothing), plus `workflow_dispatch`.
- Job `check`: reads `version` from `package.json`; if no `vX.Y.Z` git tag exists yet, this run is a "release" (`is_release=true`); otherwise it's just an edge build. Also requires a matching `## [X.Y.Z]` section in `CHANGELOG.md` before allowing a release.
- Job `image` (needs `check`): builds and pushes multi-arch (`amd64`+`arm64`) via QEMU/Buildx to `ghcr.io/<repo>` using `docker/metadata-action` for tag derivation:
  - Always: `main`, `sha-<short>`.
  - On release only: `X.Y.Z`, `X.Y`, `X`, `latest`.
  - Registry-backed build cache (`type=registry`, survives across runs, unlike `type=gha`'s 10GB cap).
  - `provenance: true`, `sbom: true`; `APP_VERSION` build-arg stamped into the image for `/api/health` to report.
- Job `verify-public` (needs `image`): anonymously requests a pull token from `ghcr.io` for the tag just pushed and fails the run if the package is still private — catches the "new GHCR package defaults to private" trap before a customer hits it.
- Job `release` (needs `check`+`image`, only on an actual release): extracts the CHANGELOG section for this version, creates the `vX.Y.Z` git tag + a GitHub Release via `gh release create`, targeting the exact commit CI tested (not `github.sha`, which on `workflow_run` points at the branch head).

### Docker
- **`Dockerfile`** — single multi-stage file (`base` → `deps` → `build` → `runner`), OCI `LABEL org.opencontainers.image.*` block, `APP_VERSION` build-arg, `HEALTHCHECK` baked into the image itself.
- **`docker-compose.yml`** — the *default*, customer-facing file: pulls the **published image** (`x-image: ghcr.io/stack256org/docket:${IMAGE_TAG:-latest}`), does not build anything locally.
- **`docker-compose.build.yml`** — alternate file for building from source (needed only if you want to bake in Pusher keys or change code).
- **`docker-compose.external-db.yml`** — bring-your-own Postgres variant.

### CI
Fully covered above — typecheck, lint, unit tests, build validation, and migration-drift detection, all gating every push/PR.

### Release/Publish
Fully automated: bump `package.json` version + add `CHANGELOG.md` section + push → CI runs → release workflow tags, builds, publishes to GHCR, verifies public pullability, and cuts a GitHub Release. Nothing is tagged or published by hand.

---

## 3. What Workflik is missing, concretely

1. **A `ci.yml` workflow** gating push/PR with: install → typecheck → lint → build, and (if a test suite is added) test. Workflik's `package.json` already has `typecheck`/`lint`/`build` scripts, so this is mostly wiring, not new tooling.
2. **A test suite.** No `vitest`/test runner is installed, no `tests/` directory exists, no `test` script in `package.json`. Docket's pattern (pure-function tests, no DB/network) would need to be built from scratch for Workflik, not copied.
3. **A migrations-drift CI job.** Workflik has `db:generate` and `db:migrate` scripts but no `setup` script (migrate+seed combined) and no CI job running `db:generate` against a fresh Postgres service container to catch an uncommitted migration.
4. **A `release.yml` workflow** for GHCR publishing: version-vs-tag check, multi-arch build+push with registry cache, a `verify-public` anonymous-pull check, and automated tagging/GitHub Release creation from a `CHANGELOG.md` section.
5. **A root `CHANGELOG.md`** — required by the release gate pattern above (and currently absent).
6. **A `.node-version` file** — needed once a workflow runs Node directly via `actions/setup-node` (the current Docker-only workflow doesn't need it, but `ci.yml` would).
7. **OCI image labels + `APP_VERSION` build-arg** in Workflik's `Dockerfile`, so a running container can report which build it is (Docket surfaces this via `/api/health`) and the GHCR package page shows proper title/description/source metadata.
8. **A "pull the published image" compose variant.** Once images are published, the current `docker-compose.yml` (which always builds from source) should either become `docker-compose.build.yml` and be replaced by a new default that pulls `ghcr.io/<org>/pagevo:${IMAGE_TAG:-latest}`, mirroring Docket's three-file split.
9. **Extending the existing `docker-build.yml`** rather than replacing it — it already has working QEMU/Buildx multi-arch setup and could plausibly be merged into (or feed) the new `release.yml`'s `image` job instead of duplicating that setup.

Item 4 depends on items 5 and 6; item 8 depends on item 4 (no point in a "pull" compose file before something is actually published). Items 1–3 are independent of the rest and are the lowest-risk starting point.
