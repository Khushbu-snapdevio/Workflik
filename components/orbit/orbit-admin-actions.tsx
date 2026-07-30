"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
 AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
 AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/* ── helpers ── */
function cn(...classes: (string | false | undefined)[]) {
 return classes.filter(Boolean).join(" ");
}

/* ── Impersonate button ── */
export function ImpersonateButton({ userId }: { userId: string }) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [confirmOpen, setConfirmOpen] = useState(false);

 async function doImpersonate() {
  setLoading(true);
  setError(null);
  try {
   const res = await fetch(`/api/orbit/users/${userId}/impersonate`, { method: "POST" });
   if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Failed to impersonate");
   }
   router.push("/platform/post-auth");
  } catch (e) {
   setError(e instanceof Error ? e.message : "Unknown error");
   setLoading(false);
  }
 }

 return (
  <div>
   <button
    onClick={() => setConfirmOpen(true)}
    disabled={loading}
    className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:opacity-50">
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
     <circle cx="7" cy="5" r="2.5"/><path d="M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
     <path d="M11 2l2 2-2 2"/>
    </svg>
    {loading ? "Starting…" : "Impersonate"}
   </button>
   {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

   <ConfirmDialog
    open={confirmOpen}
    onOpenChange={setConfirmOpen}
    title="Start impersonation session?"
    description="You will be signed in as this user for up to 2 hours."
    confirmLabel="Impersonate"
    onConfirm={doImpersonate}
   />
  </div>
 );
}

/* ── Ban / Unban button ── */
export function BanButton({ userId, banned, onDone }: { userId: string; banned: boolean; onDone?: () => void }) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [confirmOpen, setConfirmOpen] = useState(false);
 const [reason, setReason] = useState("");

 async function doToggle() {
  const action = banned ? "unban" : "ban";
  setLoading(true);
  setError(null);
  try {
   const res = await fetch(`/api/orbit/users/${userId}/${action}`, {
    method: "POST",
    ...(action === "ban" && {
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ reason: reason.trim() || undefined }),
    }),
   });
   if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? `Failed to ${action}`);
   }
   setReason("");
   onDone?.();
   router.refresh();
  } catch (e) {
   setError(e instanceof Error ? e.message : "Unknown error");
  } finally {
   setLoading(false);
  }
 }

 return (
  <div>
   <button
    onClick={() => setConfirmOpen(true)}
    disabled={loading}
    className={cn(
     "flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:opacity-50",
     banned
      ? "bg-muted/40 text-foreground border border-border hover:bg-accent"
      : "bg-destructive/5 text-destructive border border-destructive/20 hover:bg-destructive/10"
    )}>
    {banned ? "Unban user" : "Ban user"}
   </button>
   {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

   {banned ? (
    <ConfirmDialog
     open={confirmOpen}
     onOpenChange={setConfirmOpen}
     title="Unban this user?"
     description="The user will regain access to the platform."
     confirmLabel="Unban"
     onConfirm={doToggle}
    />
   ) : (
    <AlertDialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setReason(""); }}>
     <AlertDialogContent>
      <AlertDialogHeader>
       <AlertDialogTitle>Ban this user?</AlertDialogTitle>
       <AlertDialogDescription>The user will be blocked from signing in.</AlertDialogDescription>
      </AlertDialogHeader>
      <textarea
       value={reason}
       onChange={(e) => setReason(e.target.value)}
       placeholder="Reason (optional, visible in the audit log)…"
       rows={2}
       className="mt-1 w-full resize-none rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <AlertDialogFooter>
       <AlertDialogCancel>Cancel</AlertDialogCancel>
       <AlertDialogAction onClick={doToggle} disabled={loading}>Ban</AlertDialogAction>
      </AlertDialogFooter>
     </AlertDialogContent>
    </AlertDialog>
   )}
  </div>
 );
}

/* ── Revoke all sessions ── */
export function RevokeSessionsButton({ userId }: { userId: string }) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [confirmOpen, setConfirmOpen] = useState(false);

 async function doRevoke() {
  setLoading(true);
  setError(null);
  try {
   const res = await fetch(`/api/orbit/users/${userId}/revoke-sessions`, { method: "POST" });
   if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Failed to revoke");
   }
   router.refresh();
  } catch (e) {
   setError(e instanceof Error ? e.message : "Unknown error");
  } finally {
   setLoading(false);
  }
 }

 return (
  <div>
   <button
    onClick={() => setConfirmOpen(true)}
    disabled={loading}
    className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition-colors duration-150 hover:bg-warning/20 disabled:opacity-50">
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
     <path d="M7 2v3l2 2"/><circle cx="7" cy="7" r="5"/>
     <path d="M1 1l12 12"/>
    </svg>
    {loading ? "Revoking…" : "Revoke all sessions"}
   </button>
   {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

   <ConfirmDialog
    open={confirmOpen}
    onOpenChange={setConfirmOpen}
    title="Revoke all sessions?"
    description="All active sessions for this user will be terminated and they will be signed out immediately."
    confirmLabel="Revoke all"
    onConfirm={doRevoke}
   />
  </div>
 );
}

/* ── Force delete workspace ── */
export function ForceDeleteWorkspaceButton({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [confirmOpen, setConfirmOpen] = useState(false);
 const [confirmInput, setConfirmInput] = useState("");

 async function doDelete() {
  setConfirmOpen(false);
  setConfirmInput("");
  setLoading(true);
  setError(null);
  try {
   const res = await fetch(`/api/orbit/workspaces/${workspaceId}`, { method: "DELETE" });
   if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Failed to delete");
   }
   router.push("/orbit-admin/orbit/workspaces");
  } catch (e) {
   setError(e instanceof Error ? e.message : "Unknown error");
   setLoading(false);
  }
 }

 return (
  <div>
   <button
    onClick={() => setConfirmOpen(true)}
    disabled={loading}
    className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition-colors duration-150 hover:bg-destructive/90 disabled:opacity-50">
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
     <path d="M2 3.5h10M5.5 3.5V2.5h3v1M4.5 3.5l.5 8M9.5 3.5l-.5 8M7 3.5v8"/>
    </svg>
    {loading ? "Deleting…" : "Force delete workspace"}
   </button>
   {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

   <AlertDialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setConfirmInput(""); }}>
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>Force delete this workspace?</AlertDialogTitle>
      <AlertDialogDescription>
       This will permanently delete <strong className="text-foreground">{workspaceName}</strong> and all its pages, members, and data. This cannot be undone.
       <br /><br />
       Type the workspace name to confirm.
      </AlertDialogDescription>
     </AlertDialogHeader>
     <input
      type="text"
      value={confirmInput}
      onChange={(e) => setConfirmInput(e.target.value)}
      placeholder={workspaceName}
      className="mt-1 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
     />
     <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={doDelete} disabled={confirmInput !== workspaceName} className="disabled:opacity-40 disabled:cursor-not-allowed">Delete forever</AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </div>
 );
}
