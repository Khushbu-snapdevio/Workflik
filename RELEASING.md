# Releasing

Everything ships from GitHub Actions. Two workflows do the work, and neither needs a
secret you have to create — the built-in `GITHUB_TOKEN` covers all of it.

| Workflow | Runs on | What it does |
|----------|---------|---------------|
| [`ci.yml`](.github/workflows/ci.yml) | Pull requests, pushes to `main` | Typecheck, lint, test, build, plus a migrations check against a real PostgreSQL |
| [`release.yml`](.github/workflows/release.yml) | A **successful** `ci.yml` run on `main` | Only if `package.json`'s version is new: builds and publishes both images, creates the tag, and creates the GitHub Release |

The two never run at the same time. `release.yml` is chained to CI's completion with a
`workflow_run` trigger, so on a push to `main` you get CI first, then Release — and a red
CI publishes nothing.

**This repo does not publish edge builds on ordinary pushes.** Unlike a "build and tag
`main` on every push" pipeline, `release.yml`'s image job only runs when the version in
`package.json` has no matching git tag yet. A push to `main` that doesn't bump the version
produces no image, no tag, and no release — nothing gets published at all.

---

## Cutting a release

There is no separate tagging step. Once CI is green on `main`, `release.yml` reads the
`version` field in `package.json`. If no tag exists for it yet, that push is a release.

```bash
# 1. Bump the version
$EDITOR package.json          # "version": "0.2.0"

# 2. Write the notes. The section heading must match the version exactly,
#    because its contents become the body of the GitHub Release.
$EDITOR CHANGELOG.md          # ## [0.2.0] - 2026-08-30

# 3. Commit and push. That is the whole release.
git commit -am "Pagevo 0.2.0"
git push

# 4. Watch it. Can take 10-20 minutes, since the ARM build is emulated.
gh run watch
```

That single push produces:

- the app image and the worker image, each built for `linux/amd64` and `linux/arm64`
- image tags `0.2.0`, `0.2`, `0`, `latest`, and `sha-<short>` on both images
- the `v0.2.0` git tag
- the GitHub Release, with the changelog section as its body

### Guard rails

The workflow stops before publishing anything if:

- the version is not plain `X.Y.Z`, so a typo cannot create a tag that then has to be
  deleted from a public repository
- `CHANGELOG.md` has no `## [<version>]` section, because a release with an empty body is
  worse than a failed build

And after publishing, the **Anyone can pull it** job asks `ghcr.io` — anonymously, with no
credentials at all — whether a self-hoster could actually pull what was just pushed, for
both images. It does not block the tag or the release, since the images are already
published by then; it turns the run red so a private package is caught here instead of by
a user.

---

## One-time setup

### Make each package public, after the first successful build

This step is easy to miss, because every other signal looks identical either way: the
build is green, the tags exist, the release is published. A new GitHub Packages entry is
**private**, even in a public repository, so `docker pull` fails for anyone who is not
signed in.

1. Repository main page → **Packages** in the right-hand sidebar.
2. Click the package (there will be two — the app image and the `-worker` image).
3. **Package settings → Danger Zone → Change visibility → Public.**
4. Repeat for the second package.

The **Anyone can pull it** job fails the release run until this is done, so it's no longer
something you have to remember to check — but it still has to be done by hand, once per
package. GitHub exposes no API for package visibility.

Check it from a signed-out shell:

```bash
docker logout ghcr.io
docker pull ghcr.io/sahajtavethiya96/workflik:latest
docker pull ghcr.io/sahajtavethiya96/workflik-worker:latest
```

---

## Checking a published release

```bash
docker pull ghcr.io/sahajtavethiya96/workflik:0.2.0
docker image inspect ghcr.io/sahajtavethiya96/workflik:0.2.0 --format '{{.Config.User}}'
# expect: pagevo

# both architectures present?
docker buildx imagetools inspect ghcr.io/sahajtavethiya96/workflik:0.2.0 | grep -A1 Platform
```

---

## Things that will bite you

- **A new package is private.** Covered above, worth repeating because the symptom is
  confusing: the build goes green, the package page exists, and a self-hoster still gets
  `denied` or `manifest unknown` on `docker pull`.
- **Do not split tag-then-build into two workflows.** A git tag pushed by a workflow using
  the built-in `GITHUB_TOKEN` does **not** trigger other workflows — GitHub blocks that to
  prevent recursion. That's why `release.yml` does the build, the tag, and the release in
  one run.
- **Never use bare `github.sha` in `release.yml`.** On a `workflow_run` event it points at
  the head of the default branch, not the commit CI actually tested. Every checkout, the
  `sha-` image tag, and the release `--target` use `github.event.workflow_run.head_sha`
  instead.
- **Lowercase the image name.** Container registries reject uppercase repository names, and
  `github.repository`/`GITHUB_REPOSITORY` preserves whatever case the repo was created
  with. `release.yml` lowercases once into a step output and every consumer reads that.
- **This repo currently builds from source, not from the published image.**
  `docker-compose.yml`/`docker-compose.local.yml`/`docker-compose.external-db.yml` all
  build the app and worker images locally (`build:` blocks, not `image:` — see
  [CI-CD-COMPARISON.md](docs/CI-CD-COMPARISON.md)). Publishing images via this workflow
  does not change that; switching Compose over to pulling `ghcr.io/...` images instead of
  building locally is a deliberate follow-up, not something `release.yml` does on its own.
- **Schema changes need their migration committed.** CI's `migrations` job fails otherwise,
  because that combination breaks the `migrate` step (the Dockerfile's `migrator` target,
  or `pnpm db:migrate` from source) on every fresh install.
- **Re-releasing a version does nothing.** Once `v0.2.0` is tagged, pushing again with the
  same version in `package.json` produces no build at all (see "no edge builds" above). To
  re-cut it you'd have to delete the tag and the release first, which is worth avoiding on
  a public repository.
