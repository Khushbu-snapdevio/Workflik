# Bug: Library page-list row badges show the wrong icon for locked vs. private pages

**Reported:** 2026-07-27

## Symptom

In the Library "All Pages" table, a locked page's row badge showed a pen/edit-slash icon and a private page's row badge showed a padlock icon — the opposite of what each icon should mean. This made it look like unlocking a page from the "..." row menu affected a *different* row than the one the padlock badge pointed at, because the padlock badge was actually indicating the *private* flag, not the *locked* flag the user assumed it meant.

## Root cause

`app/app/[workspace]/library/library-client.tsx` rendered the two per-row status badges with their icon assignment swapped:

```tsx
{page.isPrivate && <Lock ... />}
{page.isLocked && <PenOff ... />}
```

`Lock` (a padlock) was tied to `isPrivate`, and `PenOff` (a pen with a slash, meant to read as "editing disabled") was tied to `isLocked`. The dropdown menu itself (`components/pages/page-actions-menu.tsx`) paired its own Lock/Unlock and Eye/EyeOff icons correctly — only this table's row badges had the assignment backwards.
