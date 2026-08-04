"use client";

import { useState } from "react";
import { AlertCircle, ArrowLeftRight, X } from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoleSelect } from "@/components/ui/role-select";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";
import { getAvatarColor } from "@/lib/utils";

type Role = "admin" | "editor" | "viewer";

const ADMIN_ROLE_OPTION = { value: "admin", label: "Admin" } as const;
const BASE_ROLE_OPTIONS = [
 { value: "editor", label: "Member" },
 { value: "viewer", label: "Viewer" },
] as const;

interface MemberRow {
 id:      string;
 userId:    string | null;
 role:     string;
 status:    string;
 invitedEmail: string | null;
 inviteExpires: Date | null;
 joinedAt:   Date | null;
 createdAt:   Date;
 userName:   string | null;
 userEmail:   string | null;
 userImage:   string | null;
}
interface Props {
 workspaceId:  string;
 workspaceName: string;
 currentUserId: string;
 isAdmin:    boolean;
 isOwner:    boolean;
 ownerUserId:  string | null;
 members:    MemberRow[];
}

const ROLE_LABELS: Record<string, string> = {
 admin:  "Admin",
 editor: "Member",
 viewer: "Viewer",
};

const ROLE_STYLES: Record<string, { badge: string; dot: string }> = {
 admin: { badge: "bg-muted text-muted-foreground",   dot: "bg-foreground/40" },
 editor: { badge: "bg-muted text-muted-foreground",  dot: "bg-foreground/40" },
 viewer: { badge: "bg-muted/50 text-muted-foreground", dot: "bg-muted-foreground" },
};

function ago(d: Date | null | undefined) {
 if (!d) return "—";
 const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
 if (s < 60) return "just now";
 const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
 const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
 return `${Math.floor(h / 24)}d ago`;
}

export function WorkspaceMembersSection({ workspaceId, currentUserId, isAdmin, isOwner, ownerUserId, members: init }: Props) {
 const [members,  setMembers] = useState(init);
 const [email,   setEmail]  = useState("");
 const [role,   setRole]   = useState<Role>("editor");
 const inviteRoleOptions = isOwner ? [ADMIN_ROLE_OPTION, ...BASE_ROLE_OPTIONS] : BASE_ROLE_OPTIONS;
 const [inviting, setInviting] = useState(false);
 const [inviteErr, setInviteErr] = useState("");
 const [busy,   setBusy]   = useState<string | null>(null);
 const [actionErr, setActionErr] = useState("");
 const [pendingRemove, setPendingRemove] = useState<{ userId: string; name: string } | null>(null);
 const [pendingCancelInvite, setPendingCancelInvite] = useState<{ id: string; email: string } | null>(null);
 const [pendingTransfer, setPendingTransfer] = useState<{ userId: string; name: string } | null>(null);
 const [transferBusy, setTransferBusy] = useState(false);
 const [transferSent, setTransferSent] = useState<string | null>(null);
 const [transferErr, setTransferErr] = useState("");
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 const active = members.filter(m => m.status === "active");
 const invited = members.filter(m => m.status === "invited");

 async function invite() {
  if (!email.trim()) return;
  const invitedEmail = email.trim();
  setInviting(true); setInviteErr("");
  try {
   const r = await fetch(`/api/workspaces/${workspaceId}/members`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: invitedEmail, role }),
   });
   if (r.ok) {
    const newMember = await r.json();
    setMembers(prev => [...prev, newMember]);
    setEmail("");
    toast.success("Invitation sent", { description: `${invitedEmail} will get an email to join as ${ROLE_LABELS[role] ?? role}.` });
   } else {
    const d = await r.json().catch(() => ({}));
    setInviteErr(d.error ?? "Failed to send invite");
   }
  } catch { setInviteErr("Network error"); }
  finally { setInviting(false); }
 }

 async function changeRole(userId: string, newRole: Role) {
  setBusy(userId); setActionErr("");
  try {
   const r = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: newRole }),
   });
   if (r.ok) setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
   else { const d = await r.json().catch(() => ({})); setActionErr((d as { error?: string }).error ?? "Failed to update role"); }
  } catch { setActionErr("Network error"); }
  finally { setBusy(null); }
 }

 async function remove(userId: string) {
  setBusy(userId); setActionErr("");
  try {
   const r = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
   if (r.ok) setMembers(prev => prev.filter(m => m.userId !== userId));
   else { const d = await r.json().catch(() => ({})); setActionErr((d as { error?: string }).error ?? "Failed to remove member"); }
  } catch { setActionErr("Network error"); }
  finally { setBusy(null); }
 }

 async function cancelInvite(id: string) {
  setBusy(id); setActionErr("");
  try {
   const r = await fetch(`/api/workspaces/${workspaceId}/invitations/${id}`, { method: "DELETE" });
   if (r.ok) setMembers(prev => prev.filter(m => m.id !== id));
   else { const d = await r.json().catch(() => ({})); setActionErr((d as { error?: string }).error ?? "Failed to cancel invite"); }
  } catch { setActionErr("Network error"); }
  finally { setBusy(null); }
 }

 async function transferOwnership(userId: string, name: string) {
  setTransferBusy(true); setTransferErr("");
  try {
   const r = await fetch(`/api/workspaces/${workspaceId}/transfer`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId: userId }),
   });
   if (r.ok) setTransferSent(name);
   else { const d = await r.json().catch(() => ({})); setTransferErr((d as { error?: string }).error ?? "Failed to start transfer"); }
  } catch { setTransferErr("Network error"); }
  finally { setTransferBusy(false); }
 }

 async function resend(id: string, email: string) {
  setBusy(`resend-${id}`); setActionErr("");
  try {
   const r = await fetch(`/api/workspaces/${workspaceId}/invitations/${id}/resend`, { method: "POST" });
   if (r.ok) toast.success("Invitation resent", { description: `A new invite email was sent to ${email}.` });
   else { const d = await r.json().catch(() => ({})); setActionErr((d as { error?: string }).error ?? "Failed to resend invite"); }
  } catch { setActionErr("Network error"); }
  finally { setBusy(null); }
 }

 return (
  <div className="mx-auto max-w-195 px-4 pt-4 pb-8 sm:px-6 md:px-8 md:pt-6 md:pb-10">

   {/* ── Stats strip ── */}
   <div className="mb-7 grid grid-cols-3 gap-3">
    {[
     { label: "Total members", value: active.length },
     { label: "Admins",    value: active.filter(m => m.role === "admin").length },
     { label: "Pending",    value: invited.length },
    ].map(stat => (
     <div key={stat.label} className="rounded-md border border-border bg-muted px-4 py-3">
      <p className="text-2xl font-bold leading-tight text-foreground">{stat.value}</p>
      <p className="text-xs text-muted-foreground">{stat.label}</p>
     </div>
    ))}
   </div>

   {/* ── Invite ── */}
   {isAdmin && (
    <div className="mb-7">
     <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Invite people</p>
     <div className="overflow-hidden rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
       <Input
        type="email"
        value={email}
        placeholder="colleague@company.com"
        onChange={e => { setEmail(e.target.value); setInviteErr(""); }}
        onKeyDown={e => e.key === "Enter" && invite()}
        className="flex-1 focus-visible:border-primary"
       />
       <RoleSelect value={role} options={inviteRoleOptions} onChange={v => setRole(v as Role)} />
       <Button
        type="button"
        size="sm"
        onClick={invite}
        disabled={inviting || !email.trim()}
        >
        {inviting ? "Sending…" : "Invite"}
       </Button>
      </div>
      {inviteErr && (
       <p className="mt-2.5 flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle size={14} className="shrink-0" />
        {inviteErr}
       </p>
      )}
     </div>
    </div>
   )}

   {actionErr && (
    <p className="mb-4 flex items-center gap-1.5 rounded-sm bg-destructive/5 px-3 py-2 text-xs text-destructive">
     <AlertCircle size={14} className="shrink-0" />
     {actionErr}
    </p>
   )}

   {transferErr && (
    <p className="mb-4 flex items-center gap-1.5 rounded-sm bg-destructive/5 px-3 py-2 text-xs text-destructive">
     <AlertCircle size={14} className="shrink-0" />
     {transferErr}
    </p>
   )}

   {transferSent && (
    <p className="mb-4 rounded-sm border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
     Confirmation email sent to your inbox — the transfer to <strong className="text-foreground">{transferSent}</strong> completes once you click the link there.
    </p>
   )}

   {/* ── Active members ── */}
   <div className="mb-7">
    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Members</p>
    <div className="overflow-hidden rounded-lg border border-border bg-card">
     {active.map((m, i) => {
      const display  = m.userName?.trim() || m.userEmail?.trim() || m.invitedEmail?.trim() || "Unknown";
      const isMe    = m.userId === currentUserId;
      const isAdminRow = m.role === "admin";
      const isOwnerRow = !!m.userId && m.userId === ownerUserId;
      // A regular admin can manage editors/viewers; only the owner can also
      // touch other admins. Nobody can manage their own row or the owner's
      // (the owner's role only changes via Transfer Ownership).
      const canManageRole = isAdmin && !isMe && !isOwnerRow && (!isAdminRow || isOwner);
      const rowRoleOptions = isOwner ? [ADMIN_ROLE_OPTION, ...BASE_ROLE_OPTIONS] : BASE_ROLE_OPTIONS;
      const style   = ROLE_STYLES[m.role] ?? ROLE_STYLES.viewer!;
      return (
       <div key={m.id} className={`flex items-center gap-3.5 px-5 py-3.5 ${i < active.length - 1 ? "border-b border-border" : ""}`}>
        {m.userImage
         ? <img src={m.userImage} alt={display} className="size-9 shrink-0 rounded-full object-cover ring-1 ring-border" />
         : <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-border ${getAvatarColor(display)}`}>{(()=>{const w=display.split(/[\s._@-]+/).filter(Boolean);return(w.length>=2?w[0][0]!+w[w.length-1][0]!:display.slice(0,2)).toUpperCase();})()}</div>
        }
        <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{display}</p>
          {isMe && <span className="shrink-0 rounded-xs bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">you</span>}
         </div>
         {m.userName && m.userEmail && <p className="text-xs text-muted-foreground truncate">{m.userEmail}</p>}
        </div>
        {/* Role control */}
        {canManageRole ? (
         <RoleSelect value={m.role} options={rowRoleOptions} onChange={v => changeRole(m.userId!, v as Role)} disabled={busy === m.userId} />
        ) : (
         <Badge variant="secondary" className={`shrink-0 flex items-center gap-1.5 ${style.badge}`}>
          <span className={`size-1.5 rounded-full ${style.dot}`} />
          {ROLE_LABELS[m.role] ?? m.role}
          {isOwnerRow && <span className="text-2xs font-normal text-muted-foreground">(owner)</span>}
         </Badge>
        )}
        {/* Transfer ownership — owner only, to anyone else active */}
        {isOwner && !isOwnerRow && m.userId && (
         <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPendingTransfer({ userId: m.userId!, name: display })}
          disabled={transferBusy}
          onMouseEnter={(e) => showTooltip("Transfer ownership to this person", e)}
          onMouseLeave={hideTooltip}
          className="flex size-7 shrink-0 items-center justify-center p-0 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground shadow-none border-0"
         >
          <ArrowLeftRight size={14} />
         </Button>
        )}
        {/* Remove button */}
        {canManageRole && m.userId && (
         <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPendingRemove({ userId: m.userId!, name: display })}
          disabled={busy === m.userId}
          onMouseEnter={(e) => showTooltip("Remove", e)}
          onMouseLeave={hideTooltip}
          className="flex size-7 shrink-0 items-center justify-center p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shadow-none border-0"
         >
          <X size={14} />
         </Button>
        )}
       </div>
      );
     })}
     {active.length === 0 && (
      <div className="px-5 py-8 text-center text-sm text-muted-foreground">No active members yet.</div>
     )}
    </div>
   </div>

   {/* ── Pending invitations ── */}
   {invited.length > 0 && (
    <div>
     <div className="mb-2 flex items-center gap-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">Pending invitations</p>
      <span className="rounded-xs bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{invited.length}</span>
     </div>
     <div className="overflow-hidden rounded-lg border border-border bg-card">
      {invited.map((m, i) => {
       const addr = m.invitedEmail ?? m.userEmail ?? "—";
       return (
        <div key={m.id} className={`flex items-center gap-3.5 px-5 py-3.5 ${i < invited.length - 1 ? "border-b border-border" : ""}`}>
         <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-xs font-bold text-muted-foreground">
          {addr.slice(0,2).toUpperCase()}
         </div>
         <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{addr}</p>
          <p className="text-xs text-muted-foreground">Invited {ago(m.createdAt)}</p>
         </div>
         <Badge variant="secondary" className="shrink-0">
          {ROLE_LABELS[m.role] ?? m.role}
         </Badge>
         {isAdmin && (
          <div className="flex items-center gap-1.5">
           <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resend(m.id, addr)}
            disabled={busy === `resend-${m.id}`}
            >
            {busy === `resend-${m.id}` ? "…" : "Resend"}
           </Button>
           <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPendingCancelInvite({ id: m.id, email: addr })}
            disabled={busy === m.id}
            onMouseEnter={(e) => showTooltip("Cancel invitation", e)}
            onMouseLeave={hideTooltip}
            className="flex size-7 items-center justify-center p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shadow-none border-0"
           >
            <X size={14} />
           </Button>
          </div>
         )}
        </div>
       );
      })}
     </div>
    </div>
   )}

   <ConfirmDialog
    open={!!pendingRemove}
    onOpenChange={(o) => !o && setPendingRemove(null)}
    title={`Remove ${pendingRemove?.name}?`}
    description="They will lose access to this workspace immediately. This also resets the shareable invite link, so anyone else who has it will need a new one."
    confirmLabel="Remove"
    onConfirm={() => { if (pendingRemove) { remove(pendingRemove.userId); setPendingRemove(null); } }}
   />

   <ConfirmDialog
    open={!!pendingCancelInvite}
    onOpenChange={(o) => !o && setPendingCancelInvite(null)}
    title="Cancel this invitation?"
    description={`The invitation to ${pendingCancelInvite?.email} will be revoked.`}
    cancelLabel="Keep invite"
    confirmLabel="Cancel invite"
    onConfirm={() => { if (pendingCancelInvite) { cancelInvite(pendingCancelInvite.id); setPendingCancelInvite(null); } }}
   />

   <ConfirmDialog
    open={!!pendingTransfer}
    onOpenChange={(o) => !o && setPendingTransfer(null)}
    title={`Transfer ownership to ${pendingTransfer?.name}?`}
    description="You'll stay an admin, but they'll become the sole workspace owner — only they will be able to grant or revoke the Admin role after this. We'll email you a confirmation link before it takes effect."
    confirmLabel="Send confirmation email"
    confirmLoadingLabel="Sending…"
    loading={transferBusy}
    onConfirm={() => { if (pendingTransfer) transferOwnership(pendingTransfer.userId, pendingTransfer.name); }}
   />

   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
  </div>
 );
}
