# Bug: "Send confirmation email" in Transfer Ownership fails with Internal server error

**Reported:** 2026-07-27

## Symptom

In Workspace Settings → Members → Danger Zone, confirming "Transfer ownership to X?" and clicking "Send confirmation email" always failed with a generic "Internal server error" toast.

## Root cause

`app/api/workspaces/[id]/transfer/route.ts` stored the transfer token via:

```ts
await db.insert(verifications).values({ identifier, value: token, expiresAt })
  .onConflictDoUpdate({ target: [verifications.identifier], set: { ... } });
```

`.onConflictDoUpdate` requires a **unique constraint** on `verifications.identifier` in Postgres, but the schema (`lib/db/schema/auth.ts`) only ever defines a plain, non-unique index there. Every insert hit `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification` (Postgres `42P10`) — a raw driver error, not an `ApiError`, so it fell through to the generic 500 handler.

A unique constraint couldn't simply be added to fix this: `verifications` is the same table Better Auth itself uses internally (magic links, password resets, email-change verification), and its own adapter does plain inserts that deliberately tolerate multiple rows sharing an `identifier` (e.g. requesting a second magic link before the first expires). Adding a unique constraint would fix this one feature but risk breaking Better Auth's own flows.
