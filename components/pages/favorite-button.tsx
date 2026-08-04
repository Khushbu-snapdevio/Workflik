"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { IconTooltip } from "@/components/ui/icon-tooltip";

interface FavoriteButtonProps {
  pageId:      string;
  workspaceId: string;
  isFavorited: boolean;
}

export function FavoriteButton({ pageId, workspaceId, isFavorited: initial }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initial);
  const [pending, setPending]     = useState(false);
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  // The page header isn't remounted when navigating between pages (same
  // component position, no key), so `useState(initial)` alone would keep the
  // previously-viewed page's state — the star showing "one page behind". Re-sync
  // to the server-provided value whenever the page (or its favorite state)
  // changes. Only fires on real navigation / prop changes, so it never clobbers
  // an in-page optimistic toggle (which leaves `initial` untouched).
  useEffect(() => {
    setFavorited(initial);
  }, [pageId, initial]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ pageId: string; isFavorited: boolean }>).detail;
      if (detail?.pageId === pageId) setFavorited(detail.isFavorited);
    }
    window.addEventListener("workflik:favorites-changed", handler);
    return () => window.removeEventListener("workflik:favorites-changed", handler);
  }, [pageId]);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const next = !favorited;
    setFavorited(next);

    try {
      if (next) {
        await fetch("/api/user/favorites", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ pageId, workspaceId }),
        });
      } else {
        await fetch(`/api/user/favorites/${pageId}`, { method: "DELETE" });
      }
      window.dispatchEvent(new CustomEvent("workflik:favorites-changed", { detail: { pageId, isFavorited: next } }));
    } catch {
      setFavorited(!next); // revert on error
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      onMouseEnter={(e) => showTooltip(favorited ? "Remove from favorites" : "Add to favorites", e)}
      onMouseLeave={hideTooltip}
      className={`flex size-7 items-center justify-center rounded-sm transition-colors disabled:opacity-50 ${
        favorited
          ? "text-warning hover:bg-warning/10"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <Star size={16} fill={favorited ? "currentColor" : "none"} />
    </button>

    {tooltip && typeof document !== "undefined" && createPortal(
      <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
      document.body,
    )}
    </>
  );
}
