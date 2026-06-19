"use client";

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent("workflik:open-search"))}
      className="flex h-9 w-48 items-center gap-2 rounded-lg border border-border bg-background px-3 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span className="flex-1 text-left text-xs">Search anything…</span>
      <kbd className="rounded bg-muted px-1 py-px text-2xs font-medium">⌘K</kbd>
    </button>
  );
}
