"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, ChevronDown, Users, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const ROLE_OPTIONS = [
 { value: "editor", label: "Editor" },
 { value: "viewer", label: "Viewer" },
] as const;

function RoleSelect({
 value, onChange, disabled = false,
}: { value: string; onChange: (v: "editor" | "viewer") => void; disabled?: boolean }) {
 const [open, setOpen] = useState(false);
 const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
 const [mounted, setMounted] = useState(false);
 const btnRef = useRef<HTMLButtonElement>(null);
 const menuRef = useRef<HTMLDivElement>(null);
 const selected = ROLE_OPTIONS.find(o => o.value === value);

 useEffect(() => { setMounted(true); }, []);

 useEffect(() => {
  if (!open) return;
  function handleClick(e: MouseEvent) {
   const t = e.target as Node;
   if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
   setOpen(false);
  }
  function handleKey(e: KeyboardEvent) {
   if (e.key === "Escape") setOpen(false);
  }
  document.addEventListener("mousedown", handleClick);
  document.addEventListener("keydown", handleKey);
  return () => {
   document.removeEventListener("mousedown", handleClick);
   document.removeEventListener("keydown", handleKey);
  };
 }, [open]);

 function handleOpen() {
  if (!open && btnRef.current) {
   const rect = btnRef.current.getBoundingClientRect();
   setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }
  setOpen(o => !o);
 }

 const menu = mounted && open && pos ? createPortal(
  <div
   ref={menuRef}
   style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
   className="min-w-[110px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-card py-1"
  >
   {ROLE_OPTIONS.map(o => (
    <button
     key={o.value}
     type="button"
     onClick={() => { onChange(o.value); setOpen(false); }}
     className={[
      "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-xs transition-colors duration-150",
      o.value === value
       ? "bg-accent text-foreground font-medium"
       : "text-foreground hover:bg-accent",
     ].join(" ")}
    >
     {o.label}
     {o.value === value && <Check size={11} className="shrink-0 text-foreground" />}
    </button>
   ))}
  </div>,
  document.body
 ) : null;

 return (
  <>
   <button
    ref={btnRef}
    type="button"
    disabled={disabled}
    onClick={handleOpen}
    className={[
     "flex items-center gap-1.5 rounded-[var(--radius-sm)] border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors duration-150",
     "focus-visible:outline-none disabled:opacity-50",
     open ? "border-primary" : "border-border hover:border-border/80",
    ].join(" ")}
   >
    <span className="min-w-[44px] text-left">{selected?.label ?? value}</span>
    <ChevronDown
     size={12}
     className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    />
   </button>
   {menu}
  </>
 );
}

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
 members:    MemberRow[];
}

const ROLE_STYLES: Record<string, { badge: string; dot: string }> = {
 admin: { badge: "bg-muted text-muted-foreground",   dot: "bg-foreground/40" },
 editor: { badge: "bg-muted text-muted-foreground",  dot: "bg-foreground/40" },
 viewer: { badge: "bg-muted/50 text-muted-foreground", dot: "bg-muted-foreground" },
};

const AVATAR_BG_CLASSES = [
 "bg-primary", "bg-destructive", "bg-success", "bg-warning",
 "bg-muted-foreground", "bg-primary/70", "bg-destructive/70", "bg-success/70",
];
function avatarBgClass(s: string): string {
 let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
 return AVATAR_BG_CLASSES[Math.abs(h) % AVATAR_BG_CLASSES.length]!;
}
function ago(d: Date | null | undefined) {
 if (!d) return "—";
 const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
 if (s < 60) return "just now";
 const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
 const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
 return `${Math.floor(h / 24)}d ago`;
}

export function WorkspaceMembersSection({ workspaceId, currentUserId, isAdmin, members: init }: Props) {
 const [members,  setMembers] = useState(init);
 const [email,   setEmail]  = useState("");
 const [role,   setRole]   = useState<"editor"|"viewer">("editor");
 const [inviting, setInviting] = useState(false);
 const [inviteErr, setInviteErr] = useState("");
 const [busy,   setBusy]   = useState<string | null>(null);
 const [actionErr, setActionErr] = useState("");
 const [pendingRemove, setPendingRemove] = useState<{ userId: string; name: string } | null>(null);
 const [pendingCancelInvite, setPendingCancelInvite] = useState<{ id: string; email: string } | null>(null);

 const active = members.filter(m => m.status === "active");
 const invited = members.filter(m => m.status === "invited");

 async function invite() {
  if (!email.trim()) return;
  setInviting(true); setInviteErr("");
  try {
   const r = await fetch(`/api/workspaces/${workspaceId}/members`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), role }),
   });
   if (r.ok) { const newMember = await r.json(); setMembers(prev => [...prev, newMember]); setEmail(""); }
   else { const d = await r.json().catch(() => ({})); setInviteErr(d.error ?? "Failed to send invite"); }
  } catch { setInviteErr("Network error"); }
  finally { setInviting(false); }
 }

 async function changeRole(userId: string, newRole: "editor"|"viewer") {
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

 async function resend(id: string) {
  setBusy(`resend-${id}`); setActionErr("");
  try {
   const r = await fetch(`/api/workspaces/${workspaceId}/invitations/${id}/resend`, { method: "POST" });
   if (!r.ok) { const d = await r.json().catch(() => ({})); setActionErr((d as { error?: string }).error ?? "Failed to resend invite"); }
  } catch { setActionErr("Network error"); }
  finally { setBusy(null); }
 }

 return (
  <div className="mx-auto max-w-[780px] px-4 pt-4 pb-8 sm:px-6 md:px-8 md:pt-6 md:pb-10">

   {/* ── Header ── */}
   <div className="mb-8 flex items-center gap-4">
    <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary">
     <Users size={22} className="text-primary-foreground" />
    </div>
    <div>
     <h1 className="text-2xl font-bold text-foreground">Members</h1>
     <p className="text-sm text-muted-foreground">Manage who has access to this workspace.</p>
    </div>
   </div>

   {/* ── Stats strip ── */}
   <div className="mb-7 grid grid-cols-3 gap-3">
    {[
     { label: "Total members", value: active.length },
     { label: "Admins",    value: active.filter(m => m.role === "admin").length },
     { label: "Pending",    value: invited.length },
    ].map(stat => (
     <div key={stat.label} className="rounded-[var(--radius-md)] border border-border bg-muted px-4 py-3">
      <p className="text-2xl font-bold leading-tight text-foreground">{stat.value}</p>
      <p className="text-xs text-muted-foreground">{stat.label}</p>
     </div>
    ))}
   </div>

   {/* ── Invite ── */}
   {isAdmin && (
    <div className="mb-7">
     <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Invite people</p>
     <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2">
       <Input
        type="email"
        value={email}
        placeholder="colleague@company.com"
        onChange={e => { setEmail(e.target.value); setInviteErr(""); }}
        onKeyDown={e => e.key === "Enter" && invite()}
        className="flex-1 focus-visible:border-primary"
       />
       <RoleSelect value={role} onChange={setRole} />
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
    <p className="mb-4 flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-destructive/5 px-3 py-2 text-xs text-destructive">
     <AlertCircle size={14} className="shrink-0" />
     {actionErr}
    </p>
   )}

   {/* ── Active members ── */}
   <div className="mb-7">
    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Members</p>
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card">
     {active.map((m, i) => {
      const display  = m.userName?.trim() || m.userEmail?.trim() || m.invitedEmail?.trim() || "Unknown";
      const isMe    = m.userId === currentUserId;
      const isAdminRow = m.role === "admin";
      const style   = ROLE_STYLES[m.role] ?? ROLE_STYLES.viewer!;
      return (
       <div key={m.id} className={`flex items-center gap-3.5 px-5 py-3.5 ${i < active.length - 1 ? "border-b border-border/40" : ""}`}>
        {m.userImage
         ? <img src={m.userImage} alt={display} className="size-9 shrink-0 rounded-full object-cover ring-1 ring-border/30" />
         : <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-border/30 ${avatarBgClass(display)}`}>{(()=>{const w=display.split(/[\s._@-]+/).filter(Boolean);return(w.length>=2?w[0][0]!+w[w.length-1][0]!:display.slice(0,2)).toUpperCase();})()}</div>
        }
        <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{display}</p>
          {isMe && <span className="shrink-0 rounded-[var(--radius-xs)] bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">you</span>}
         </div>
         {m.userName && m.userEmail && <p className="text-xs text-muted-foreground truncate">{m.userEmail}</p>}
        </div>
        {/* Role control */}
        {isAdmin && !isAdminRow && !isMe ? (
         <RoleSelect value={m.role} onChange={v => changeRole(m.userId!, v)} disabled={busy === m.userId} />
        ) : (
         <Badge variant="secondary" className={`shrink-0 flex items-center gap-1.5 capitalize ${style.badge}`}>
          <span className={`size-1.5 rounded-full ${style.dot}`} />
          {m.role}
         </Badge>
        )}
        {/* Remove button */}
        {isAdmin && !isAdminRow && m.userId && (
         <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setPendingRemove({ userId: m.userId!, name: display })}
          disabled={busy === m.userId}
          title="Remove"
          className="flex size-7 shrink-0 items-center justify-center p-0 bg-transparent text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive shadow-none border-0"
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
      <span className="rounded-[var(--radius-xs)] bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{invited.length}</span>
     </div>
     <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card">
      {invited.map((m, i) => {
       const addr = m.invitedEmail ?? m.userEmail ?? "—";
       return (
        <div key={m.id} className={`flex items-center gap-3.5 px-5 py-3.5 ${i < invited.length - 1 ? "border-b border-border/40" : ""}`}>
         <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-border text-xs font-bold text-muted-foreground">
          {addr.slice(0,2).toUpperCase()}
         </div>
         <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{addr}</p>
          <p className="text-xs text-muted-foreground">Invited {ago(m.createdAt)}</p>
         </div>
         <Badge variant="secondary" className="shrink-0 capitalize">
          {m.role}
         </Badge>
         {isAdmin && (
          <div className="flex items-center gap-1.5">
           <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resend(m.id)}
            disabled={busy === `resend-${m.id}`}
            >
            {busy === `resend-${m.id}` ? "…" : "Resend"}
           </Button>
           <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setPendingCancelInvite({ id: m.id, email: addr })}
            disabled={busy === m.id}
            className="flex size-7 items-center justify-center p-0 bg-transparent text-muted-foreground/70 hover:bg-destructive/5 hover:text-destructive shadow-none border-0"
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
    description="They will lose access to this workspace immediately."
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
  </div>
 );
}
