# Solution: trust Google instead of requiring local email verification

**Fixed:** 2026-07-27

## What changed

**`lib/auth/index.ts`** — added an explicit `account.accountLinking` config:

```ts
account: {
  accountLinking: {
    enabled: true,
    trustedProviders: ["google"],
    requireLocalEmailVerified: false,
  },
},
```

## Why this fixes the root cause

`trustedProviders: ["google"]` treats Google's own email verification as sufficient ownership proof, and `requireLocalEmailVerified: false` drops the local-verification requirement that could never be satisfied in this app (since local email verification is never performed here in the first place). Together they let Better Auth link a Google identity onto an existing account instead of refusing every attempt.
