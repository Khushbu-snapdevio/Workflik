# Solution: restart the dev server to recover the stuck worker

**Fixed:** 2026-07-20

## What changed

No code change — this was a one-off local-environment failure, not a logic bug in `lib/jobs/boss.ts`. Diagnosis:

1. Confirmed the worker process was alive (`ps aux`) but held no DB socket at all across repeated `lsof` samples.
2. Confirmed via `pgboss.job` and `email_outbox` that jobs had been enqueued correctly (the Next.js side was healthy) but never started/attempted — isolating the fault to the worker process specifically, not the enqueue path.
3. Restarted `pnpm dev`. The new worker process connected immediately; all three previously-stuck jobs (`email.send`, `notification.email-send`, `workspace.invite-send`) completed within the next poll cycle, and the stuck `email_outbox` rows flipped to `status: "sent"`.

## Why this fixes the root cause

The stuck state traced back to the worker process being spun up during the port-collision window and never cleanly recovering its pg-boss connection afterward, rather than any defect in the retry/backoff logic itself. A full process restart re-runs `startWorker()` from a clean slate against an already-stable Postgres instance, which is sufficient — no code path needed to change.

## Verification

Confirmed via direct DB queries before/after the restart: `pgboss.job` rows moved from `state: "created"` to `state: "completed"`, and the corresponding `email_outbox` rows moved from `status: "queued"` to `status: "sent"`.

## Related, unfixed observation

While verifying, the Mailtrap **sandbox** SMTP plan configured in `.env` (`sandbox.smtp.mailtrap.io`) was seen rate-limiting (`550 5.7.0 Too many emails per second`) under rapid test traffic, causing a couple of emails to only succeed on a second attempt. Not a bug — just a plan-limit worth knowing about if testing generates bursts of emails; noted for the user rather than changed.
