"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* ── helpers ── */
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ── Impersonate button ── */
export function ImpersonateButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImpersonate() {
    if (!confirm("Start a 2-hour impersonation session for this user?")) return;
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
        onClick={handleImpersonate}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
          <circle cx="7" cy="5" r="2.5"/><path d="M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
          <path d="M11 2l2 2-2 2"/>
        </svg>
        {loading ? "Starting…" : "Impersonate"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── Ban / Unban button ── */
export function BanButton({ userId, banned, onDone }: { userId: string; banned: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    const action = banned ? "unban" : "ban";
    if (!confirm(`${banned ? "Unban" : "Ban"} this user?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orbit/users/${userId}/${action}`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `Failed to ${action}`);
      }
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
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
          banned
            ? "bg-muted/40 text-foreground border border-border hover:bg-black/[0.05]"
            : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
        )}>
        {banned ? "Unban user" : "Ban user"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── Revoke all sessions ── */
export function RevokeSessionsButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    if (!confirm("Revoke ALL active sessions for this user? They will be signed out immediately.")) return;
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
        onClick={handleRevoke}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
          <path d="M7 2v3l2 2"/><circle cx="7" cy="7" r="5"/>
          <path d="M1 1l12 12"/>
        </svg>
        {loading ? "Revoking…" : "Revoke all sessions"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── Force delete workspace ── */
export function ForceDeleteWorkspaceButton({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = prompt(`Type the workspace name "${workspaceName}" to confirm deletion:`);
    if (confirmed !== workspaceName) {
      alert("Name did not match. Deletion cancelled.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orbit/workspaces/${workspaceId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to delete");
      }
      router.push("/Orbit-admin/orbit/workspaces");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
          <path d="M2 3.5h10M5.5 3.5V2.5h3v1M4.5 3.5l.5 8M9.5 3.5l-.5 8M7 3.5v8"/>
        </svg>
        {loading ? "Deleting…" : "Force delete workspace"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
