# Bug: @-mention dropdown is clipped off-screen when the caret is low on the page

## What's broken (user's perspective)

When typing `@` (or `[[`) in the editor while the cursor is near the bottom of the
page — e.g. after entering several lines of text — the mention suggestion list
(People / Pages / Dates) opens downward and runs off the bottom of the viewport.
The lower rows ("Next Monday", etc.) are cut off or unreachable.

## Reproduce

1. Open a page, add enough text that the caret sits in the lower third of the screen.
2. Type `@`.
3. The dropdown opens below the caret and extends past the bottom edge; its lower
   entries are clipped.

## Root cause

[components/editor/mention-list.tsx](../../components/editor/mention-list.tsx) hard-positioned
the popup directly below the caret with no viewport awareness:

```tsx
style={{ position: "fixed", top: pos.bottom + 4, left: pos.left, zIndex: 400 }}
className="... overflow-hidden ..."
```

It always used `top: pos.bottom` (open downward), had no maximum height, and no
horizontal clamp. So whenever the caret was low enough that the list's height
exceeded the space below it, the list overflowed off-screen.

The sibling slash-command menu ([components/editor/slash-menu.tsx](../../components/editor/slash-menu.tsx))
already flips above the caret and clamps to the right edge — the mention list simply
never got the same treatment.
