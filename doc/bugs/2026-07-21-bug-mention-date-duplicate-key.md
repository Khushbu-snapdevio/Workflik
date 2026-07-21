# Bug: "@" date suggestions crash with a duplicate-key error on certain days

**Reported:** 2026-07-21

## Symptom

Typing `@` in the editor to bring up the mention suggestion list, then browsing to the "Dates" suggestions (Today/Tomorrow/Yesterday/Next Monday/Next Wednesday/Next Friday), threw a React console error:

```
Encountered two children with the same key, `2026-07-22`. Keys should be unique...
  at MentionRow (components/editor/mention-list.tsx:131:9)
```

## Root cause

`generateDateItems` in `components/editor/extensions/mention-extension.ts` builds the six quick-pick date candidates, each with an `id` derived from its resolved date (`date.toISOString().split("T")[0]`), and `mention-list.tsx` uses that `id` directly as the React `key` for each row.

`nextWeekdayDate(targetDay)` computes "the next occurrence of this weekday" — including *tomorrow*, if tomorrow already is that weekday:

```ts
function nextWeekdayDate(targetDay: number): Date {
  const today = new Date();
  const diff = (targetDay + 7 - today.getDay()) % 7 || 7;
  return addDays(today, diff);
}
```

That's a correct, literal reading of "next Wednesday" — but it means on a Tuesday, `nextWeekdayDate(3)` ("Next Wednesday") resolves to the exact same date as `addDays(now, 1)` ("Tomorrow"). The list then contains two entries with different labels but an identical `id`/date — the duplicate React key. The same collision happens for "Next Monday" on a Sunday, and "Next Friday" on a Thursday.

## Reproduction

1. On a Tuesday, Sunday, or Thursday, open any page and type `@` in the editor.
2. Watch the browser console (or just the suggestion list) — a duplicate-key warning/error fires for whichever "Next \_\_\_" option collides with Tomorrow.
