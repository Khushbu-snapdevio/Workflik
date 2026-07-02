"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useScrollLockWhileOpen } from "@/hooks/use-scroll-lock-while-open";

interface Props {
 workspaceSlug: string;
 workspaceName: string;
}

export function WorkspaceShareButton({ workspaceSlug, workspaceName }: Props) {
 const [open, setOpen] = useState(false);
 const [anchor, setAnchor] = useState<DOMRect | null>(null);
 const [copied, setCopied] = useState(false);
 const btnRef = useRef<HTMLButtonElement>(null);
 const panelRef = useRef<HTMLDivElement>(null);

 useScrollLockWhileOpen(open, (target) => !!panelRef.current?.contains(target));

 function handleClick() {
  const rect = btnRef.current?.getBoundingClientRect() ?? null;
  setAnchor(rect);
  setOpen((v) => !v);
 }

 function close() {
  setOpen(false);
  setAnchor(null);
 }

 function copyLink() {
  navigator.clipboard.writeText(window.location.href);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
 }

 useEffect(() => {
  if (!open) return;
  function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
 }, [open]);

 return (
  <>
   <button
    ref={btnRef}
    type="button"
    onClick={handleClick}
    className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3.5 text-sm font-medium text-foreground/70 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.97]"
   >
    <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
     <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
     <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
    Share
   </button>

   {open && anchor && typeof document !== "undefined" && createPortal(
    <>
     {/* Backdrop */}
     <div className="fixed inset-0" style={{ zIndex: 200 }} onClick={close} />

     {/* Popup */}
     <div
      ref={panelRef}
      style={{
       position: "fixed",
       top: anchor.bottom + 8,
       right: Math.max(16, window.innerWidth - anchor.right),
       zIndex: 201,
      }}
     >
      <div className="w-[calc(100vw-24px)] max-w-[320px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
       {/* Header */}
       <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
        <div className="flex items-center gap-2">
         <div className="flex size-6 items-center justify-center rounded bg-primary/10">
          <svg className="size-3.5 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
           <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
           <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
         </div>
         <span className="text-sm font-semibold text-foreground">Share workspace</span>
        </div>
        <button
         type="button"
         onClick={close}
         className="rounded-[var(--radius-xs)] p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
         <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
         </svg>
        </button>
       </div>

       {/* Body */}
       <div className="px-4 py-3.5 space-y-3">
        {/* Workspace name pill */}
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border/60 bg-sidebar px-3 py-2.5">
         <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-primary text-sm font-bold text-primary-foreground">
          {workspaceName[0]?.toUpperCase() ?? "W"}
         </div>
         <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{workspaceName}</p>
          <p className="text-xs text-muted-foreground">Workspace</p>
         </div>
        </div>

        {/* Copy link */}
        <button
         type="button"
         onClick={copyLink}
         className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-card px-3.5 py-2.5 text-left transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.98]"
        >
         <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted/60">
          {copied ? (
           <svg className="size-4 text-success" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
           </svg>
          ) : (
           <svg className="size-4 text-muted-foreground" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
           </svg>
          )}
         </div>
         <div>
          <p className="text-xs font-semibold text-foreground">
           {copied ? "Copied!" : "Copy workspace link"}
          </p>
          <p className="text-xs text-muted-foreground">Share this URL with teammates</p>
         </div>
        </button>

        {/* Invite members */}
        <Link
         href={`/app/${workspaceSlug}/settings/members`}
         onClick={close}
         className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-card px-3.5 py-2.5 transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.98]"
        >
         <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
          <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
           <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
           <circle cx="9" cy="7" r="4"/>
           <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
         </div>
         <div>
          <p className="text-xs font-semibold text-foreground">Invite members</p>
          <p className="text-xs text-muted-foreground">Add teammates to this workspace</p>
         </div>
        </Link>
       </div>
      </div>
     </div>
    </>,
    document.body,
   )}
  </>
 );
}
