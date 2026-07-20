# Bug: collaborators get notified about blank "Untitled" pages

**Reported:** 2026-07-20

## Symptom

Clicking "New page" instantly created the page, fired a `page_created` notification to every active workspace member, and pushed a live sidebar-tree update to everyone else's session — all before the creator had typed a title or any content. Collaborators saw "created a new page: Untitled" and a new, empty entry appear in their own sidebar for a page that might get renamed, filled in, or abandoned seconds later. Noisy, and made in-progress work look shipped before it was.

## Root cause

`app/api/pages/route.ts`'s `POST` handler treated every new page as equally real from the moment of creation — it inserted the row, its closure-table entry, its starter block, its search-index entry, *and* called `triggerPageCreatedNotification` all in one transaction, unconditionally (except for the pre-existing `isPrivate` / `kind === "entry"` exclusions). There was no notion of "this page exists but nobody's committed to it yet" — a blank page a user is about to abandon, rename, or fill in was indistinguishable from a finished one the moment it was created. Every downstream visibility surface (sidebar tree, search, the SSE "changed" nudge, workspace Home page counts) inherited the same all-or-nothing visibility, since none of them had a concept of "not yet real" to filter on.
