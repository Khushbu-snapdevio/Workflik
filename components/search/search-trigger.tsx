"use client";

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent("workflik:open-search"))}
      className="flex h-8 w-44 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-muted/40 px-3 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <svg className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span className="flex-1 truncate whitespace-nowrap text-left text-xs">Search anything…</span>
      <kbd className="shrink-0 rounded-[var(--radius-xs)] bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground/60">⌘K</kbd>
    </button>
  );
}
