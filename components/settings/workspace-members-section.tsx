"use client";

import { useState } from "react";

interface MemberRow {
  id:            string;
  userId:        string | null;
  role:          string;
  status:        string;
  invitedEmail:  string | null;
  inviteExpires: Date | null;
  joinedAt:      Date | null;
  createdAt:     Date;
  userName:      string | null;
  userEmail:     string | null;
  userImage:     string | null;
}
interface Props {
  workspaceId:   string;
  workspaceName: string;
  currentUserId: string;
  isAdmin:       boolean;
  members:       MemberRow[];
}

const ROLE_STYLES: Record<string, { badge: string; dot: string }> = {
  admin:  { badge: "bg-primary/10 text-primary",    dot: "#0284C7" },
  editor: { badge: "bg-primary/10 text-primary",  dot: "var(--color-primary, #0284C7)" },
  viewer: { badge: "bg-muted/50 text-muted-foreground",  dot: "#b3b0aa" },
};

function avatarColor(s: string) {
  const c = ["#e07b54","#6fba9b","#8b7fd4","#e0a54f","#5b9bd4","#d4596e"];
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return c[Math.abs(h) % c.length]!;
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
  const [members,   setMembers]  = useState(init);
  const [email,     setEmail]    = useState("");
  const [role,      setRole]     = useState<"editor"|"viewer">("editor");
  const [inviting,  setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState("");
  const [busy,      setBusy]     = useState<string | null>(null);
  const [actionErr, setActionErr] = useState("");

  const active  = members.filter(m => m.status === "active");
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
    <div className="mx-auto max-w-[640px] px-8 py-10">

      {/* ── Header ── */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-sky-400 shadow-[var(--shadow-raised)]">
          <svg viewBox="0 0 20 20" fill="white" className="size-5.5">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground">Manage who has access to this workspace.</p>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="mb-7 grid grid-cols-3 gap-3">
        {[
          { label: "Total members", value: active.length,  color: "text-primary", bg: "bg-primary/10" },
          { label: "Admins",        value: active.filter(m => m.role === "admin").length, color: "text-primary",   bg: "bg-primary/10" },
          { label: "Pending",       value: invited.length, color: "text-primary", bg: "bg-primary/10" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-[var(--radius-md)] border border-border/50 ${stat.bg} px-4 py-3`}>
            <p className={`text-[22px] font-bold leading-tight ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Invite ── */}
      {isAdmin && (
        <div className="mb-7">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Invite people</p>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2">
              <input type="email" value={email} placeholder="colleague@company.com"
                onChange={e => { setEmail(e.target.value); setInviteErr(""); }}
                onKeyDown={e => e.key === "Enter" && invite()}
                className="flex-1 rounded-[var(--radius-sm)] border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:bg-card transition-colors placeholder:text-muted-foreground/50" />
              <div className="relative">
                <select value={role} onChange={e => setRole(e.target.value as "editor"|"viewer")}
                  className="appearance-none rounded-[var(--radius-sm)] border border-border bg-muted/30 py-2.5 pl-3 pr-8 text-sm font-medium text-foreground outline-none focus:border-primary transition-colors">
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>
              </div>
              <button type="button" onClick={invite} disabled={inviting || !email.trim()}
                className="rounded-[var(--radius-sm)] bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-all hover:bg-[var(--primary-hover)] disabled:opacity-50 active:scale-[0.97]">
                {inviting ? "Sending…" : "Invite"}
              </button>
            </div>
            {inviteErr && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-red-500">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7"/><circle cx="7" cy="9.5" r=".5" fill="currentColor"/></svg>
                {inviteErr}
              </p>
            )}
          </div>
        </div>
      )}

      {actionErr && (
        <p className="mb-4 flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-xs text-red-600">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5 shrink-0"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7"/><circle cx="7" cy="9.5" r=".5" fill="currentColor"/></svg>
          {actionErr}
        </p>
      )}

      {/* ── Active members ── */}
      <div className="mb-7">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Members</p>
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card">
          {active.map((m, i) => {
            const display    = m.userName ?? m.userEmail ?? m.invitedEmail ?? "Unknown";
            const isMe       = m.userId === currentUserId;
            const isAdminRow = m.role === "admin";
            const style      = ROLE_STYLES[m.role] ?? ROLE_STYLES.viewer!;
            return (
              <div key={m.id} className={`flex items-center gap-3.5 px-5 py-3.5 ${i < active.length - 1 ? "border-b border-border/40" : ""}`}>
                {m.userImage
                  ? <img src={m.userImage} alt={display} className="size-9 rounded-full object-cover ring-2 ring-white shadow-[var(--shadow-card)] shrink-0" />
                  : <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white shadow-[var(--shadow-card)]" style={{ background: avatarColor(display) }}>{display.slice(0,2).toUpperCase()}</div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{display}</p>
                    {isMe && <span className="shrink-0 rounded-full bg-muted/50 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">you</span>}
                  </div>
                  {m.userName && m.userEmail && <p className="text-xs text-muted-foreground truncate">{m.userEmail}</p>}
                </div>
                {/* Role control */}
                {isAdmin && !isAdminRow && !isMe ? (
                  <select value={m.role} disabled={busy === m.userId}
                    onChange={e => changeRole(m.userId!, e.target.value as "editor"|"viewer")}
                    className="rounded-[var(--radius-sm)] border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground outline-none disabled:opacity-50 transition-colors focus:border-primary">
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style.badge}`}>
                    <span className="size-1.5 rounded-full" style={{ background: style.dot }} />
                    {m.role}
                  </span>
                )}
                {/* Remove button */}
                {isAdmin && !isAdminRow && m.userId && (
                  <button type="button" onClick={() => remove(m.userId!)} disabled={busy === m.userId} title="Remove"
                    className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/40 transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-3.5"><path d="M2 2l10 10M12 2L2 12"/></svg>
                  </button>
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
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Pending invitations</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">{invited.length}</span>
          </div>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card">
            {invited.map((m, i) => {
              const addr = m.invitedEmail ?? m.userEmail ?? "—";
              return (
                <div key={m.id} className={`flex items-center gap-3.5 px-5 py-3.5 ${i < invited.length - 1 ? "border-b border-border/40" : ""}`}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary/30 text-xs font-bold text-primary/60">
                    {addr.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{addr}</p>
                    <p className="text-xs text-muted-foreground">Invited {ago(m.createdAt)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">{m.role}</span>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => resend(m.id)} disabled={busy === `resend-${m.id}`}
                        className="rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/30 disabled:opacity-50 transition-colors">
                        {busy === `resend-${m.id}` ? "…" : "Resend"}
                      </button>
                      <button type="button" onClick={() => cancelInvite(m.id)} disabled={busy === m.id}
                        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/40 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors">
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-3.5"><path d="M2 2l10 10M12 2L2 12"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
