import { useEffect } from "react";

// Blocks page scroll while `active` (except inside `isExempt` elements), so a `position: fixed` popover doesn't
// drift from its trigger — used when the trigger has no stable ref to live-reposition from instead.
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
