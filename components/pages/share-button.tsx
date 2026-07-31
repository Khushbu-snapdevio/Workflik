"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Share2 } from "lucide-react";
import { SharePanel } from "@/components/pages/share-panel";
import { usePagePrivacy } from "@/components/pages/page-privacy-context";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";
import { getClampedTop } from "@/lib/ui/clamp-to-viewport";

interface Props {
 pageId:      string;
 pageShortId:   string;
 workspaceSlug:  string;
 currentUserId:  string;
 currentUserName: string | null;
 currentUserEmail: string | null;
 currentUserImage: string | null;
 isEditor:     boolean;
}

export function ShareButton({
 pageId, pageShortId, workspaceSlug, currentUserId, currentUserName, currentUserEmail, currentUserImage,
}: Props) {
 const { isPrivate: pagePrivate, setIsPrivate: setPagePrivate } = usePagePrivacy();
 const [open, setOpen]    = useState(false);
 const [anchor, setAnchor] = useState<DOMRect | null>(null);
 const panelRef = useRef<HTMLDivElement>(null);
 const btnRef  = useRef<HTMLButtonElement>(null);

 useScrollLockWhileOpen(open, (target) =>
  !!panelRef.current?.contains(target) || !!target.closest?.('[role="alertdialog"]'));

 // Lets CopyLinkButton (a topbar sibling with no shared state) reopen this
 // same panel for its "Give access" action on a private-page link copy.
 useEffect(() => {
  function handler(e: Event) {
   const detail = (e as CustomEvent<{ pageId: string }>).detail;
   if (detail?.pageId !== pageId) return;
   const rect = btnRef.current?.getBoundingClientRect();
   if (rect) setAnchor(rect);
   setOpen(true);
  }
  window.addEventListener("workflik:open-share", handler);
  return () => window.removeEventListener("workflik:open-share", handler);
 }, [pageId]);

 const handlePrivateToggle = useCallback(async (next: boolean) => {
  await fetch(`/api/pages/${pageId}`, {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body:  JSON.stringify({ isPrivate: next }),
  });
  setPagePrivate(next);
  // Moves the page into/out of the sidebar's Private section right away —
  // otherwise it only updates when the page-tree SSE poll next fires (4s
  // server-side), which read as a ~5s lag.
  window.dispatchEvent(new CustomEvent("pages:refresh"));
 }, [pageId, setPagePrivate]);

 function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  setAnchor(e.currentTarget.getBoundingClientRect());
  setOpen((v) => !v);
 }

 function close() { setOpen(false); setAnchor(null); }

 return (
  <>
   <button
    ref={btnRef}
    type="button"
    onClick={handleClick}
    className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]"
   >
    <Share2 size={14} />
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
      ref={panelRef}
      style={{
       position: "fixed",
       top:   getClampedTop(anchor, 480, { gap: 8 }),
       // align panel's right edge with button's right edge, but never push off left edge
       right:  Math.max(16, window.innerWidth - anchor.right),
       zIndex:  201,
      }}
     >
      <SharePanel
       pageId={pageId}
       pageShortId={pageShortId}
       workspaceSlug={workspaceSlug}
       currentUserId={currentUserId}
       currentUserName={currentUserName}
       currentUserEmail={currentUserEmail}
       currentUserImage={currentUserImage}
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
