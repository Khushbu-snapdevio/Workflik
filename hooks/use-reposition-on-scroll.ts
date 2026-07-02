import { useEffect } from "react";

/**
 * Keeps a `position: fixed` popover glued to its trigger as the page scrolls
 * or resizes. Without this, a popover positioned once via
 * `getBoundingClientRect()` at open time freezes at those coordinates while
 * its trigger element moves away underneath it.
 *
 * Usage: call `reposition()` once when the popover opens (to set initial
 * position), then pass the same callback here — it re-runs on every scroll
 * (capture phase, so it catches scrolling in any nested container, not just
 * `window`) and resize while `active` is true.
 */
export function useRepositionOnScroll(active: boolean, reposition: () => void) {
  useEffect(() => {
    if (!active) return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
