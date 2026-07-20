# Bug: "Docker build sanity check" CI workflow fails at compose validation

**Reported:** 2026-07-20

## Symptom

The `docker-build` GitHub Actions workflow fails on every push/PR to `main` at its final step, "Validate docker-compose.yml":
```
env file /home/runner/work/Workflik/Workflik/.env not found: stat /home/runner/work/Workflik/Workflik/.env: no such file or directory
Error: Process completed with exit code 1.
```
All three image-build steps before it (migrator, runner, worker targets) succeed — only `docker compose config --quiet` fails.

## Root cause

`docker-compose.yml`'s `migrate`, `app`, and `worker` services each explicitly declare `env_file: - .env`. Docker Compose treats a missing *explicitly declared* `env_file` as a hard error — unlike its separate, optional implicit behavior of auto-loading a project-root `.env` if one happens to exist (which silently no-ops when absent). `.env` is (correctly) listed in `.gitignore` since it holds real secrets/config, so a fresh CI checkout of the repo never has one, and `docker compose config` can't resolve the compose file without it.

This validation step was added purely to catch YAML/structural regressions in `docker-compose.yml` as the app evolves — it was never meant to require real secrets, but referencing `.env` at all (even just for its existence, not its contents) means it needs *some* file there.
