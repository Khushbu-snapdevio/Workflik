# Bug: storage cleanup jobs failing with "require is not defined"

**Reported:** 2026-07-30 (Orbit Admin → Queues, `localhost:3000/orbit-admin/orbit/queues`)

## Symptom

In Orbit Admin's Queues view, `storage.cleanup-stale-uploads` (38 jobs) and `storage.cleanup-orphaned-media` (3 jobs) show 100% failed, while every other queue (`entry.reminder-send`, `scaffold.healthcheck`, `email.outbox-reap`, etc.) completes normally.

## Root cause

`lib/storage/index.ts`'s `getStorage()` lazily loaded the active storage driver with CommonJS `require("./drivers/s3")` / `require("./drivers/local")`. `package.json` sets `"type": "module"`, and the pg-boss worker process runs the raw `.ts` handler files via `tsx` under real Node ESM semantics — where `require` is not a global (unlike Next.js's own server bundle, which is emitted as CommonJS by its bundler regardless of source `type`, so the same code never threw when called from an API route).

Confirmed directly from `pgboss.job.output` for the failed rows:

```
ReferenceError: require is not defined
    at getStorage (lib/storage/index.ts:20:7)
    at handleCleanupStaleUploads (lib/jobs/handlers/cleanup-stale-uploads.ts:10:19)
```

Both `lib/jobs/handlers/cleanup-stale-uploads.ts` and `lib/jobs/handlers/cleanup-orphaned-media.ts` call `getStorage()` as their first line, so every run of either job threw immediately, before doing any actual cleanup work.
