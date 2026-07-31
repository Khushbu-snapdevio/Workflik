# Bug: clicking the page/workspace icon button again doesn't close the emoji picker

**Reported:** 2026-07-31

## Symptom

Clicking a page's (or workspace's) icon button opens the Emoji/Icons/Upload picker, as expected. Clicking that same button again — expecting it to toggle closed, like any other open/close button in the app — did nothing visible: the picker stayed open instead of closing.

## Root cause

`components/pages/icon-picker.tsx`'s `IconPicker` closes itself on any outside click via a `document` `mousedown` listener registered with `capture: true`, checking only whether the click target is inside its own `pickerRef` subtree.

Every caller (`page-header.tsx`, `page-client.tsx`, `template-page-client.tsx`, `orbit/template-form.tsx`, `settings/workspace-general-section.tsx`) renders the trigger button as a *sibling* of `<IconPicker>`, not a descendant — so from `pickerRef`'s point of view, the trigger button itself counts as "outside." Clicking it again while open produced this sequence in a single click:

1. `mousedown` (capture phase, fires before the button's own `click` handler) → target is the button, not inside `pickerRef` → `IconPicker` calls `onClose()` → the open state flips to `false`.
2. `click` fires on the same button → its own handler runs `setOpen(p => !p)` — reading the *now-already-false* state — which flips it back to `true`.

Net effect: the picker closes and immediately reopens within the same click, which looks like nothing happened. Only a click genuinely outside both the button and the picker closed it.
