"use client";

import { X } from "lucide-react";
import { useHints } from "./hint-provider";

interface Props {
  hintKey:  string;
  children: React.ReactNode;
  icon?:    string;
}

export function Hint({ hintKey, children, icon = "💡" }: Props) {
  const { isDismissed, dismiss } = useHints();

  if (isDismissed(hintKey)) return null;

  return (
    <div className="group flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
      <span className="mt-px shrink-0 text-base leading-none">{icon}</span>
      <span className="flex-1 leading-relaxed">{children}</span>
      <button
        type="button"
        onClick={() => dismiss(hintKey)}
        title="Dismiss"
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-foreground"
      >
        <X size={10} />
      </button>
    </div>
  );
}
