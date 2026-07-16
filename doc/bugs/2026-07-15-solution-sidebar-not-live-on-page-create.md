# Solution: SSE-based live sidebar sync, reusing the notifications-stream pattern

**Fixed:** 2026-07-15

## What changed

1. **`app/api/workspaces/[id]/pages/stream/route.ts`** (new) — an SSE endpoint, structured like the existing `app/api/notifications/stream/route.ts` (connected event, 25s heartbeat, ~55s max duration, client auto-reconnects). Every 4s it polls a single indexed aggregate — `SELECT MAX(updated_at) FROM pages WHERE workspace_id = $1` — and pushes a `changed` event (no payload) whenever that value moves. No changes were needed to the create/rename/move/delete routes themselves: `pages.updatedAt` already uses the shared `updatedAt()` column helper (`defaultNow()` + `$onUpdate()`), so every one of those mutations already bumps it for free.

2. **`lib/pages/use-page-tree-stream.ts`** (new) — a client hook mirroring `lib/notifications/use-notification-stream.ts`'s `EventSource` + reconnect-with-backoff shape, calling a passed-in callback whenever a `changed` event arrives.

3. **`components/sidebar/sidebar.tsx`** — one new line, `usePageTreeStream({ workspaceId, onChange: fetchPages })`, right next to the existing `pages:refresh` listener. `fetchPages` already existed and already does exactly the right thing (silent background refetch, no skeleton flash unless the tree was empty) — it just had no way to be triggered by another user's action until now.

## Why this fixes the root cause

Rather than inventing a new real-time mechanism, this reuses the one already proven in production for notifications — same transport, same reconnect behavior, same operational characteristics (this repo's `doc/CLAUDE.md` already notes the app requires a persistent-connection host for exactly this reason). The polling target (`MAX(updated_at)`) was chosen specifically because every relevant mutation already updates it — no new "page changed" event system had to be threaded through five different mutation call sites.

Per explicit product decision, no separate Notifications-panel (bell icon) entry was added for page creation — only the sidebar itself updates live, matching Notion's own behavior and avoiding notification noise in active workspaces.

## Verification

Two separate logged-in browser sessions on the same workspace (via Playwright, two browser contexts, two magic-link sign-ins). Session A created a page via the API; session B's sidebar (no reload, no manual action) showed the new page in its "Pages" list within 5 seconds, confirmed both by polling the DOM for the new title and by screenshot. `tsc --noEmit` passes.
