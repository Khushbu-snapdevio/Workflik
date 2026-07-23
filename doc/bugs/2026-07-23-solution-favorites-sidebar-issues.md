# Solution: Favorites (sidebar) — fixes for the related defects

## 1. Re-sync the header star on page change

[components/pages/favorite-button.tsx](../../components/pages/favorite-button.tsx) — added
an effect that resets local state to the server prop whenever the page changes:

```tsx
useEffect(() => { setFavorited(initial); }, [pageId, initial]);
```

Because the button instance is reused across navigations, it now re-derives its state
from the incoming prop each time `pageId`/`initial` changes. The deps are stable within a
single page view, and an in-page optimistic toggle (and the `workflik:favorites-changed`
event) leave `initial` untouched — so this never clobbers an optimistic toggle and only
corrects on genuine navigation.

## 2. Carry page metadata on each favorite

Favorites now carry their own `title` / `icon` / `shortId`, joined from the `pages` table
at the source, instead of depending on the tree-only `pagesMap`:

- [app/api/user/favorites/route.ts](../../app/api/user/favorites/route.ts) — `GET` now
  `LEFT JOIN`s `pages` and selects `title`, `icon`, `shortId`. (Also removed a redundant
  `workspaceId ? … : …` ternary.)
- [app/app/[workspace]/layout.tsx](../../app/app/%5Bworkspace%5D/layout.tsx) — the
  server-side `initialFavorites` query gets the same join, so the first render already has
  metadata.
- [components/sidebar/sidebar.tsx](../../components/sidebar/sidebar.tsx) — `FavoriteItem`
  gains optional `title`/`icon`/`shortId`; the optimistic add fills them from `pages` when
  the page is in the tree.
- [components/sidebar/favorites-section.tsx](../../components/sidebar/favorites-section.tsx) —
  a `resolveFav()` helper prefers the favorite's own metadata, falls back to `pagesMap`,
  then to safe defaults; used by both the inline rows and the "N more" popup.

`LEFT JOIN` (not inner) keeps a favorite visible even if its page was hard-deleted (it
falls back to the "Untitled" default in that rare case).

## 3. Dispatch the Library's favorites-changed event after the write

[app/app/[workspace]/library/library-client.tsx](../../app/app/%5Bworkspace%5D/library/library-client.tsx) —
`toggleFavorite` now fires the event from the fetch's `.then()` (after the POST/DELETE
resolves) instead of synchronously. The sidebar's refetch therefore reads the committed
state, so the Favorites list reflects the current action immediately. Local optimistic
state still updates instantly; only the cross-component notification moved. This matches
the pattern the header button and entry-context-menu already used.
