import { useEffect } from "react";

/**
 * Blocks wheel/touch scrolling everywhere on the page while `active` is true,
 * except inside elements matched by `isExempt`. Prevents a `position: fixed`
 * popover (positioned once via `getBoundingClientRect()` at open time) from
 * visually drifting away from its trigger when the page scrolls underneath
 * it — used instead of live-repositioning for popovers whose trigger doesn't
 * expose a stable ref to re-measure from.
 */
export function useScrollLockWhileOpen(active: boolean, isExempt: (target: HTMLElement) => boolean) {
  useEffect(() => {
    if (!active) return;
    function preventScroll(e: WheelEvent | TouchEvent) {
      const target = e.target as HTMLElement;
      if (isExempt(target)) return;
      e.preventDefault();
    }
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
