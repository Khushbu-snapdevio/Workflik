# Bug: database Sort panel offers no "Name" option

**Reported:** 2026-07-31

## Symptom

On a database page (e.g. "Goals Tracker"), opening the toolbar's **Sort** panel and expanding the property dropdown lists only user-defined properties — Owner, Status, Due date, Priority, Team, … — with no entry for the **Name** column. There is no way to sort entries alphabetically by their title, even though Name is the first column of every table view and the most common thing to sort by.

## Reproduce

1. Open any database page (`/{workspace}/t/{pageId}` or an inline database page).
2. Click **Sort** in the view toolbar → **Add sort**.
3. Open the property dropdown.

Expected: **Name** appears in the list. Actual: only the non-system properties appear.

## Root cause

The Name column is not a `database_properties` row — it's the entry page's own `pages.title`. There is no `"title"` value in the `propertyType` enum at all, so a database's property list never contains anything representing Name.

`SortPanel` in `components/templates/template-page-client.tsx` built its dropdown purely from that property list (`properties.filter((p) => !SYSTEM_TYPES.has(p.type))`), so Name could never appear. The client-side sort comparator had the same blind spot: it looked every rule's value up in `entryValueMap`, which is keyed by `property_values` rows and therefore has no key for the title.

The server side was already half-built for this — `app/api/databases/[id]/entries/route.ts` recognises a `"__title__"` sentinel `propertyId` and sorts on `pages.title` — but nothing in the UI ever produced a rule with that id, so the branch was dead code.
