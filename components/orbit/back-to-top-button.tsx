"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 400;

// Floats bottom-right once the admin scroll container has scrolled past a
// threshold — lets a long list (e.g. Templates) stay a single scannable
// page instead of being split into paginated chunks.
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("orbit-admin-scroll");
    if (!el) return;
    function onScroll() {
      setVisible(el!.scrollTop > SHOW_AFTER_PX);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => document.getElementById("orbit-admin-scroll")?.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-accent"
    >
      <ArrowUp size={13} />
      Top
    </button>
  );
}
