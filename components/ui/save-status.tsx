"use client";

import { Check, Dot, Loader2, WifiOff } from "lucide-react";

// "unsaved" only applies to editors that save explicitly rather than
// autosaving (the Orbit template builder) — autosaving callers never enter it.
export type SaveState = "idle" | "saving" | "saved" | "offline" | "unsaved";

interface Props {
  state: SaveState;
  className?: string;
}

// One consistent look for the "Saving… / Saved / Offline" autosave indicator
// — previously reimplemented separately per editor with different icons (or
// none at all) and wording each time. Purely presentational: the caller owns
// the state machine and any auto-hide timing.
export function SaveStatusIndicator({ state, className = "" }: Props) {
  if (state === "idle") return null;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity duration-300 select-none ${
        state === "offline"
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-border/60 bg-muted/60 text-muted-foreground"
      } ${className}`}
    >
      {state === "saving" && (
        <>
          <Loader2 size={11} className="animate-spin" />
          Saving…
        </>
      )}
      {state === "saved" && (
        <>
          <Check size={11} className="text-success" />
          Saved
        </>
      )}
      {state === "unsaved" && (
        <>
          <Dot size={11} className="text-warning" />
          Unsaved changes
        </>
      )}
      {state === "offline" && (
        <>
          <WifiOff size={11} />
          Offline — changes will sync when reconnected
        </>
      )}
    </div>
  );
}
