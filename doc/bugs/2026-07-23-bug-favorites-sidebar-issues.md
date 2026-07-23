# Bug: Favorites (sidebar) — several related defects

All three surfaced while iterating on the favorites feature and share the same area
(favorite toggling + the sidebar Favorites section), so they're tracked together.

## 1. Page-header star shows the previous page's state ("one page behind")

**Symptom:** Toggling a page's favorite from the star in the page header appears to lag by
one navigation — the star reflects the *previously viewed* page's favorite state.

**Reproduce:** Open page A (not favorited); navigate to page B (favorited) — the star
still shows A's empty state; navigate to C — now it shows B's state, always one behind.

**Root cause:** The header `<FavoriteButton>`
([app/app/[workspace]/[pageId]/page.tsx](../../app/app/%5Bworkspace%5D/%5BpageId%5D/page.tsx))
has no `key`, so navigating between `[pageId]` routes reuses the same component instance.
Inside [components/pages/favorite-button.tsx](../../components/pages/favorite-button.tsx)
the flag was seeded with `useState(initial)`, which only reads the prop at mount — so on
later navigations the `isFavorited` prop updated but the state didn't. The only other
updater was the `workflik:favorites-changed` listener, which fires on toggle, not on
navigation.

## 2. Favorited database entries show "Untitled" and don't open

**Symptom:** Favoriting a database entry (a row inside a database, e.g. "Improve SEO")
shows it as "Untitled" with a generic icon in the sidebar, and clicking it doesn't
navigate.

**Reproduce:** Favorite a database entry; the sidebar Favorites row reads "Untitled" and
its link (`/app/<slug>/<raw-uuid>`) doesn't resolve.

**Root cause:** The sidebar resolved each favorite's title/icon/shortId from `pagesMap`
([components/sidebar/sidebar.tsx](../../components/sidebar/sidebar.tsx)), built only from
the page tree — and that tree query excludes entries (`ne(pages.kind, "entry")`). The
favorites data (server `initialFavorites` and `GET /api/user/favorites`) returned only
`{ id, pageId, orderIndex }`, no metadata, so non-tree favorites had nothing to render →
"Untitled" + the raw UUID link. (The home page's Favorites section was unaffected — its
query already innerJoins the page.)

## 3. Favoriting from the Library updates the sidebar one action behind

**Symptom:** Star two pages from the Library; only one shows in the sidebar, the second
appears after the next action.

**Reproduce:** In the Library, favorite A (sidebar shows nothing), then favorite B
(sidebar shows A) — always one behind.

**Root cause:** `toggleFavorite` in
[app/app/[workspace]/library/library-client.tsx](../../app/app/%5Bworkspace%5D/library/library-client.tsx)
dispatched `workflik:favorites-changed` synchronously, before the fire-and-forget
POST/DELETE finished. The sidebar reacts by refetching `GET /api/user/favorites`, which
then **raced the write** and read the pre-change state. (The page-header button and the
entry-context-menu already dispatch after `await`, so only the Library was affected.)

## Related, not fixed

The sidebar's **Recently Visited** section has the same `pagesMap` dependency as #2 but
*filters out* items it can't resolve (`items.filter((i) => !!pagesMap[i.pageId])`), so
visited database entries silently don't appear rather than showing "Untitled". Left as-is;
could get the same metadata-join treatment later.
