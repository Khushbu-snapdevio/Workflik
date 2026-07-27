# Solution: make invite notifications workspace-independent, and deep-link them to Accept/Decline

**Fixed:** 2026-07-27

## What changed

1. **`lib/notifications/scope.ts`** (new) — a shared `notificationScope(recipientId, workspaceId)` helper: `recipientId = me AND (workspaceId = current workspace OR type = 'workspace_invite')`. Applied to all four notification routes that previously filtered strictly by workspace: `app/api/notifications/route.ts`, `app/api/notifications/stream/route.ts`, `app/api/notifications/read-all/route.ts`, `app/api/notifications/clear-all/route.ts`.

2. **`app/api/notifications/route.ts` and `stream/route.ts`** — added a `leftJoin` on `workspaceMembers` (matching `notifications.sourceId`, which holds the `workspaceMembers` row id for this type) to expose the invite's `inviteToken` in the API response.

3. **`components/notifications/notification-panel.tsx`** and **`notification-provider.tsx`** (toast) — both now navigate to `/invite/[token]` when `type === "workspace_invite"` and `inviteToken` is present, landing directly on the existing "Accept and join" / "Decline" screen instead of doing nothing.

## Why this fixes the root cause

An invite notification is inherently about a workspace the recipient doesn't have open — filtering it out because it doesn't match the *current* workspace was always going to hide it in every context they could reach. Making the query explicitly carve out `workspace_invite` as workspace-independent means it now surfaces regardless of which of the recipient's other workspaces they're currently browsing, and the added `inviteToken` join lets the click action land them on the accept/decline page that already existed for this exact purpose.

## Verification

Reproduced live end-to-end against the running dev server: invited an existing user (who already belongs to a different workspace) to a second workspace, confirmed the notification correctly appears while the recipient is browsing their *other*, unrelated workspace, and clicking it navigates to `/invite/[token]`, landing on "Join {workspace} / You've been invited to join as {role} / Accept and join / Decline".
