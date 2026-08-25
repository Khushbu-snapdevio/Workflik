# Solution: strip trailing slashes from NEXT_PUBLIC_APP_URL in the Zod schema

**Fixed:** 2026-07-31

## What changed

**`lib/env.ts`** — the `NEXT_PUBLIC_APP_URL` schema now normalizes the value after validating it:

```ts
NEXT_PUBLIC_APP_URL: z.url().transform((v) => v.replace(/\/+$/, "")),
```

No other file changed.

## Why this fixes the root cause

Every consumer builds URLs as `${env.NEXT_PUBLIC_APP_URL}/some/path`, so the invariant they all rely on is "the base URL has no trailing slash." Enforcing that once, at the single point where the env var enters the app, fixes all eight consumers simultaneously and makes it impossible for a future consumer to reintroduce the bug.

Fixing it at the call site instead — `env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")` in `send-workspace-invite.ts` — would have repaired only the invite email while leaving guest invites, transfer-confirmation links, notification and digest emails, and local upload URLs still broken on this deployment. That is also exactly the ad-hoc pattern already present at `lib/storage/drivers/s3.ts:27` for `CDN_URL`, which is what left `NEXT_PUBLIC_APP_URL` unprotected in the first place.

`lib/env.ts` is the sanctioned home for this per Hard Rule 9 ("All env vars validated with Zod in `lib/env.ts` — never read `process.env` directly elsewhere"). The regex uses `\/+$` rather than `\/$` so that a value ending in several slashes collapses correctly too.

## Verification

Ran the transform against the reported production value and edge cases:

| Input | Output | Resulting invite link |
|---|---|---|
| `https://pagevo.techcrucks.com/` | `https://pagevo.techcrucks.com` | `…com/invite/TOKEN` |
| `https://pagevo.techcrucks.com` | unchanged | `…com/invite/TOKEN` |
| `http://localhost:3000` | unchanged | `…3000/invite/TOKEN` |
| `https://example.com///` | `https://example.com` | `…com/invite/TOKEN` |
| `https://example.com/sub/path/` | `https://example.com/sub/path` | `…/sub/path/invite/TOKEN` |

Sub-path deployments keep their path (only trailing slashes are removed), already-clean values are untouched (idempotent), and invalid values (`"not-a-url"`, `""`) are still rejected by `z.url()` before the transform runs. `tsc --noEmit` reports no errors in `lib/env.ts` or any consumer.

## Deployment note

This is a build/runtime-config fix, so the running deployment must be redeployed (or restarted) to pick it up. Invite links already delivered in past emails still contain the doubled slash and will need to be re-sent — or opened after manually removing the extra slash.
