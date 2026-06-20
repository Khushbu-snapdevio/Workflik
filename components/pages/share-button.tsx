"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ShareNetwork } from "@phosphor-icons/react";
import { SharePanel } from "@/components/pages/share-panel";

interface Props {
  pageId:        string;
  currentUserId: string;
  isPrivate:     boolean;
  isEditor:      boolean;
}

export function ShareButton({ pageId, currentUserId, isPrivate }: Props) {
  const [open, setOpen]               = useState(false);
  const [pagePrivate, setPagePrivate] = useState(isPrivate);
  const [anchor, setAnchor]           = useState<DOMRect | null>(null);

  const handlePrivateToggle = useCallback(async (next: boolean) => {
    await fetch(`/api/pages/${pageId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isPrivate: next }),
    });
    setPagePrivate(next);
  }, [pageId]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    setAnchor(e.currentTarget.getBoundingClientRect());
    setOpen((v) => !v);
  }

  function close() { setOpen(false); setAnchor(null); }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ShareNetwork size={14} />
        Share
      </button>

      {open && anchor && typeof document !== "undefined" && createPortal(
        <>
          {/* Invisible backdrop — blocks badge clicks behind the panel */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 200 }}
            onClick={close}
          />
          {/* Panel — right-aligned below the Share button, clamped to viewport */}
          <div
            style={{
              position: "fixed",
              top:      anchor.bottom + 8,
              // align panel's right edge with button's right edge, but never push off left edge
              right:    Math.max(16, window.innerWidth - anchor.right),
              zIndex:   201,
            }}
          >
            <SharePanel
              pageId={pageId}
              currentUserId={currentUserId}
              isPrivate={pagePrivate}
              onClose={close}
              onPrivateToggle={handlePrivateToggle}
            />
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
