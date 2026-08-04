"use client";

import { PopoverButton } from "@headlessui/react";

// Headless UI's `anchor` prop positions a floating panel relative to that
// component's own trigger element (PopoverButton/ListboxButton/ComboboxInput
// …) — there's no public API to point it at an arbitrary external
// coordinate. relation/formula/rollup/change-property-type pickers are all
// opened from a trigger rendered by a *different* component (a column
// header, a property row, …) that only ever hands down that trigger's
// already-captured `DOMRect`, not a live ref. This renders an invisible,
// zero-interaction PopoverButton pinned to that rect so floating-ui has a
// real DOM node to measure from — the "virtual reference" floating-ui itself
// supports via a plain `{ getBoundingClientRect }` object, just realized here
// as an actual (inert) element since Headless UI's public API only accepts a
// real trigger ref, not a raw virtual-element object.
export function RectAnchorTrigger({ rect }: { rect: DOMRect }) {
  return (
    <PopoverButton
      as="div"
      aria-hidden
      tabIndex={-1}
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
      }}
    />
  );
}
