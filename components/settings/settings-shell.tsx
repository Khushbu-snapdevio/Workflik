"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Props { children: React.ReactNode }

export function SettingsShell({ children }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const params = useParams<{ workspace: string }>();

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));
  }, []);

  if (!mounted) return null;

  function close() { router.push(`/app/${params.workspace}`); }

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-start justify-center transition-all duration-200 ${
        visible ? "bg-black/50" : "bg-transparent"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className={`relative mt-10 flex h-[calc(100vh-60px)] w-full max-w-[1200px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card text-foreground transition-all duration-200 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {/* Close × */}
        <button
          type="button"
          aria-label="Close settings"
          onClick={close}
          className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground active:scale-[0.97]"
        >
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}
