# Solution: special-case `trash_warning` to route to the Trash list

**Fixed:** 2026-07-15

## What changed

Both notification click-handlers now check `notification.type` (already available on the object, no schema/API change needed) before building the target URL:

1. **`components/notifications/notification-panel.tsx`** (`handleClick`) — if `notification.type === "trash_warning"`, navigate to `/app/${workspaceSlug}/trash` instead of the page's own URL.
2. **`components/notifications/notification-provider.tsx`** (toast `onView`) — same special-case, applied before the existing `pageShortId` fallback.

```js
if (notification.type === "trash_warning") {
  router.push(`/app/${workspaceSlug}/trash`);
} else if (notification.pageShortId) {
  router.push(`/app/${workspaceSlug}/${notification.pageShortId}`);
}
```

## Why this fixes the root cause

`trash_warning` is the one notification type whose target page is guaranteed to already be deleted, so it's the one case where "go to the page's own URL" is never the right destination — the Trash list is. Branching on `type` (already returned by both the REST and SSE notification endpoints) fixes both the "just deleted" and "expiring in 3 days" variants at once, since they share the same type, without needing a new field or backend change.

## Verification

`tsc --noEmit` passes for both touched files. Not verified in a live browser in this session — worth confirming: delete a page you own, open the resulting notification (panel and/or toast), and check it lands on `/app/{workspace}/trash` rather than the deleted page's own view.
