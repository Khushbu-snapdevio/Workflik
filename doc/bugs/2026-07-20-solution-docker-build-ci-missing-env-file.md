# Solution: create a placeholder .env from .env.example before validating

**Fixed:** 2026-07-20

## What changed

**`.github/workflows/docker-build.yml`** — added a step, `Create placeholder .env for compose validation`, running `cp .env.example .env`, immediately before the existing `Validate docker-compose.yml` step.

## Why this fixes the root cause

`docker compose config --quiet` only needs the declared `env_file` to *exist* to resolve the compose file structurally — it never actually starts the containers in this workflow, so the file's contents don't need to be real secrets. `.env.example` is already committed to the repo specifically as the template for this (`docker-compose.yml`'s own header comment documents the identical `cp .env.example .env` step as the normal self-hosting quick-start), so reusing it in CI needs no new file and stays consistent with the documented setup flow instead of inventing a separate CI-only stand-in.

## Verification

Docker isn't available in this sandbox to run the workflow end-to-end locally, so this was verified by direct inspection rather than execution: confirmed `.env.example` exists and is tracked in git (not gitignored), confirmed `.env` is the only one excluded via `.gitignore`, and confirmed the exact reported error message matches Docker Compose's documented behavior for a missing *explicit* `env_file` reference (distinct from its optional implicit project-root `.env` autoload, which doesn't error when absent). The new step will be exercised on the next push/PR to `main`.
