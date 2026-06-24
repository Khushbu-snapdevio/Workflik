"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";

interface FavoriteButtonProps {
  pageId:      string;
  workspaceId: string;
  isFavorited: boolean;
}

export function FavoriteButton({ pageId, workspaceId, isFavorited: initial }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initial);
  const [pending, setPending]     = useState(false);

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
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`flex size-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-accent disabled:opacity-50 ${
        favorited
          ? "text-warning hover:text-warning/80"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Star size={16} />
    </button>
  );
}
