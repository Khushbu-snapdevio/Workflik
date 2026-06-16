"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(data as Workspace[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const current =
    workspaces.find((w) => w.slug === currentSlug) ?? workspaces[0];

  function switchTo(slug: string) {
    setOpen(false);
    router.push(`/${slug}`);
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
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-sidebar-accent focus:outline-none"
        onClick={() => setOpen((v) => !v)}
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
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
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

            {/* Footer */}
            <div className="border-t border-border p-1.5">
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setOpen(false);
                  router.push("/workspaces/new");
                }}
                type="button"
              >
                <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Create workspace
              </button>
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
      <img alt={name} className="size-6 rounded object-cover" src={icon} />
    );
  }
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded bg-primary font-bold text-primary-foreground text-xs">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
