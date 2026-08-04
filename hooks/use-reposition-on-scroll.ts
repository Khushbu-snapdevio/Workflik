import { useEffect } from "react";

// Keeps a `position: fixed` popover glued to its trigger on scroll/resize (capture phase, catches nested
// scroll containers too) — otherwise it freezes at its open-time coordinates while the trigger moves away.
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
