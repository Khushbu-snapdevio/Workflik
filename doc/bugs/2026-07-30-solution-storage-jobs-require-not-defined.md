# Solution: storage cleanup jobs failing with "require is not defined"

## What changed

`lib/storage/index.ts`: replaced the two lazy `require(...)` calls inside `getStorage()` with static top-level ESM `import` statements for `createLocalDriver` and `createS3Driver`, and simplified the driver-selection branch to a ternary.

```ts
import { createLocalDriver } from "./drivers/local";
import { createS3Driver } from "./drivers/s3";
import type { StorageDriver } from "./drivers/types";
...
_driver = driver === "s3" || driver === "r2" ? createS3Driver() : createLocalDriver();
```

## Why this fixes the root cause

`require` doesn't exist as a global under Node's native ESM loader (which `tsx` uses to run the worker's `.ts` files directly, since `package.json` has `"type": "module"`). Static `import` is the ESM-native way to load a module and works identically whether the code runs through Next.js's bundler (API routes) or through `tsx` (the standalone worker process) — no runtime environment-detection needed.

This does trade away the "only load the driver you need" laziness (both `local.ts` and `s3.ts` are now always imported/evaluated), but neither module does anything at import time beyond defining a factory function — `s3.ts`'s `S3Client` is only constructed inside `buildClient()`, which `createS3Driver()` doesn't call until a driver method actually runs. No behavior change for the local-only (`STORAGE_DRIVER=local`) case, which is what this environment uses.

## Verification

- `npx tsc --noEmit` — no new errors in `lib/storage/index.ts` or its callers.
- `npx biome check --write lib/storage/index.ts` — formatting/import-order clean.
- Confirmed via `pgboss.job.output` (before the fix) that the exact stack trace pointed at the `require(...)` line this change removes; all 4 call sites of `getStorage()` (`cleanup-stale-uploads.ts`, `cleanup-orphaned-media.ts`, `app/api/uploads/confirm/route.ts`, `app/api/uploads/sign/route.ts`) were re-checked and none depend on `getStorage()`'s signature, which is unchanged (still synchronous).
- Live-verified: the dev worker runs via `tsx --watch scripts/worker.ts`, which auto-reloaded on this edit. `storage.cleanup-stale-uploads`'s next scheduled run (`*/30 * * * *`) at 11:00:32 completed successfully (`pgboss.job.state = 'completed'`), immediately after a string of failed runs at 09:30, 10:00, and 10:30 with the `require is not defined` stack trace. `storage.cleanup-orphaned-media` runs on a daily cron (`0 4 * * *`) so wasn't re-triggered live in this session, but it shares the exact same `getStorage()` call path, so the same fix applies.
