"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIcon } from "@/components/pages/page-icon";
import { InviteMembersModal } from "@/components/workspace/invite-members-modal";
import { useSession } from "@/lib/auth/client";

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  slug: string;
  role: string;
  createdBy: string | null;
};

type Props = {
  currentSlug?: string;
};

export function WorkspaceSwitcher({ currentSlug }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(Array.isArray(data) ? data : (data?.workspaces ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  const current =
    workspaces.find((w) => w.slug === currentSlug) ?? workspaces[0];

  function switchTo(slug: string) {
    setOpen(false);
    router.push(`/app/${slug}`);
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
    <div className="relative w-full min-w-0">
      <button
        className="flex w-full min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-left transition-colors hover:bg-primary/5 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <WorkspaceAvatar
          icon={current?.icon ?? null}
          name={current?.name ?? "…"}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-foreground">
          {current?.name ?? "Select workspace"}
        </span>
        <svg
          className={`size-4 shrink-0 text-sidebar-foreground/60 transition-transform ${open ? "rotate-180" : ""}`}
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
          {/* Portaled to <body> — nested plain-DOM as a sibling here (rather
              than a portal) left this "fixed inset-0" click-catcher clipped
              to the sidebar's own width instead of the full viewport, so
              clicking anywhere in the main content area never reached it
              and the dropdown never closed. */}
          {createPortal(
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />,
            document.body
          )}
          <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover">

            {/* Workspace list */}
            <div className="p-1.5">
              <p className="mb-1 px-2 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                Workspaces
              </p>
              {workspaces.map((ws) => {
                const isActive = ws.slug === currentSlug;
                return (
                  <button
                    className={`flex w-full min-w-0 items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-left transition-colors duration-100 focus:outline-none hover:bg-muted ${isActive ? "bg-muted" : ""}`}
                    key={ws.id}
                    onClick={() => switchTo(ws.slug)}
                    type="button"
                  >
                    <WorkspaceAvatar icon={ws.icon} name={ws.name} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-popover-foreground">
                      {ws.name}
                    </span>
                    <span className={`shrink-0 rounded-[var(--radius-xs)] px-1.5 py-0.5 text-2xs font-semibold text-muted-foreground ${isActive ? "bg-background" : "bg-muted"}`}>
                      {ws.role}
                    </span>
                    {/* Always reserve the same 14px slot — prevents layout shift when checkmark appears */}
                    <span className="flex size-3.5 shrink-0 items-center justify-center">
                      {isActive && (
                        <svg className="text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-1.5">
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
                onClick={() => { setOpen(false); setShowInvite(true); }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Mail className="size-3.5 shrink-0" />
                Invite members
              </Button>
            </div>
          </div>
        </>
      )}

      {showInvite && current && (
        <InviteMembersModal
          workspaceId={current.id}
          isOwner={!!session?.user?.id && current.createdBy === session.user.id}
          onClose={() => setShowInvite(false)}
        />
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
  if (icon) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center">
        <PageIcon icon={icon} size={20} className="rounded-[var(--radius-sm)] object-cover" />
      </span>
    );
  }
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-primary font-bold text-primary-foreground text-xs">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
