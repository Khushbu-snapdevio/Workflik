"use client";

import { useState } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import Link from "next/link";
import { Loader2, Share2, Link2, Check, Users } from "lucide-react";
import { toast } from "sonner";

interface Props {
 workspaceId:   string;
 workspaceSlug: string;
 workspaceName: string;
}

type InviteLinkState = { inviteLinkToken: string | null; inviteLinkActive: boolean };

export function WorkspaceShareButton({ workspaceId, workspaceSlug, workspaceName }: Props) {
 const [copied, setCopied] = useState(false);
 const [copying, setCopying] = useState(false);

 // Must copy the invite-link token (/invite/{token}), not the workspace's normal page URL —
 // that requires membership to view, so it's a dead end for anyone it's shared with.
 async function copyLink() {
  setCopying(true);
  try {
   let res = await fetch(`/api/workspaces/${workspaceId}/invite-link`);
   if (!res.ok) throw new Error();
   let state: InviteLinkState = await res.json();

   if (!state.inviteLinkActive || !state.inviteLinkToken) {
    res = await fetch(`/api/workspaces/${workspaceId}/invite-link`, { method: "POST" });
    if (!res.ok) {
     toast.error(res.status === 403
      ? "Ask a workspace admin to turn on the invite link"
      : "Couldn't create invite link — please try again.");
     return;
    }
    state = await res.json();
   }

   await navigator.clipboard.writeText(`${window.location.origin}/invite/${state.inviteLinkToken}`);
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
  } catch {
   toast.error("Couldn't copy invite link — please try again.");
  } finally {
   setCopying(false);
  }
 }

 return (
  <Popover>
   {({ close }) => (
    <>
     <PopoverButton className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-card px-3.5 text-sm font-medium text-foreground/70 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.97]">
      <Share2 size={14} />
      Share
     </PopoverButton>

     <PopoverPanel
      anchor={{ to: "bottom end", gap: 8 }}
      transition
      className="z-600 w-[calc(100vw-24px)] max-w-80 overflow-hidden rounded-lg border border-border bg-card transition duration-100 ease-out data-leave:opacity-0 data-leave:scale-95"
     >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pl-5 pr-4 py-3.5">
       <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded bg-primary/10">
         <Share2 size={14} className="text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">Share workspace</span>
       </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5 space-y-3">
       {/* Workspace name pill */}
       <div className="flex items-center gap-2 rounded-sm border border-border bg-sidebar px-3 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-xs bg-primary text-sm font-bold text-primary-foreground">
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
        disabled={copying}
        className="flex w-full items-center gap-3 rounded-sm border border-border bg-card px-3.5 py-2.5 text-left transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-70"
       >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted/60">
         {copying ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
         ) : copied ? (
          <Check className="size-4 text-success" />
         ) : (
          <Link2 className="size-4 text-muted-foreground" />
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
        className="flex items-center gap-3 rounded-sm border border-border bg-card px-3.5 py-2.5 transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.98]"
       >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10">
         <Users className="size-4 text-primary" />
        </div>
        <div>
         <p className="text-xs font-semibold text-foreground">Invite members</p>
         <p className="text-xs text-muted-foreground">Add teammates to this workspace</p>
        </div>
       </Link>
      </div>
     </PopoverPanel>
    </>
   )}
  </Popover>
 );
}
