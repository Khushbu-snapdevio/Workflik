"use client";

import { createPortal } from "react-dom";
import { signOut } from "@/lib/auth/client";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";

export function SignOutButton({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

  async function handleSignOut() {
    await signOut();
    window.location.href = "/auth/login";
  }

  return (
    <>
      <button
        className={className}
        onClick={handleSignOut}
        type="button"
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
