"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  workspaceId: string;
  workspaceSlug: string;
  parentId?: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  onBeforeCreate?: () => void;
}

export function NewPageButton({
  workspaceId,
  workspaceSlug,
  parentId,
  children,
  className,
  title,
  onBeforeCreate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (loading) return;
    onBeforeCreate?.();
    setLoading(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, parentId: parentId ?? null, title: "Untitled" }),
      });
      if (res.ok) {
        const page = await res.json();
        window.dispatchEvent(new CustomEvent("pages:refresh"));
        router.push(`/app/${workspaceSlug}/${page.shortId}`);
      }
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}
