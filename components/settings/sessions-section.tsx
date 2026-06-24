"use client";

import { Clock, Globe, Info, Monitor, Shield, Smartphone, X } from "lucide-react";
import { useState } from "react";
import {
 AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
 AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
 AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SessionRow {
 id:    string;
 token:   string;
 ipAddress: string | null;
 userAgent: string | null;
 createdAt: Date;
 expiresAt: Date;
}
interface Props { sessions: SessionRow[]; currentToken: string }

function browser(ua: string | null) {
 if (!ua) return "Unknown browser";
 if (/edg/i.test(ua))              return "Edge";
 if (/chrome/i.test(ua) && !/edg/i.test(ua))  return "Chrome";
 if (/firefox/i.test(ua))            return "Firefox";
 if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
 return "Browser";
}
function osName(ua: string | null) {
 if (!ua) return "";
 if (/windows/i.test(ua))   return "Windows";
 if (/macintosh/i.test(ua))  return "macOS";
 if (/linux/i.test(ua))    return "Linux";
 if (/android/i.test(ua))   return "Android";
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
 const [sessions,  setSessions]  = useState(init);
 const [revoking,  setRevoking]  = useState<string | null>(null);
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
 const others = sessions.filter(s => s.token !== currentToken);

 return (
  <div className="max-w-[780px] px-8 pt-6 pb-10">

   {/* ── Header ── */}
   <div className="mb-8 flex items-center gap-4">
    <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary">
     <Shield size={22} className="text-primary-foreground" />
    </div>
    <div>
     <h1 className="text-[22px] font-bold text-foreground">Security & sessions</h1>
     <p className="text-sm text-muted-foreground">Manage devices signed in to your account.</p>
    </div>
   </div>

   {/* ── Current session ── */}
   {current && (
    <div className="mb-7">
     <p className="mb-2 text-[10.5px] font-semibold tracking-[0.125px] text-muted-foreground/50">Current session</p>
     <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <SessionCard s={current} isCurrent />
     </div>
    </div>
   )}

   {/* ── Other sessions ── */}
   {others.length > 0 && (
    <div className="mb-7">
     <div className="mb-2 flex items-center justify-between">
      <p className="text-[10.5px] font-semibold tracking-[0.125px] text-muted-foreground/50">
       Other sessions
       <span className="ml-2 rounded-[var(--radius-xs)] bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{others.length}</span>
      </p>
      <AlertDialog>
       <AlertDialogTrigger asChild>
        <Button
         variant="ghost"
         size="sm"
         type="button"
         disabled={revokingAll}
         className="flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 h-auto px-2 py-1">
         <X size={14} />
         {revokingAll ? "Revoking…" : "Revoke all"}
        </Button>
       </AlertDialogTrigger>
       <AlertDialogContent>
        <AlertDialogHeader>
         <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
         <AlertDialogDescription>All other devices will be signed out immediately.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
         <AlertDialogCancel>Cancel</AlertDialogCancel>
         <AlertDialogAction onClick={revokeAll}>Revoke all</AlertDialogAction>
        </AlertDialogFooter>
       </AlertDialogContent>
      </AlertDialog>
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
     <div className="flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
      <Shield size={28} className="text-primary" />
     </div>
     <p className="text-sm font-semibold text-foreground">No active sessions</p>
     <p className="text-sm text-muted-foreground">Sign in again to see your sessions here.</p>
    </div>
   )}

   {/* ── Security tip ── */}
   <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
    <div className="flex items-start gap-4 px-5 py-4">
     <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
      <Info size={16} className="text-primary" />
     </div>
     <div>
      <p className="text-sm font-semibold text-foreground">Security tip</p>
      <p className="mt-0.5 text-xs text-muted-foreground">If you see an unfamiliar session, revoke it immediately and update your credentials.</p>
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
 const b  = browser(s.userAgent);
 const os = osName(s.userAgent);
 const mob = isMobile(s.userAgent);

 return (
  <div className="flex items-center gap-4 px-5 py-4">
   {/* Device icon */}
   <div className={`flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${isCurrent ? "bg-primary/10" : "bg-muted/50"}`}>
    {mob ? (
     <Smartphone size={20} className={isCurrent ? "text-primary" : "text-muted-foreground"} />
    ) : (
     <Monitor size={20} className={isCurrent ? "text-primary" : "text-muted-foreground"} />
    )}
   </div>

   {/* Info */}
   <div className="flex-1 min-w-0">
    <div className="flex flex-wrap items-center gap-2">
     <p className="text-sm font-semibold text-foreground">{b}</p>
     {os && <span className="text-sm text-muted-foreground">on {os}</span>}
     {isCurrent && (
      <Badge variant="secondary" className="rounded-[var(--radius-xs)] px-2.5 py-0.5 text-xs font-bold">● This device</Badge>
     )}
    </div>
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
     {s.ipAddress && (
      <span className="flex items-center gap-1">
       <Globe size={12} />
       {s.ipAddress}
      </span>
     )}
     <span className="flex items-center gap-1">
      <Clock size={12} />
      {isCurrent ? "Active now" : `Signed in ${ago(s.createdAt)}`}
     </span>
    </div>
   </div>

   {/* Revoke */}
   {!isCurrent && (
    <AlertDialog>
     <AlertDialogTrigger asChild>
      <Button
       variant="outline"
       size="sm"
       type="button"
       disabled={revoking}
       className="shrink-0 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
       {revoking ? "…" : "Revoke"}
      </Button>
     </AlertDialogTrigger>
     <AlertDialogContent>
      <AlertDialogHeader>
       <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
       <AlertDialogDescription>
        {b}{os ? ` on ${os}` : ""} will be signed out immediately.
       </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
       <AlertDialogCancel>Cancel</AlertDialogCancel>
       <AlertDialogAction onClick={onRevoke}>Revoke</AlertDialogAction>
      </AlertDialogFooter>
     </AlertDialogContent>
    </AlertDialog>
   )}
  </div>
 );
}
