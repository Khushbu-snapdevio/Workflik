"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Workspace = {
  id:   string;
  name: string;
  icon: string | null;
  slug: string;
  role: string;
};

type Props = {
  currentSlug?: string;
};

export function WorkspaceSwitcher({ currentSlug }: Props) {
  const router                          = useRouter();
  const [workspaces, setWorkspaces]     = useState<Workspace[]>([]);
  const [open, setOpen]                 = useState(false);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(data as Workspace[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const current = workspaces.find((w) => w.slug === currentSlug) ?? workspaces[0];

  function switchTo(slug: string) {
    setOpen(false);
    router.push(`/${slug}`);
  }

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md px-2 text-muted-foreground text-sm">
        <span className="size-6 animate-pulse rounded bg-muted" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <WorkspaceAvatar icon={current?.icon ?? null} name={current?.name ?? "…"} />
        <span className="flex-1 truncate font-semibold">
          {current?.name ?? "Select workspace"}
        </span>
        <svg
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
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
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border bg-popover shadow-lg">
            <div className="p-1">
              {workspaces.map((ws) => (
                <button
                  className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted/60 ${ws.slug === currentSlug ? "bg-muted/40 font-semibold" : ""}`}
                  key={ws.id}
                  onClick={() => switchTo(ws.slug)}
                  type="button"
                >
                  <WorkspaceAvatar icon={ws.icon} name={ws.name} />
                  <span className="flex-1 truncate">{ws.name}</span>
                  <span className="shrink-0 text-muted-foreground text-xs capitalize">
                    {ws.role}
                  </span>
                </button>
              ))}
            </div>
            <div className="border-t p-1">
              <Button
                className="w-full justify-start text-sm"
                onClick={() => {
                  setOpen(false);
                  router.push("/workspaces/new");
                }}
                size="sm"
                variant="ghost"
              >
                + Create workspace
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WorkspaceAvatar({ icon, name }: { icon: string | null; name: string }) {
  if (icon && !icon.startsWith("http")) {
    return <span className="text-lg leading-none">{icon}</span>;
  }
  if (icon) {
    return (
      <img
        alt={name}
        className="size-6 rounded object-cover"
        src={icon}
      />
    );
  }
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded bg-primary font-bold text-primary-foreground text-xs">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
