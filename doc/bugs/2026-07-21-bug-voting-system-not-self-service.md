# Bug: voting behaved like two independent, arbitrarily-editable fields

**Reported:** 2026-07-21

## Symptom

"Upvoted by" (Person) and "Total votes" (previously Number, then Formula per the earlier fix in this doc series) behaved like ordinary database properties:

- Any workspace member could open "Upvoted by" and add or remove *anyone's* vote — including voting on someone else's behalf or silently removing someone else's vote.
- Before the Formula fix, "Total votes" could be typed to any arbitrary number regardless of who'd actually voted. After that fix it was read-only, but the API endpoint underneath still had no concept of "this is a computed property" — a direct `PATCH` with a `totalVotes`-style body would have just written a value nothing ever reads back.

There was no concept of "the current user's own vote" anywhere — voting had none of the self-service guarantees GitHub Discussions, Linear, Jira Product Discovery, Reddit, or Productboard all have.

## Root cause

`app/api/entries/[id]/property-values/[propId]/route.ts` — the one endpoint every property value write goes through — accepted any `value` for any property from any non-viewer workspace member, with no per-type or per-property validation at all beyond role. A Person property's value is a plain `{ userIds: string[], _members: [...] }` blob; nothing distinguished "an Assignee-style property anyone can set for anyone" from "a vote, which should only ever reflect the acting user."

On the frontend, every "person" cell — table, board, gallery, and the entry detail page — opened the same generic multi-person picker used for Assignee-style properties, regardless of what the property was conceptually for.

## Reproduction

1. As a non-admin member, open a database with an "Upvoted by" (Person) property that already has other members' votes on it.
2. Click the cell → the full people picker opens, showing every workspace member as checkable.
3. Check or uncheck a member who isn't you. It saves — nothing stops a vote from being added or removed on someone else's behalf.
