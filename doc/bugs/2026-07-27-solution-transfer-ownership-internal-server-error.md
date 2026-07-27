# Solution: delete-then-insert instead of relying on a nonexistent unique constraint

**Fixed:** 2026-07-27

## What changed

**`app/api/workspaces/[id]/transfer/route.ts`** — replaced the `.insert().onConflictDoUpdate()` call with a delete-then-insert inside a transaction, scoped to this feature's own namespaced identifier (`workspace-transfer:{workspaceId}:{targetUserId}`), which nothing else in the codebase ever writes to:

```ts
const identifier = `workspace-transfer:${id}:${targetUserId}`;
await db.transaction(async (tx) => {
  await tx.delete(verifications).where(eq(verifications.identifier, identifier));
  await tx.insert(verifications).values({ identifier, value: token, expiresAt });
});
```

## Why this fixes the root cause

This achieves the same "upsert" semantics the original code intended (re-requesting a confirmation email replaces the old pending token) without depending on a unique constraint the shared `verifications` table doesn't have and can't safely be given, since Better Auth's own verification flows rely on that table permitting multiple rows per identifier.

## Verification

Ran the exact delete-then-insert sequence directly against the dev database, including simulating a second click of "Send confirmation email" (re-requesting a token for the same identifier) — both inserts succeeded, and the table correctly held exactly one row for that identifier afterward with the latest token.
