# Bug: Library "Rows per page" control is unreliable and doesn't remember your choice

**Reported:** 2026-07-31

## Symptom

On the Library page's footer "Rows per page" field:

- Clicking the tiny up/down chevron buttons was unreliable.
- Pressing the Up/Down arrow keys while the field was focused did nothing.
- The field accepted any text, not just digits.
- Setting rows-per-page to a non-default value (e.g. 15), navigating into a page, and coming back reset it to the default (10).

## Root cause

`app/app/[workspace]/library/library-client.tsx`:

- The chevron buttons had no `onMouseDown` guard, so a click on them first blurred the adjacent text input (firing `submitPageSizeInput`) before the button's own `onClick` ran — two state updates racing back to back on every click — and their hit area was only 10px tall (`h-2.5`), easy to miss.
- The input's `onKeyDown` only handled `Enter`; there was no handling for `ArrowUp`/`ArrowDown` at all, so the field ignored the arrow keys entirely (this isn't a native `<input type="number">`, so there's no built-in spinner behavior to fall back on).
- The input's `onChange` stored `e.target.value` verbatim — `inputMode="numeric"` only hints at a numeric mobile keyboard, it doesn't block non-digit characters on desktop.
- `pageSize` was plain `useState<number>(DEFAULT_PAGE_SIZE)` with no persistence anywhere (not in the URL, not in storage). `page.tsx` always server-renders the first page at `DEFAULT_PAGE_SIZE` and never reads a `pageSize` search param, and the client never wrote its chosen size anywhere durable — so remounting `LibraryClient` (e.g. navigating to a page and back) always started over at the default.
