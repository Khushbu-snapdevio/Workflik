# Bug: background worker stuck with no DB connection — emails never sent

**Reported:** 2026-07-20

## Symptom

Magic-link sign-in emails and page/notification emails never arrived. Jobs enqueued via `enqueueJob` (`email.send`, `notification.email-send`, `workspace.invite-send`) sat forever without being processed — no error, no retry, just silence.

## Root cause

Local dev startup that day hit a Postgres port collision: the embedded Postgres instance for a *different* local project (Kanbanica) was already bound to port 5432, the same port Workflik's `.env` `DATABASE_URL` uses. `pnpm db:local` failed twice before the port freed up and Workflik's own embedded Postgres finally started.

The `tsx --watch scripts/worker.ts` process (started via `pnpm dev`'s `concurrently`) had launched during that unstable window. `lib/jobs/boss.ts`'s `startWorker()` calls `boss.start()` with a bounded retry loop (`startBossWithRetry`, max 10 attempts, exponential backoff up to 30s) — but the process itself never exited even after connectivity should have stabilized. Confirmed via `lsof -p <workerPid>`, sampled repeatedly over 10s: **zero network connections**, not even a transient one between polls — the worker was alive but doing nothing, silently, with no crash and no log output pointing at it. Meanwhile `pgboss.job` showed every queued job stuck in `state: "created"` with `started_on: null`, and `email_outbox` rows stuck at `status: "queued"` with `attempt_count: 0` — proof nothing was ever picked up.
