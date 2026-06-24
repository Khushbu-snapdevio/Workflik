"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

interface Version {
 id:       string;
 label:     string | null;
 createdBy:   string | null;
 createdAt:   string;
 createdByName: string | null;
 createdByEmail: string | null;
}

interface AnchorPos { top: number; right: number }

interface Props {
 pageId:  string;
 open:   boolean;
 anchorPos: AnchorPos | null;
 onClose:  () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function timeOnly(iso: string): string {
 try {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
 } catch { return ""; }
}

function dayLabel(iso: string): string {
 try {
  const d  = new Date(iso);
  const now = new Date();
  const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yes = new Date(tod); yes.setDate(tod.getDate() - 1);
  const vd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (vd.getTime() === tod.getTime()) return "Today";
  if (vd.getTime() === yes.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
 } catch { return ""; }
}

function groupVersions(versions: Version[]): { label: string; items: Version[] }[] {
 const map = new Map<string, Version[]>();
 for (const v of versions) {
  const key = dayLabel(v.createdAt);
  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(v);
 }
 return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function initials(name: string | null, email: string | null) {
 const src = name ?? email ?? "?";
 return src.slice(0, 2).toUpperCase();
}

const AVATAR_BG_CLASSES = [
 "bg-primary", "bg-destructive", "bg-success", "bg-warning",
 "bg-muted-foreground", "bg-primary/70", "bg-destructive/70", "bg-success/70",
];
function avatarBg(str: string): string {
 let h = 0;
 for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
 return AVATAR_BG_CLASSES[Math.abs(h) % AVATAR_BG_CLASSES.length]!;
}

// ── component ─────────────────────────────────────────────────────────────────

export function PageHistoryPanel({ pageId, open, anchorPos, onClose }: Props) {
 const panelRef          = useRef<HTMLDivElement>(null);
 const [versions, setVersions]   = useState<Version[]>([]);
 const [loading, setLoading]    = useState(false);
 const [confirmVer, setConfirmVer] = useState<Version | null>(null);
 const [restoring, setRestoring]  = useState(false);

 // Keep a ref so event-handler closures always see the latest value
 const confirmVerRef = useRef<Version | null>(null);
 useEffect(() => { confirmVerRef.current = confirmVer; }, [confirmVer]);

 useEffect(() => {
  if (!open) return;
  setLoading(true);
  setVersions([]);
  fetch(`/api/pages/${pageId}/versions`)
   .then(r => r.ok ? r.json() : [])
   .then((d: Version[]) => setVersions(Array.isArray(d) ? d : []))
   .catch(() => {})
   .finally(() => setLoading(false));
 }, [open, pageId]);

 useEffect(() => {
  if (!open) return;
  function onKey(e: KeyboardEvent) {
   if (e.key !== "Escape") return;
   // Escape closes confirmation first; second Escape closes panel
   if (confirmVerRef.current) { setConfirmVer(null); }
   else { onClose(); }
  }
  function onDown(e: MouseEvent) {
   // While confirmation dialog is open, don't let outside-click close the panel
   if (confirmVerRef.current) return;
   if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
  }
  document.addEventListener("keydown", onKey);
  document.addEventListener("mousedown", onDown);
  return () => {
   document.removeEventListener("keydown", onKey);
   document.removeEventListener("mousedown", onDown);
  };
 }, [open, onClose]);

 async function handleRestore() {
  if (!confirmVer) return;
  setRestoring(true);
  try {
   const res = await fetch(`/api/pages/${pageId}/versions/${confirmVer.id}/restore`, { method: "POST" });
   if (res.ok) { setConfirmVer(null); onClose(); window.location.reload(); }
  } catch { /* no-op */ }
  finally { setRestoring(false); }
 }

 if (!open || !anchorPos || typeof document === "undefined") return null;

 const groups = groupVersions(versions);
 // flat list index for tracking "current" (newest overall)
 const firstId = versions[0]?.id;

 return createPortal(
  <>
   {/* Floating popup */}
   <div
    ref={panelRef}
    className="fixed z-[200] flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover"
    style={{
     top:    anchorPos.top,
     right:   anchorPos.right,
     width:   300,
     maxHeight: 460,
    }}
   >
    {/* ── Header ── */}
    <div className="shrink-0 border-b border-border/60 bg-card px-4 pt-3.5 pb-3">
     <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
       <svg className="mt-px size-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
       </svg>
       <p className="text-[13px] font-bold text-foreground tracking-tight">Page history</p>
      </div>
      <button
       type="button"
       onClick={onClose}
       className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
       <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M1 1l10 10M11 1L1 11"/>
       </svg>
      </button>
     </div>
     <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
      Versions are saved automatically. Select a version to preview or restore.
     </p>
    </div>

    {/* ── Content ── */}
    <div className="flex-1 overflow-y-auto overscroll-contain">
     {loading ? (
      /* skeleton */
      <div className="px-4 py-3 space-y-3">
       {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2.5">
         <div className="size-6 shrink-0 animate-pulse rounded-full bg-muted/60" />
         <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-2/5 animate-pulse rounded bg-muted/60" />
          <div className="h-2 w-1/3 animate-pulse rounded bg-muted/40" />
         </div>
        </div>
       ))}
      </div>

     ) : versions.length === 0 ? (
      /* empty state */
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
       <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-muted/60">
        <svg className="size-5 text-muted-foreground/25" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
         <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
       </div>
       <div>
        <p className="text-[12.5px] font-semibold text-foreground">No earlier versions yet.</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Versions appear here as you edit the page.</p>
       </div>
      </div>

     ) : (
      /* grouped version list */
      <div className="py-1">
       {groups.map(({ label, items }) => (
        <div key={label}>
         {/* Date section header */}
         <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">{label}</span>
          <div className="h-px flex-1 bg-border/50" />
         </div>

         {/* Version rows */}
         {items.map((v) => {
          const isCur = v.id === firstId;
          const who  = v.createdByName ?? v.createdByEmail ?? "Unknown";
          return (
           <div
            key={v.id}
            className={`group relative flex items-center gap-2.5 px-4 py-2 transition-colors ${
             isCur ? "bg-primary/[0.04]" : "hover:bg-muted/40"
            }`}
           >
            {/* Current accent bar */}
            {isCur && (
             <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r bg-primary" />
            )}

            {/* Avatar */}
            <div
             className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white ring-1 ring-border/30 ${avatarBg(who)}`}
            >
             {initials(v.createdByName, v.createdByEmail)}
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
             <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-foreground tabular-nums">
               {timeOnly(v.createdAt)}
              </span>
              {isCur && (
               <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-primary">
                Current
               </span>
              )}
             </div>
             <p className="mt-px truncate text-[10.5px] text-muted-foreground">
              {who}{v.label ? ` · ${v.label}` : ""}
             </p>
            </div>

            {/* Restore button (hover, non-current only) */}
            {!isCur && (
             <button
              type="button"
              onClick={() => setConfirmVer(v)}
              className="shrink-0 rounded-[var(--radius-sm)] border border-border bg-background px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground opacity-0 transition-colors duration-150 group-hover:opacity-100 hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
             >
              Restore
             </button>
            )}
           </div>
          );
         })}
        </div>
       ))}
      </div>
     )}
    </div>
   </div>

   {/* ── Restore confirmation dialog ── */}
   {confirmVer && (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
     <div
      className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      onClick={() => !restoring && setConfirmVer(null)}
     />
     <div className="relative w-[380px] rounded-[var(--radius-lg)] border border-border bg-popover p-6">
      <div className="mb-3 flex items-center gap-3">
       <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
        <svg className="size-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
         <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
       </div>
       <h2 className="text-[14px] font-semibold text-foreground">Restore this version?</h2>
      </div>
      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
       {dayLabel(confirmVer.createdAt)} · {timeOnly(confirmVer.createdAt)}
      </p>
      <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">
       This will replace the current page with the selected version. You can restore again later.
      </p>
      <div className="flex items-center justify-end gap-2">
       <button
        type="button"
        disabled={restoring}
        onClick={() => setConfirmVer(null)}
        className="rounded-[var(--radius-sm)] border border-border px-4 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
       >
        Cancel
       </button>
       <button
        type="button"
        disabled={restoring}
        onClick={handleRestore}
        className="rounded-[var(--radius-sm)] bg-primary px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
       >
        {restoring ? "Restoring…" : "Restore"}
       </button>
      </div>
     </div>
    </div>
   )}
  </>,
  document.body,
 );
}
