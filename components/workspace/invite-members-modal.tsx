"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleSelect } from "@/components/ui/role-select";

type Role = "admin" | "editor" | "viewer";

const BASE_ROLE_OPTIONS = [
 { value: "editor", label: "Member" },
 { value: "viewer", label: "Viewer" },
] as const;
const ADMIN_ROLE_OPTION = { value: "admin", label: "Admin" } as const;

const ROLE_CAPTIONS: Record<Role, string> = {
 admin: "Full access, including workspace settings and inviting others.",
 editor: "Can create, edit, and comment on pages.",
 viewer: "Can view and comment, but not edit.",
};

interface Props {
 workspaceId: string;
 isOwner?:  boolean;
 onClose:   () => void;
}

// Quick "invite by email" popup reachable from the workspace switcher —
// matches Notion's own pattern (a fast path for the common case) without
// duplicating the invite logic already built into
// components/settings/workspace-members-section.tsx, which stays the fuller
// page for managing existing members/pending invites/roles. Admin is only
// offered when isOwner is true, mirroring that same page's own gating —
// assigning Admin is owner-only server-side, so showing it to anyone else
// would just fail silently on submit.
export function InviteMembersModal({ workspaceId, isOwner = false, onClose }: Props) {
 const roleOptions = isOwner ? [ADMIN_ROLE_OPTION, ...BASE_ROLE_OPTIONS] : BASE_ROLE_OPTIONS;
 const [emails, setEmails] = useState("");
 const [role, setRole]   = useState<Role>("editor");
 const [sending, setSending] = useState(false);
 const [error, setError]   = useState("");

 useEffect(() => {
  function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
 }, [onClose]);

 async function handleSendInvite() {
  const list = Array.from(new Set(
   emails.split(",").map((e) => e.trim()).filter(Boolean)
  ));
  if (list.length === 0) {
   setError("Add at least one email address.");
   return;
  }

  setSending(true);
  setError("");
  const failed: string[] = [];
  let lastReason = "";

  for (const email of list) {
   try {
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body:  JSON.stringify({ email, role }),
    });
    if (!res.ok) {
     failed.push(email);
     const body = await res.json().catch(() => null);
     lastReason = body?.error || `HTTP ${res.status}`;
    }
   } catch {
    failed.push(email);
    lastReason = "Network error";
   }
  }

  setSending(false);

  const sent = list.length - failed.length;
  if (sent > 0) {
   toast.success(sent === 1 ? "Invitation sent" : `${sent} invitations sent`, {
    description: sent === 1
     ? `${list.find((e) => !failed.includes(e))} will get an email to join.`
     : "They'll each get an email to join.",
   });
  }

  if (failed.length > 0) {
   setError(`Couldn't invite ${failed.join(", ")}: ${lastReason}`);
   if (sent === 0) return;
  }

  onClose();
 }

 return createPortal(
  <>
   <div className="fixed inset-0 z-[580] bg-black/40" onClick={onClose} />
   <div
    className="fixed left-1/2 top-1/2 z-[590] w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-border bg-card p-6"
    onClick={(e) => e.stopPropagation()}
   >
    <div className="mb-4 flex flex-col items-center text-center">
     <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
      <UserPlus size={18} className="text-primary" />
     </div>
     <h2 className="text-base font-semibold text-foreground">Add members</h2>
     <p className="mt-1 text-sm text-muted-foreground">
      Type or paste in emails below, separated by commas
     </p>
    </div>

    <Input
     autoFocus
     value={emails}
     onChange={(e) => { setEmails(e.target.value); setError(""); }}
     onKeyDown={(e) => { if (e.key === "Enter") handleSendInvite(); }}
     placeholder="Search names or emails"
     className="mb-4"
    />

    <div className="mb-4">
     <p className="mb-1.5 text-xs font-medium text-muted-foreground">Select role</p>
     <RoleSelect
      value={role}
      options={roleOptions}
      onChange={(v) => setRole(v as Role)}
      triggerClassName="w-full border-border bg-background"
     />
     <p className="mt-1.5 text-xs text-muted-foreground/70">{ROLE_CAPTIONS[role]}</p>
    </div>

    {error && (
     <p className="mb-4 text-xs text-destructive">{error}</p>
    )}

    <Button
     className="w-full"
     onClick={handleSendInvite}
     disabled={sending || !emails.trim()}
    >
     {sending ? "Sending…" : "Send invite"}
    </Button>
    <Button
     variant="ghost"
     className="mt-2 w-full text-muted-foreground"
     onClick={onClose}
     disabled={sending}
    >
     Cancel
    </Button>
   </div>
  </>,
  document.body,
 );
}
