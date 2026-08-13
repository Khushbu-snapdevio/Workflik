# Solution: Force the embedded Postgres cluster to UTF8

## What changed

[scripts/dev-db.ts](../../scripts/dev-db.ts) — pass explicit `initdbFlags` to
`EmbeddedPostgres` so a freshly initialised cluster is always UTF8 with a C locale,
regardless of the host OS codepage:

```ts
const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  password,
  persistent: true,
  port,
  user,
  initdbFlags: ["--encoding=UTF8", "--lc-collate=C", "--lc-ctype=C"],
});
```

We set only `--lc-collate` / `--lc-ctype` (not `--locale` / `--no-locale`) on purpose:
`embedded-postgres` passes its own `--lc-messages=<locale>` and relies on parsing
`initdb`/`postgres` output in that locale to detect readiness. Overriding the full
locale would clobber `lc-messages` and could break start-up detection. Collate/ctype
of `C` are compatible with any encoding, so UTF8 is safe.

## Why this fixes the root cause

`initdb` no longer inherits the Windows OS locale (`English_India.1252` → WIN1252).
The cluster and every database created from it are UTF8, so emoji code points
(template icons, page icons, block content) round-trip correctly and the built-in
template seed inserts succeed.

## Applying to an already-broken cluster

The fix only affects a *fresh* `initdb`. An existing WIN1252 `.krova-postgres` data
directory is not migrated automatically — Postgres cannot re-encode a database in
place. To repair an existing dev instance:

1. Stop all `postgres.exe` and the `pnpm db:local` / `pnpm dev` node processes
   (release the data-dir file locks; free port 5432).
2. Delete the data directory: `rm -rf .krova-postgres` (this discards local data —
   dump/restore first if you need to keep it; `pg_dump` converts WIN1252 → UTF8
   cleanly since all stored data is representable in UTF8).
3. `pnpm db:local` — re-initialises the cluster, now UTF8.
4. `pnpm db:migrate` — rebuild the schema.
5. Start the worker (`pnpm dev`) — `autoSeedTemplatesOnStartup()` in
   [lib/jobs/register.ts](../../lib/jobs/register.ts) seeds the 18 built-in templates
   on startup. (A platform admin can also click "Seed default templates".)

Verified after repair: `server_encoding = UTF8`, emoji round-trip succeeds, and
`SELECT count(*) FROM templates WHERE is_built_in` returns 18 with icons `📔`, `👋`
intact.
