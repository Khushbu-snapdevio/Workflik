"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IconTooltip } from "@/components/ui/icon-tooltip";

interface Props {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}

// Compact icon-only row action with a hover tooltip (via the app's own
// IconTooltip, not the shadcn dark-pill Tooltip) — used to keep action
// columns narrow enough that tables don't need horizontal scroll.
export function IconTooltipButton({ icon, label, href, onClick, danger }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const className = `flex size-7 items-center justify-center rounded-[var(--radius-xs)] transition-colors duration-150 ${
    danger
      ? "text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
      : "text-muted-foreground hover:bg-accent hover:text-foreground"
  }`;

  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => setRect(e.currentTarget.getBoundingClientRect()),
    onMouseLeave: () => setRect(null),
  };

  const tooltip = rect && typeof document !== "undefined"
    ? createPortal(<IconTooltip rect={rect} label={label} />, document.body)
    : null;

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className} {...handlers}>
        {icon}
        {tooltip}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={className} {...handlers}>
      {icon}
      {tooltip}
    </button>
  );
}
