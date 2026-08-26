# Workflik (Pagevo) — Repository Readiness Audit

Reference implementation: Docket (`d:\next\docket\docket`). Analysis only — no files in
either repo were changed. Builds on the prior [CI-CD-COMPARISON.md](CI-CD-COMPARISON.md);
this audit covers documentation, metadata, licensing, and README quality on top of that.

Note: the app itself is branded **Pagevo** in-repo (README title, `package.json` name,
Docker user/labels) even though the repo folder and prior conversation call it "Workflik" —
this audit uses "Workflik" only to refer to the repository per your request.

---

## 1. Repository documentation files

| File | Workflik | Docket | Notes |
|---|---|---|---|
| `README.md` | ✅ present, 58 lines | ✅ present, 718 lines | Workflik's is a thin quick-start; see §5 for detail |
| `LICENSE` | ✅ present (AGPL-3.0) | ✅ present (MIT) | Workflik's copyright line was **never filled in** — see §4 |
| `CHANGELOG.md` | ❌ missing | ✅ present, Keep a Changelog format | See §6 |
| `CONTRIBUTING.md` | ❌ missing (folded into README §"Contributing", 4 lines) | ✅ present, 87 lines | Workflik's inline version has no project-layout map, no conventions list, no PR checklist |
| `SECURITY.md` | ❌ missing (folded into README §"Security", 3 lines) | ✅ present, 67 lines | Workflik's inline version has no scope, no supported-versions table, no self-hoster checklist |
| `CODE_OF_CONDUCT.md` | ❌ missing, not referenced anywhere | ✅ present, 45 lines | No equivalent content exists anywhere in Workflik |
| `RELEASING.md` | ❌ missing (N/A — no release process exists yet) | ✅ `docs/releasing.md` (not root) | Depends entirely on the release.yml gap identified in CI-CD-COMPARISON.md §3 |
| `.node-version` | ❌ missing | ✅ present (`22`) | Needed once a Node-based CI job (`actions/setup-node`) exists |
| `.gitignore` | ✅ present, 27 lines | ✅ present, 53 lines | See §2 for the gaps |
| `AGENTS.md` | ✅ present | (Docket keeps the equivalent as root `CLAUDE.md`) | Workflik-specific, fine as-is, no Docket equivalent to compare against |
| `doc/README.md`, `doc/CLAUDE.md` | ✅ present | Docket's equivalent is root `CLAUDE.md` | Just a different location convention, not a gap |
| `SELF-HOSTING.md`, `SAAS-TO-SELF-HOSTED.md` | ✅ present, extensive | Docket spreads the same material across `docs/*.md` (17 topic files) | See note below |
| `doc/bugs/*.md` (~200+ files) | ✅ present | No equivalent | Dated internal bug/solution logs (e.g. `2026-07-14-bug-*.md`) — see flag below |
| `.github/ISSUE_TEMPLATE/` | ❌ missing | ✅ `bug_report.yml`, `feature_request.yml`, `config.yml` | |
| `.github/PULL_REQUEST_TEMPLATE.md` | ❌ missing | ✅ present | |

**Does Workflik need a new file?** Yes for `CHANGELOG.md`, `CONTRIBUTING.md`,
`SECURITY.md`, `CODE_OF_CONDUCT.md`, `.node-version`, and the two `.github` templates.
`RELEASING.md`/`docs/releasing.md` should wait until a `release.yml` actually exists
(no point documenting a process that doesn't exist).

**Does an existing file need updating?** `README.md` (§5), `LICENSE` (§4), `.gitignore`
(§2), and `package.json` (§2).

**Is Docket's version directly applicable?** Mostly yes for CONTRIBUTING/SECURITY/CODE_OF_CONDUCT
— those are generic open-source hygiene files that adapt cleanly to any project (swap
project name, tech stack list, and contact email). **Not** directly applicable as a copy-paste:
Docket's CONTRIBUTING references Vitest/`tests/`, which Workflik doesn't have (§6); Docket's
SECURITY references its own scope (worker, public API, Zammad importer) which doesn't match
Workflik's feature set (block editor, database views, Orbit admin panel).

**Flag — `doc/bugs/`:** ~200+ dated files like `doc/bugs/2026-07-14-bug-notification-no-dismiss.md`
paired with `-solution-*.md` files read as a running engineering log/scratch history, not
curated documentation a self-hoster or contributor would read. Docket's `docs/` directory,
by contrast, is entirely reference material (API, auth, backups, permissions). This isn't
a defect, but worth a deliberate decision: keep it as internal history, or move it out of
the tracked-and-public `doc/` tree if it's not meant to ship in a public OSS repo.

---

## 2. Project/repository metadata

### `package.json`

| Field | Workflik | Docket |
|---|---|---|
| `name` | `pagevo` | `docket` |
| `version` | `0.1.0` | `0.4.2` |
| `description` | ❌ absent | ✅ present |
| `license` | ❌ absent | ✅ `"license": "MIT"` |
| `author` | ❌ absent | ✅ `"Stack256 <bhadanirohit1@gmail.com>"` |
| `repository` / `homepage` / `bugs` | ❌ absent | ✅ all present, point at GitHub |
| `keywords` | ❌ absent | ✅ present (10 keywords, aids npm/GitHub discovery) |
| `engines` | ❌ absent | ✅ `{"node": ">=22"}` |
| `packageManager` | ✅ `pnpm@11.6.0` | ✅ `pnpm@11.6.0` — match |
| `private` | ✅ `true` | ✅ `true`, with a `"//private"` comment explaining why (guards against accidental `npm publish`, unrelated to the repo being public) |

The missing `license` field is a real inconsistency: the `LICENSE` file says AGPL-3.0, but
nothing in `package.json` declares it — tooling that reads `package.json` metadata (license
scanners, dependency auditors, some package registries' repo-health scores) will see no
license at all.

**Scripts** — `pnpm run` comparison:

| Script | Workflik | Docket |
|---|---|---|
| `dev`, `dev:next`, `build`, `start`, `lint`, `lint:fix`, `format`, `typecheck` | ✅ | ✅ |
| `worker`, `worker:start` | ✅ | ✅ |
| `db:push`, `db:generate`, `db:reset`, `make:admin` | ✅ | ✅ |
| `db:migrate` | ✅ custom runner (`tsx scripts/migrate.ts`) | uses `drizzle-kit migrate` directly |
| `test` | ❌ absent | ✅ `vitest run` / `test:watch` |
| `setup` (migrate + seed in one step) | ❌ absent | ✅ `tsx scripts/setup.ts` |
| `seed` / `db:seed` | ❌ absent | ✅ present |
| `create:admin` (password-settable, scriptable) | ❌ absent — only `make:admin` (promote existing user) | ✅ present |
| `docs:sync` / `docs:check` | ❌ absent | ✅ present — keeps README's version-tag ladder in sync with `package.json`, enforced in CI |
| `migrate:voting` | ✅ present (one-off historical migration) | N/A — Workflik-specific, fine |

The `test` script gap matches the CI-CD-COMPARISON.md finding: there is no test suite to
run in the first place. `docs:sync`/`docs:check` and `create:admin` are only worth adding
to Workflik once the corresponding features exist (a generated version-tag ladder in the
README, a scriptable admin-creation flow) — they're not generically useful scripts to bolt on.

### `.gitignore`

Workflik's is shorter but covers the essentials (`node_modules`, `.next`, `.env*`,
`uploads`, `tsconfig.tsbuildinfo`, `.krova-postgres` for the embedded dev DB). Gaps versus
Docket's:
- `next-env.d.ts` is **not** ignored. Docket explicitly ignores this Next.js-autogenerated
  file; Workflik tracks it in git — and the git status at the start of this session shows
  `M next-env.d.ts` modified, which is exactly the churn ignoring it would prevent.
- `/coverage` — irrelevant today (no test runner), becomes relevant the moment `test` scripts
  with coverage are added.
- Local DB dump patterns (`*.sql.gz`, `*.sql.zst`, `*.dump`) — Docket ignores these
  because its backup docs recommend dumping to a file in the repo root; only worth adding
  to Workflik if its own backup instructions do the same (check `SELF-HOSTING.md`).

### Environment example files

Workflik ships **one** file, `.env.example`, covering both local dev and Docker Compose
(Compose-only vars like `POSTGRES_*` are commented inline in the same file). Docket ships
**two** — `.env.example` (local dev, `DATABASE_URL` pointing at `localhost`) and
`.env.docker.example` (Docker Compose, pointing at the `postgres` service hostname) —
because Docket's default `docker-compose.yml` pulls a **published image** and is meant to be
`curl`'d standalone by someone who never clones the repo, so it needs a self-contained env
file to go with it.

**This split is not yet applicable to Workflik.** Workflik doesn't publish an image (per
CI-CD-COMPARISON.md), so every user who runs `docker compose up` has already cloned the repo
and has the single `.env.example` right there — a second file would be pure duplication
today. Splitting the file only becomes worth doing *if and when* Workflik starts publishing
images and wants a `curl`-only quick start like Docket's.

### Docker / Docker Compose / GitHub configuration

Already covered in detail in [CI-CD-COMPARISON.md](CI-CD-COMPARISON.md) — no new findings
since that analysis; restated in §3 below for completeness against this audit's checklist.

No `CODEOWNERS` or `FUNDING.yml` in either repo — not flagged as a gap since Docket itself
doesn't have them either.

---

## 3. CI/CD and release infrastructure (recap + verification)

Re-verified against the current repo state; no changes since the prior analysis.

| Item | Workflik | Docket |
|---|---|---|
| `.github/workflows/ci.yml` | ❌ does not exist | ✅ typecheck, lint, test, build + migrations-drift job |
| `.github/workflows/docker-build.yml` | ✅ exists — build-only sanity check, `push: false`, multi-arch (QEMU+Buildx), validates `docker-compose.yml` | Docket has no equivalent standalone file — its build+push logic lives inside `release.yml`'s `image` job |
| `.github/workflows/release.yml` | ❌ does not exist | ✅ version-vs-tag check → multi-arch build+push to GHCR → anonymous-pull verification → tag + GitHub Release |
| Dockerfiles | ✅ `Dockerfile` (multi-stage: deps/migrator/builder/runner) + `Dockerfile.worker`, non-root user, healthchecks | ✅ single `Dockerfile` (base/deps/build/runner), OCI labels, `APP_VERSION` build-arg |
| Docker Compose files | ✅ 3 files, all build-from-source | ✅ 3 files, default + external-db pull a published image, `build.yml` builds from source |
| Multi-arch builds | ✅ already wired (QEMU+Buildx in `docker-build.yml`) | ✅ same tooling, in `release.yml` |
| GHCR publishing | ❌ none | ✅ `ghcr.io/stack256org/docket`, full tag ladder |
| Release/tag automation | ❌ none | ✅ automatic tag + GitHub Release from `package.json` version |
| Changelog-based releases | ❌ N/A, no `CHANGELOG.md` | ✅ release body extracted from `CHANGELOG.md` section |
| Migration checks in CI | ❌ none | ✅ dedicated `migrations` job against a real Postgres service container |
| Typecheck/lint/test/build checks in CI | ❌ none run automatically | ✅ all four, blocking |

Adaptation notes specific to Workflik's architecture (not just "copy Docket"):
- Workflik already has working multi-arch build tooling in `docker-build.yml` — a new
  `release.yml` should **reuse that job's QEMU/Buildx setup** rather than duplicate it, and
  the existing sanity-check workflow can likely be folded into (or kept alongside) the
  release pipeline's build step.
- Workflik builds **two** images (app + worker via `Dockerfile.worker`) versus Docket's
  one image running different commands — any release workflow needs to push and tag *both*
  images, not just one.
- Workflik's migrator is a separate Dockerfile *target* (`migrator`) rather than a script
  run against the runtime image (Docket's `pnpm setup`) — the migrations-drift CI job would
  need `pnpm db:generate` run directly (not via Docker) against a Postgres service
  container, same shape as Docket's job, just without needing a Docker build first.

---

## 4. License and copyright

| | Workflik | Docket |
|---|---|---|
| License | **AGPL-3.0** (GNU Affero GPL v3, full text) | **MIT** |
| Different? | **Yes** — copyleft/network-use vs permissive |
| Copyright line in `LICENSE` | ❌ **template placeholder never filled in** — literally `Copyright (C) <year>  <name of author>` at line ~620 | ✅ filled in: `Copyright (c) 2026 Stack256 <bhadanirohit1@gmail.com>` |
| Copyright/attribution in `README.md` | ❌ none — License section states "AGPL-3.0 — see LICENSE" with no holder named | ✅ `Copyright (c) 2026 Stack256.` at the bottom |
| `license`/`author` fields in `package.json` | ❌ neither present | ✅ both present |
| License headers in source files | None found in either repo (checked `lib/`) | None found | Not a gap — neither project uses per-file SPDX headers, this is a consistent, valid choice |

**Finding: Workflik currently has no identifiable copyright holder anywhere in the repo.**
The `LICENSE` file is the unmodified AGPL-3.0 boilerplate — the "How to Apply These Terms"
appendix at the end was never completed with a real name/entity and year. This isn't a
functional problem for the license grant itself (the license terms in the body of the file
apply regardless), but it means there's no clear answer to "who owns the copyright on this
code" from the repo alone, which matters if this is ever meant to look like a genuine
open-source project rather than a private fork with boilerplate left in place.

**On the license difference itself:** AGPL-3.0 vs MIT is a deliberate, substantive choice,
not an oversight — Workflik's own README explains the reasoning ("if you distribute a
modified version as a network service, you must make your changes' source available too"),
and `SAAS-TO-SELF-HOSTED.md` suggests this project is explicitly positioned as a
self-hosted alternative to a SaaS product, where AGPL's network-copyleft clause is a common
and defensible choice specifically to prevent a third party from re-hosting a modified fork
as a competing closed SaaS. **No license change is recommended.** The only recommended
action is filling in the copyright holder/year that AGPL's template requires, and adding
`"license": "AGPL-3.0-only"` (or `-or-later`, matching whichever the project intends — the
file says "either version 3 ... or any later version" so `-or-later` matches the text as
written) to `package.json`.

---

## 5. README quality

Line-by-line against Docket's structure. Workflik's README is 58 lines; Docket's is 718.
Scale difference is expected (different products), but several sections Docket has are
**entirely absent** from Workflik's, not just shorter:

| Section | Workflik | Docket | Gap |
|---|---|---|---|
| What it is / positioning | ✅ one paragraph | ✅ extensive, with screenshots | Workflik's is adequate for a quick-start but has no screenshots |
| Main features | ⚠️ one sentence + link to `doc/README.md` | ✅ full "What you get" section split by audience | Workflik defers everything to an external doc instead of surfacing highlights in the README itself, where most GitHub visitors actually look first |
| Tech stack | ✅ one line, all key pieces named | ✅ table format | Workflik's is fine content-wise, just a denser sentence instead of a scannable table |
| Requirements | ⚠️ implied only (`.env.example`, `docker compose`) | ✅ explicit ("Docker, and nothing else" / "Node.js 22+, pnpm 11+, PostgreSQL 16+") | Workflik never states minimum Node/pnpm/Postgres versions anywhere in the README |
| Local development setup | ✅ present (Contributing section) | ✅ present ("Work on it") | Comparable |
| Environment variables | ❌ not documented in README at all — only in `.env.example` comments | ✅ full tables (required / email / sign-in / notifications / storage) | Real gap — a reader has to open `.env.example` or `SELF-HOSTING.md` to learn what any variable does |
| Database setup/migrations | ⚠️ implied (`docker compose run --rm migrate`) shown, not explained | ✅ explained plus a bundled-Postgres dev option (`pnpm db:local`) | Workflik has no `db:local`-equivalent mentioned for README-only dev setup |
| Running the application | ✅ `pnpm dev` shown | ✅ shown, plus a "no Docker" and "no admin account yet → setup wizard" explanation | Comparable, Docket documents the first-run experience Workflik doesn't mention |
| Running the worker | ⚠️ implied (`pnpm dev` runs both together per the script) but never called out separately | ✅ explicitly documented as a **required second process** in production, with the consequence of skipping it spelled out ("email does not send without it") | Real gap for production deployers — if Workflik's worker is similarly required for background jobs, a reader deploying "just the app" would silently lose that functionality with no warning in the README |
| Docker setup | ✅ shown | ✅ shown, three-file table | Comparable |
| Docker Compose usage | ✅ shown | ✅ shown, plus day-to-day commands, "where your data lives", "updating" | Workflik doesn't document updating (`docker compose pull`/rebuild flow), volume behavior across redeploys, or day-2 operations |
| Testing | ❌ not mentioned | ✅ referenced (`pnpm test`) | Matches the missing test suite — nothing to document yet |
| CI/CD | ❌ not mentioned, no badges | ✅ CI/Release badges at the top, linked from Contributing | Workflik has no status badges since no `ci.yml` exists yet |
| Production deployment | ❌ not covered — README only shows the Docker quick start | ✅ dedicated "Deploying somewhere else" section (any container platform, Railway/Render/Fly, plain server with systemd/PM2) | Real gap — no guidance for anyone not using the exact `docker compose up -d --build` flow |
| Contributing | ✅ present, brief, points to `doc/CLAUDE.md` | ✅ present, points to `CONTRIBUTING.md` + Code of Conduct | Workflik's is adequate but thinner; once a `CONTRIBUTING.md` exists (§1), the README section should link to it the same way |
| License | ✅ present, names AGPL-3.0, explains the network-copyleft implication in one sentence | ✅ present, names MIT, states copyright line | Workflik's explanation is actually *better* here (explains the practical AGPL implication); missing only the copyright line (§4) |

**Summary:** Workflik's README works as a minimal quick-start for someone who already
intends to self-host and is comfortable digging into `SELF-HOSTING.md`. It is missing
content a first-time visitor evaluating the project would look for on the README itself:
environment variable reference, explicit worker-is-required-in-production callout,
version/requirements statement, non-Docker production deployment options, and any
CI status signal. None of this requires new features — it's a documentation gap, and most
of the missing content likely already exists in `SELF-HOSTING.md` and just needs
surfacing/summarizing in the README with links out for detail (which is exactly the pattern
Docket uses).

---

## 6. Changelog and release readiness

**`CHANGELOG.md` does not exist** anywhere in the Workflik repo (confirmed — the only
`CHANGELOG.md` files found are inside `node_modules/`, i.e. third-party dependencies).

If it existed, based on Docket's process, it would need:
- **Keep a Changelog** format (`## [Unreleased]`, then `## [X.Y.Z] - YYYY-MM-DD` sections
  with `### Added`/`Changed`/`Fixed` subsections).
- A `## [0.1.0]` entry matching the current `package.json` version, or a decision to treat
  `0.1.0` as pre-history and start the changelog from the next bump.
- Compare/tag link definitions at the bottom (Docket's release workflow's guard-rail checks
  `grep -rIn <owner>` across files including `CHANGELOG.md`'s link footer).

**Release workflow dependencies**, mapped to current Workflik state:

| Dependency | Required by Docket's `release.yml` | Exists in Workflik? |
|---|---|---|
| `CHANGELOG.md` with a `## [X.Y.Z]` section matching the release version | Yes — hard gate, workflow fails without it | ❌ no |
| `package.json` `version` field | Yes — this is what triggers a release (new version = no matching git tag yet) | ✅ exists (`0.1.0`), never bumped |
| `.node-version` | Indirectly — used by `actions/setup-node` in `ci.yml`, and `release.yml` runs after `ci.yml` succeeds | ❌ no |
| Git tags (`vX.Y.Z`) | Created automatically by the workflow, not manually | N/A — no workflow to create them yet |
| GitHub Releases | Created automatically from the changelog section | N/A — same |

**Conclusion:** a `release.yml` for Workflik cannot function without `CHANGELOG.md`
existing first (it's a hard gate in Docket's pattern, and should be in Workflik's too — an
empty-body release is worse than no automation). The dependency order is: `.node-version` →
`ci.yml` → `CHANGELOG.md` → `release.yml`. This matches the dependency chain already noted
in CI-CD-COMPARISON.md §3.

---

## 7. Final comparison table

| Area | Workflik | Docket | Workflik Action |
|---|---|---|---|
| README | ⚠️ | ✅ | Update — add env var reference, worker-required callout, requirements, non-Docker deploy options, CI badge (once CI exists) |
| LICENSE | ⚠️ | ✅ | Update — fill in the copyright holder/year placeholder; keep AGPL-3.0 (no change recommended) |
| CHANGELOG | ❌ | ✅ | Add — required before any release automation can work |
| CONTRIBUTING | ❌ | ✅ | Add — extract/expand README's inline section into a dedicated file with project layout + conventions |
| SECURITY | ❌ | ✅ | Add — extract/expand README's inline section; scope it to Workflik's actual attack surface |
| CODE_OF_CONDUCT | ❌ | ✅ | Add — generic, low-effort, adapt Docket's almost as-is |
| RELEASING | ❌ (N/A yet) | ✅ | Add — but only after `release.yml` exists; document as you build it, not before |
| .node-version | ❌ | ✅ | Add — prerequisite for a Node-based `ci.yml` |
| package.json metadata | ❌ | ✅ | Update — add `license`, `author`, `description`, `repository`, `engines` |
| .gitignore | ⚠️ | ✅ | Update — add `next-env.d.ts` at minimum (already showing as dirty in git status) |
| GitHub issue/PR templates | ❌ | ✅ | Add — low effort, adapt Docket's YAML forms |
| CI (`ci.yml`) | ❌ | ✅ | Add — typecheck/lint/build now; test job once a suite exists |
| Test suite | ❌ | ✅ | Add — no test runner, no `tests/` dir, no `test` script exist yet |
| Docker | ✅ | ✅ | No action — Workflik's Dockerfiles/Compose setup is comparable in quality, arguably more complex (app+worker split) than Docket's |
| GHCR Release | ❌ | ✅ | Add — `release.yml`, but reuse the multi-arch tooling already in `docker-build.yml` |

---

## Workflik Release Readiness Checklist

### Must Add
- `CHANGELOG.md` (Keep a Changelog format) — blocks any future release automation
- `.node-version` (`22`, matching the Dockerfiles' `node:22-bookworm-slim`)
- `CONTRIBUTING.md` — dedicated file, not just the README's 4-line section
- `SECURITY.md` — dedicated file, scoped to Workflik's actual auth/data surface
- `CODE_OF_CONDUCT.md` — no equivalent content exists anywhere today
- `.github/workflows/ci.yml` — typecheck, lint, build at minimum
- `.github/ISSUE_TEMPLATE/` + `.github/PULL_REQUEST_TEMPLATE.md`
- A test suite (`vitest` or similar) — currently zero tests exist, so this is a bigger
  effort than the doc files above, and is a prerequisite for a `test` script/CI job

### Must Update
- `LICENSE` — fill in the `Copyright (C) <year> <name of author>` placeholder (currently
  literal template text, never completed)
- `package.json` — add `license`, `author`, `description`, `repository`, `homepage`,
  `bugs`, `engines`; the missing `license` field directly contradicts the filled-in
  `LICENSE` file
- `README.md` — add an environment variables reference table, explicitly document that the
  worker process is required (not optional) for background jobs/notifications in
  production, state Node/pnpm/Postgres version requirements, add a non-Docker production
  deployment section
- `.gitignore` — add `next-env.d.ts` (currently tracked and already showing as modified)

### Recommended
- `docs:sync`/`docs:check`-style script, once/if the README gets a generated version-tag
  ladder like Docket's (only makes sense after GHCR publishing exists)
- `.env.docker.example` split, but **only** once Workflik starts publishing prebuilt
  images — not applicable to the current build-from-source-only architecture
- Revisit whether `doc/bugs/`'s ~200+ dated bug/solution logs belong in the public,
  tracked `doc/` tree or should be treated as internal-only history
- `docs/releasing.md` (or root `RELEASING.md`) — write once `release.yml` exists, documenting
  the actual process (don't write speculative docs for a workflow that doesn't exist yet)
- README screenshots — Docket's README leads with product screenshots; Workflik's has none

### No Change Needed
- `Dockerfile` / `Dockerfile.worker` — solid multi-stage builds, non-root users, baked-in
  healthchecks; comparably or more sophisticated than Docket's single-image approach given
  Workflik runs a separate worker image
- `docker-compose.yml` + `docker-compose.local.yml` + `docker-compose.external-db.yml` —
  three-file split already mirrors Docket's pattern appropriately for a build-from-source
  project
- `.github/workflows/docker-build.yml` — working multi-arch (QEMU+Buildx) sanity check;
  reusable as the foundation for a future `release.yml` rather than something to replace
- `packageManager` pin (`pnpm@11.6.0`) — matches Docket exactly
- License **choice** itself (AGPL-3.0) — a deliberate, well-reasoned choice given Workflik's
  self-hosted-alternative-to-SaaS positioning; no change recommended
- Absence of per-file SPDX license headers — consistent with Docket, a valid choice for
  both projects
