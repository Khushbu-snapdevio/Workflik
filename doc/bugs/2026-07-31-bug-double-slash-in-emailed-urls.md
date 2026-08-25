# Bug: emailed invite links contain a double slash and fail to load

**Reported:** 2026-07-31

## Symptom

The workspace invite email delivered a link of the form:

```
https://pagevo.techcrucks.com//invite/2629585f-5f0c-40a8-8437-6d3216085085
```

Note the `//` between the host and `invite`. Opening it produced the browser's "This page couldn't load" error rather than the invite accept screen.

## Reproduce

Set `NEXT_PUBLIC_APP_URL` to a value with a trailing slash (e.g. `https://pagevo.techcrucks.com/`), then invite a member from Settings → Workspace → Members. The received email's accept link contains `//invite/`.

Not reproducible locally, because `.env` / `.env.example` both set `NEXT_PUBLIC_APP_URL=http://localhost:3000` with no trailing slash — this only surfaces on a deployment whose env var was written with one.

## Root cause

`lib/env.ts` validated `NEXT_PUBLIC_APP_URL` with `z.url()` but never normalized it, so whatever trailing slash the deployment's env var carried was preserved verbatim. Every consumer then builds URLs by string concatenation against a path that already begins with `/`:

```ts
// lib/jobs/handlers/send-workspace-invite.ts
const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/invite/${data.inviteToken}`;
```

With a trailing slash on the base, that yields `https://host//invite/<token>`.

The invite link is just the one that was noticed — the same concatenation pattern is used in at least eight places, so all of them were emitting doubled slashes on this deployment:

| Consumer | Built URL |
|---|---|
| `lib/jobs/handlers/send-workspace-invite.ts:18` | workspace invite accept link |
| `lib/jobs/handlers/send-guest-invite.ts:16` | guest page invite link |
| `app/api/workspaces/[id]/transfer/route.ts:87` | ownership-transfer confirmation link |
| `lib/jobs/handlers/notification-email-send.ts:68` | per-notification email links |
| `lib/jobs/handlers/notification-digest-send.ts:110` | digest email links |
| `lib/storage/drivers/local.ts:18,42` | local-driver upload + file-serving URLs |
| `lib/auth/index.ts:35` | Better Auth `baseURL` |

The hazard was already known in one spot — `lib/storage/drivers/s3.ts:27` defensively does `env.CDN_URL!.replace(/\/$/, "")` — but that fix was applied ad-hoc at a single use site rather than centrally, so nothing protected `NEXT_PUBLIC_APP_URL`.
