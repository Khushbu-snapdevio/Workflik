"use client";

import { useState } from "react";

interface SessionRow {
  id:        string;
  token:     string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}
interface Props { sessions: SessionRow[]; currentToken: string }

function browser(ua: string | null) {
  if (!ua) return "Unknown browser";
  if (/edg/i.test(ua))                           return "Edge";
  if (/chrome/i.test(ua) && !/edg/i.test(ua))    return "Chrome";
  if (/firefox/i.test(ua))                        return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  return "Browser";
}
function osName(ua: string | null) {
  if (!ua) return "";
  if (/windows/i.test(ua))     return "Windows";
  if (/macintosh/i.test(ua))   return "macOS";
  if (/linux/i.test(ua))       return "Linux";
  if (/android/i.test(ua))     return "Android";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  return "";
}
function isMobile(ua: string | null) { return /android|iphone|ipad/i.test(ua ?? ""); }
function ago(d: Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export function SessionsSection({ sessions: init, currentToken }: Props) {
  const [sessions,    setSessions]    = useState(init);
  const [revoking,    setRevoking]    = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  async function revoke(id: string, token: string) {
    setRevoking(id);
    try {
      const r = await fetch("/api/auth/revoke-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.ok) setSessions(prev => prev.filter(s => s.id !== id));
    } catch { /* no-op */ }
    finally { setRevoking(null); }
  }

  async function revokeAll() {
    setRevokingAll(true);
    try {
      const r = await fetch("/api/auth/revoke-other-sessions", { method: "POST" });
      if (r.ok) setSessions(prev => prev.filter(s => s.token === currentToken));
    } catch { /* no-op */ }
    finally { setRevokingAll(false); }
  }

  const current = sessions.find(s => s.token === currentToken);
  const others  = sessions.filter(s => s.token !== currentToken);

  return (
    <div className="mx-auto max-w-[640px] px-8 py-10">

      {/* ── Header ── */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-sky-400 shadow-[var(--shadow-raised)]">
          <svg viewBox="0 0 20 20" fill="white" className="size-5.5">
            <path fillRule="evenodd" d="M10 1.5L3 5v5c0 4.1 3.1 7.9 7 9 3.9-1.1 7-4.9 7-9V5L10 1.5zm0 3.95l4 2.05v3.5c0 2.5-1.8 4.8-4 5.6-2.2-.8-4-3.1-4-5.6V7.5l4-2.05z" clipRule="evenodd"/>
          </svg>
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Security & sessions</h1>
          <p className="text-sm text-muted-foreground">Manage devices signed in to your account.</p>
        </div>
      </div>

      {/* ── Current session ── */}
      {current && (
        <div className="mb-7">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">Current session</p>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-primary/20 bg-gradient-to-br from-sky-50/30 to-card">
            <SessionCard s={current} isCurrent />
          </div>
        </div>
      )}

      {/* ── Other sessions ── */}
      {others.length > 0 && (
        <div className="mb-7">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Other sessions
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold normal-case text-muted-foreground">{others.length}</span>
            </p>
            <button type="button" onClick={revokeAll} disabled={revokingAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 transition-colors hover:text-red-700 disabled:opacity-50">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5"><path d="M2 2l10 10M12 2L2 12"/></svg>
              {revokingAll ? "Revoking…" : "Revoke all"}
            </button>
          </div>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card">
            {others.map((s, i) => (
              <div key={s.id} className={i < others.length - 1 ? "border-b border-border/40" : ""}>
                <SessionCard s={s} revoking={revoking === s.id} onRevoke={() => revoke(s.id, s.token)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {sessions.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-sky-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" className="size-7">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">No active sessions</p>
          <p className="text-sm text-muted-foreground">Sign in again to see your sessions here.</p>
        </div>
      )}

      {/* ── Security tip ── */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-card">
        <div className="flex items-start gap-4 px-5 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-sky-100">
            <svg viewBox="0 0 16 16" fill="none" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" className="size-4">
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M8 5v3.5"/><circle cx="8" cy="11" r=".5" fill="#0284C7"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-sky-700">Security tip</p>
            <p className="mt-0.5 text-xs text-sky-800">If you see an unfamiliar session, revoke it immediately and update your credentials.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Session card ─────────────────────────────────────────── */
function SessionCard({ s, isCurrent, revoking, onRevoke }: {
  s: SessionRow; isCurrent?: boolean; revoking?: boolean; onRevoke?: () => void
}) {
  const b   = browser(s.userAgent);
  const os  = osName(s.userAgent);
  const mob = isMobile(s.userAgent);

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* Device icon */}
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${isCurrent ? "bg-primary/10" : "bg-muted/50"}`}>
        {mob ? (
          <svg viewBox="0 0 20 20" fill="none" stroke={isCurrent ? "#0284C7" : "#787774"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <rect x="5.5" y="1.5" width="9" height="17" rx="1.5"/><path d="M9 16.5h2"/>
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" stroke={isCurrent ? "#0284C7" : "#787774"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <rect x="1.5" y="2.5" width="17" height="12" rx="1.5"/><path d="M6.5 18h7M10 14.5V18"/>
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{b}</p>
          {os && <span className="text-sm text-muted-foreground">on {os}</span>}
          {isCurrent && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">● This device</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {s.ipAddress && (
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3"><circle cx="6" cy="6" r="4.5"/><path d="M6 1.5c-1.5 0-3 2.7-3 4.5s1.5 4.5 3 4.5 3-2.7 3-4.5-1.5-4.5-3-4.5z"/><path d="M1.5 6h9"/></svg>
              {s.ipAddress}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3"><circle cx="6" cy="6" r="4.5"/><path d="M6 3v3l2 1.5"/></svg>
            {isCurrent ? "Active now" : `Signed in ${ago(s.createdAt)}`}
          </span>
        </div>
      </div>

      {/* Revoke */}
      {!isCurrent && (
        <button type="button" onClick={onRevoke} disabled={revoking}
          className="shrink-0 rounded-[var(--radius-sm)] border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 active:scale-[0.97]">
          {revoking ? "…" : "Revoke"}
        </button>
      )}
    </div>
  );
}
