# Solution: `router.refresh()` on the non-navigating delete path

**Fixed:** 2026-07-15

## What changed

In both `components/sidebar/page-tree.tsx` and `components/sidebar/private-section.tsx`, `confirmDelete` now calls `router.refresh()` in the `else` branch — i.e. whenever the delete doesn't already trigger a full `window.location.replace()` navigation:

```js
if (onDeletedPage || node.kind === "database") {
  window.location.replace(...);
} else {
  router.refresh();
}
```

`useRouter()` was already imported and instantiated in both files (used elsewhere for `router.push`), so no new dependency was needed.

## Why this fixes the root cause

`router.refresh()` re-fetches the current route's Server Component data from the server without a full page reload or losing client-side state (scroll position, open menus, etc.). Since Home's underlying queries were already correctly filtering `isDeleted = false`, forcing a refresh is enough to sync its "Pages" count and "Jump back in" list with the deletion — no query changes were needed, only a trigger to re-run them. This mirrors the pattern already used elsewhere in the codebase for delete/restore actions (`components/pages/page-actions-menu.tsx`'s `handleRestore`, `app/app/[workspace]/trash/trash-client.tsx`'s `handleRestore`/`handleDeleteSelected`).

## Verification

`tsc --noEmit` passes for both touched files. Not verified in a live browser in this session — worth confirming: while on Home, delete a page from the sidebar and check the "Pages" count and "Jump back in" list update immediately without a manual reload.
