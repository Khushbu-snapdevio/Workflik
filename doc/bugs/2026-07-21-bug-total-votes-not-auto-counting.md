# Bug: "Total votes" doesn't update when someone is added to "Upvoted by"

**Reported:** 2026-07-21

## Symptom

In the built-in "Brainstorm Session" database template, each idea has a "Total votes" (Number) column and an "Upvoted by" (Person, multiple) column. Adding a person to "Upvoted by" — the app's whole model of "upvoting" an idea — left "Total votes" at `0`; it never reflected how many people had upvoted.

## Root cause

The two properties were never actually linked. In the template's seed definition (`app/api/orbit/templates/seed/route.ts`), "Total votes" was a plain `type: "number"` property and "Upvoted by" a `type: "person"` property — two independent fields with no computation between them. There was no mechanism anywhere in the app — no general one, and no template-specific one — that recomputed "Total votes" from "Upvoted by"; a user had to type the count in by hand.

More generally, the app's Formula property system (added earlier, `lib/formula/`) had no way to ask "how many items does this Person/Multi-select/Relation property hold" at all — `FormulaValue` is a strict scalar type (`number | string | boolean | Date | null`), and referencing a Person property in a formula already resolves to a joined names string (e.g. `"Alice, Bob"`), not a count. So even hand-authoring a formula for this wasn't possible before this fix.

## Reproduction

1. Open a "Brainstorm Session" database (or create one from the template).
2. Add a person to an idea's "Upvoted by" column.
3. "Total votes" stays `0`.
