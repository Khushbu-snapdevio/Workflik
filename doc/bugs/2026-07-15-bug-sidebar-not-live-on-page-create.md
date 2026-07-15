# Bug: other users' sidebars don't update when someone creates a page

**Reported:** 2026-07-15

## Symptom

When a user creates a new page, other members viewing the same workspace don't see it appear anywhere — not in the sidebar's page list, not as any kind of update. They have to manually reload the browser to see the new page. The same was true for renaming, moving, or deleting a page.

## Root cause

The sidebar's page tree (`components/sidebar/sidebar.tsx`) is fetched once, server-side, on initial page load (`app/app/[workspace]/layout.tsx`) and passed down as an `initialPages` prop. From that point on it lives purely in client-side React state (`useState<PageItem[]>(initialPages)`). The *only* thing that ever refetches it is a same-tab `window.dispatchEvent(new CustomEvent("pages:refresh"))`, fired by the ~15 components that mutate pages (`components/workspace/new-page-button.tsx` and others) — always in reaction to *that same tab's own* mutation.

`window` custom events never cross browser tabs, let alone different users' sessions. `app/api/pages/route.ts`'s create handler (and the rename/move/delete routes) performed a pure DB write with no broadcast of any kind — nothing told any other open session that the workspace had changed, so their sidebar kept showing its stale first-load snapshot indefinitely.
