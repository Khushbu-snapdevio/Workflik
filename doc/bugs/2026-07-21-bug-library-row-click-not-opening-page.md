# Bug: Library table rows require the hover "OPEN" button — clicking the row does nothing

**Reported:** 2026-07-21

## Symptom

On the Library page (`/app/{workspace}/library`), clicking anywhere on a row in the "All Pages" / "Recents" / "Favorites" / "Private" table — the page name, the icon, or the blank space in that cell — does not navigate into the page. The only way to open a page from Library is to hover the row until a small "OPEN" pill button fades in on the right of the name cell, then click that specific button.

## Root cause

`app/app/[workspace]/library/library-client.tsx` rendered each row as a plain `<div>` with no click handler at all. Navigation was wired exclusively to a `<Link>` styled as an "OPEN" button (`opacity-0 group-hover/row:opacity-100`) sitting inside the name cell — a deliberate earlier design choice, documented in a since-removed comment, to keep "raw row clicks... intentionally inert so a stray click doesn't yank the user out of Library," matching the database table view's row-hover pattern.

That tradeoff didn't match user expectation for this list: unlike a data-grid table (where a row click might select a cell), a page-name row here reads as a link, and every other page list in the app (sidebar page tree, search results) opens on a direct click.

## Reproduction

1. Open Library from the sidebar.
2. On the "All Pages" tab, move the mouse over a row without touching the OPEN button and click the page name or the empty space beside it.
3. Nothing happens — the page stays on Library.
4. Hover the same row until "OPEN" appears on the right, click it — only then does the page open.
