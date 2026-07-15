"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";

interface Props {
  workspaceId: string;
  workspaceSlug: string;
  parentId?: string;
  isPrivate?: boolean;
  children: React.ReactNode;
  className?: string;
  title?: string;
  onBeforeCreate?: () => void;
}

export function NewPageButton({
  workspaceId,
  workspaceSlug,
  parentId,
  isPrivate,
  children,
  className,
  title,
  onBeforeCreate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  async function handleClick() {
    if (loading) return;
    onBeforeCreate?.();
    setLoading(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, parentId: parentId ?? null, title: "Untitled", isPrivate }),
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
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
        onMouseEnter={(e) => { if (title) showTooltip(title, e); }}
        onMouseLeave={hideTooltip}
      >
        {children}
      </button>
      {tooltip && typeof document !== "undefined" && createPortal(
        <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
        document.body,
      )}
    </>
  );
}
