"use client";

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
        visible ? "bg-black/50 backdrop-blur-[2px]" : "bg-transparent"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className={`relative mt-[40px] flex h-[calc(100vh-60px)] w-full max-w-[1200px] overflow-hidden rounded-2xl bg-white text-[#37352f] transition-all duration-200 ${
          visible ? "translate-y-0 opacity-100 shadow-[0_32px_80px_rgba(0,0,0,0.18)]" : "translate-y-3 opacity-0 shadow-none"
        }`}
        style={{ border: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* Close × */}
        <button
          type="button"
          aria-label="Close settings"
          onClick={close}
          className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-[8px] bg-[#f5f4f2] text-[#787774] transition-all hover:bg-[#e8e8e6] hover:text-[#1c1917] active:scale-95"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-3.5">
            <path d="M2.5 2.5l11 11M13.5 2.5l-11 11"/>
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
