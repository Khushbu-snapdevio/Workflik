"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  slug: string;
  role: string;
};

type Props = {
  currentSlug?: string;
};

export function WorkspaceSwitcher({ currentSlug }: Props) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [joinError, setJoinError] = useState("");
  const joinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(Array.isArray(data) ? data : (data?.workspaces ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (showJoin) {
      setTimeout(() => joinInputRef.current?.focus(), 50);
    }
  }, [showJoin]);

  const current =
    workspaces.find((w) => w.slug === currentSlug) ?? workspaces[0];

  function switchTo(slug: string) {
    setOpen(false);
    router.push(`/app/${slug}`);
  }

  function extractToken(value: string): string | null {
    const trimmed = value.trim();
    const urlMatch = trimmed.match(/\/invite\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    if (/^[a-zA-Z0-9_-]{8,}$/.test(trimmed)) return trimmed;
    return null;
  }

  function handleJoin() {
    setJoinError("");
    const token = extractToken(joinLink);
    if (!token) {
      setJoinError("Please paste a valid invite link.");
      return;
    }
    setOpen(false);
    setShowJoin(false);
    setJoinLink("");
    router.push(`/invite/${token}`);
  }

  if (loading) {
    return (
      <div className="flex h-9 items-center gap-2 px-2">
        <span className="size-6 animate-pulse rounded bg-sidebar-accent" />
        <span className="h-3 w-24 animate-pulse rounded bg-sidebar-accent" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors hover:bg-primary/[0.04] focus:outline-none"
        onClick={() => { setOpen((v) => !v); setShowJoin(false); setJoinError(""); }}
        type="button"
      >
        <WorkspaceAvatar
          icon={current?.icon ?? null}
          name={current?.name ?? "…"}
        />
        <span className="flex-1 truncate text-sm font-semibold text-sidebar-foreground">
          {current?.name ?? "Select workspace"}
        </span>
        <svg
          className={`size-4 shrink-0 text-sidebar-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowJoin(false); }} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-popover shadow-[var(--shadow-raised)]">

            {/* Workspace list */}
            <div className="p-1.5">
              <p className="mb-1 px-2 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                Workspaces
              </p>
              {workspaces.map((ws) => {
                const isActive = ws.slug === currentSlug;
                return (
                  <button
                    className={`flex w-full items-center gap-2.5 rounded px-2 py-2 text-left hover:bg-muted ${isActive ? "bg-muted" : ""}`}
                    key={ws.id}
                    onClick={() => switchTo(ws.slug)}
                    type="button"
                  >
                    <WorkspaceAvatar icon={ws.icon} name={ws.name} />
                    <span className="flex-1 truncate text-sm font-medium text-popover-foreground">
                      {ws.name}
                    </span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
                      {ws.role}
                    </span>
                    {isActive && (
                      <svg className="size-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Join workspace panel */}
            {showJoin && (
              <div className="border-t border-border p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">Paste invite link</p>
                <input
                  ref={joinInputRef}
                  className="mb-1.5 h-9 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => { setJoinLink(e.target.value); setJoinError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); if (e.key === "Escape") setShowJoin(false); }}
                  placeholder="https://…/invite/token"
                  type="text"
                  value={joinLink}
                />
                {joinError && (
                  <p className="mb-1.5 text-xs text-destructive">{joinError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleJoin}
                    size="sm"
                    type="button"
                    variant="default"
                  >
                    Join workspace
                  </Button>
                  <Button
                    onClick={() => { setShowJoin(false); setJoinLink(""); setJoinError(""); }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className={`border-t border-border p-1.5 ${showJoin ? "hidden" : ""}`}>
              <Button
                className="w-full justify-start gap-2 px-2 font-medium text-muted-foreground hover:text-foreground"
                onClick={() => { setOpen(false); router.push("/app/workspaces/new"); }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Create workspace
              </Button>
              <Button
                className="w-full justify-start gap-2 px-2 font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setShowJoin(true)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Join workspace
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WorkspaceAvatar({
  icon,
  name,
}: {
  icon: string | null;
  name: string;
}) {
  if (icon && !icon.startsWith("http")) {
    return <span className="text-base leading-none">{icon}</span>;
  }
  if (icon) {
    return (
      <img alt={name} className="size-6 rounded-[var(--radius-sm)] object-cover" src={icon} />
    );
  }
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-primary font-bold text-primary-foreground text-xs">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
