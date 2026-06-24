"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Clock, RotateCcw, FileText,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Version {
  id:             string;
  label:          string | null;
  createdBy:      string | null;
  createdAt:      string;
  createdByName:  string | null;
  createdByEmail: string | null;
}

interface VersionGroup {
  label: string;
  items: Version[];
}

interface Props {
  pageId:       string;
  pageTitle:    string | null;
  pageIcon:     string | null;
  workspaceSlug: string;
  pageShortId:  string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

function formatAbsolute(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return ""; }
}

function dayLabel(iso: string) {
  try {
    const d   = new Date(iso);
    const now = new Date();
    const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yes = new Date(tod); yes.setDate(tod.getDate() - 1);
    const vd  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (vd.getTime() === tod.getTime()) return "Today";
    if (vd.getTime() === yes.getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  } catch { return ""; }
}

function groupVersions(versions: Version[]): VersionGroup[] {
  const map = new Map<string, Version[]>();
  for (const v of versions) {
    const key = dayLabel(v.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function getInitials(name: string | null, email: string | null) {
  const src = name ?? email ?? "?";
  return src.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-primary", "bg-destructive", "bg-success", "bg-warning",
  "bg-muted-foreground", "bg-primary/70",
];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]!;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function HistoryPageClient({
  pageId, pageTitle, pageIcon, workspaceSlug, pageShortId,
}: Props) {
  const [versions,   setVersions]   = useState<Version[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [confirmVer, setConfirmVer] = useState<Version | null>(null);
  const [restoring,  setRestoring]  = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pages/${pageId}/versions`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: Version[]) => { setVersions(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [pageId]);

  async function handleRestore() {
    if (!confirmVer) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/versions/${confirmVer.id}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        setConfirmVer(null);
        window.location.href = `/app/${workspaceSlug}/${pageShortId}`;
      }
    } finally {
      setRestoring(false);
    }
  }

  const groups   = groupVersions(versions);
  const firstId  = versions[0]?.id;
  const pageLabel = pageTitle ?? "Untitled";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="flex h-12 items-center gap-3 px-5">
          <Link
            href={`/app/${workspaceSlug}/${pageShortId}`}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft size={13} />
            Back to page
          </Link>

          <div className="h-3.5 w-px bg-border" />

          {/* Page identity */}
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-[var(--radius-xs)] border border-border bg-muted/40">
              {pageIcon ? (
                <span className="text-sm leading-none">{pageIcon}</span>
              ) : (
                <FileText size={11} className="text-muted-foreground/50" />
              )}
            </span>
            <span className="text-sm font-semibold text-foreground">{pageLabel}</span>
          </div>

          <div className="h-3.5 w-px bg-border" />

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock size={13} />
            <span className="text-xs font-medium">Version history</span>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* Main content — centered, constrained width */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-8">

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">Version history</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Versions are saved automatically as you edit. Select any version to restore it.
              </p>
            </div>

            {/* Content */}
            {loading ? (
              <HistorySkeleton />
            ) : error ? (
              <ErrorState />
            ) : versions.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
                {groups.map(({ label, items }, gi) => (
                  <div key={label}>
                    {/* Day header */}
                    <div className={[
                      "flex items-center gap-3 border-b border-border/60 px-4 py-2.5",
                      gi > 0 ? "border-t border-border/60" : "",
                    ].join(" ")}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                        {label}
                      </span>
                      <div className="h-px flex-1 bg-border/50" />
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                        {items.length} {items.length === 1 ? "version" : "versions"}
                      </span>
                    </div>

                    {/* Version rows */}
                    {items.map((v, vi) => {
                      const isCurrent = v.id === firstId;
                      const who       = v.createdByName ?? v.createdByEmail ?? "Unknown";
                      const isLast    = vi === items.length - 1;

                      return (
                        <div
                          key={v.id}
                          className={[
                            "group relative flex items-center gap-3 px-4 py-3 transition-colors duration-150",
                            isCurrent ? "bg-primary/[0.04]" : "hover:bg-accent",
                            !isLast ? "border-b border-border/40" : "",
                          ].join(" ")}
                        >
                          {/* Current accent */}
                          {isCurrent && (
                            <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-primary" />
                          )}

                          {/* Avatar */}
                          <div
                            className={[
                              "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                              avatarColor(who),
                            ].join(" ")}
                          >
                            {getInitials(v.createdByName, v.createdByEmail)}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground tabular-nums">
                                {formatTime(v.createdAt)}
                              </span>
                              {isCurrent && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  Current
                                </span>
                              )}
                              {v.label && (
                                <span className="truncate text-xs text-muted-foreground/60">{v.label}</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {who}
                            </p>
                          </div>

                          {/* Timestamp */}
                          <span className="shrink-0 text-[11px] text-muted-foreground/40 tabular-nums">
                            {formatAbsolute(v.createdAt)}
                          </span>

                          {/* Restore button */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => setConfirmVer(v)}
                              className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-0 transition-all duration-150 group-hover:opacity-100 hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <RotateCcw size={11} />
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
      </div>

      {/* ── Restore confirmation dialog ─────────────────────────────────────── */}
      <AlertDialog open={!!confirmVer} onOpenChange={open => { if (!open && !restoring) setConfirmVer(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmVer && (
                <>
                  This will replace the current content of{" "}
                  <span className="font-semibold text-foreground">{pageLabel}</span> with the version
                  saved on {dayLabel(confirmVer.createdAt)} at {formatTime(confirmVer.createdAt)}.
                  The current version will remain in history and can be restored again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={handleRestore}
              className="gap-1.5"
            >
              {restoring ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Restoring…
                </>
              ) : (
                <>
                  <RotateCcw size={13} />
                  Restore version
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── States ─────────────────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      {/* Day header */}
      <div className="border-b border-border/60 px-4 py-2.5">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border/40 px-4 py-3 last:border-0">
          <div className="size-7 shrink-0 animate-pulse rounded-full bg-muted/60" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-28 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50">
        <Clock size={20} className="text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">No versions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Versions appear here as you edit the page.
        </p>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-destructive/10">
        <AlertTriangle size={20} className="text-destructive" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Could not load history</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Something went wrong. Refresh the page to try again.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-[var(--radius-sm)] border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Refresh
      </button>
    </div>
  );
}
