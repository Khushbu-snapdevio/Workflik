import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page:       number;
  pageSize:   number;
  totalCount: number;
  basePath:   string;
  query:      string; // current ?q= value, empty string if none
}

// Prev/Next pager built as plain <Link>s — keeps navigation a server-driven
// hard cut (Rule 31) instead of a client-side fetch-and-reflow.
export function PaginationControls({ page, pageSize, totalCount, basePath, query }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalCount);

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-card px-5 py-3">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}–{to}</span> of{" "}
        <span className="font-semibold text-foreground">{totalCount}</span>
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
            <ChevronLeft size={12} /> Prev
          </Link>
        ) : (
          <span className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground-subtle">
            <ChevronLeft size={12} /> Prev
          </span>
        )}
        <span className="px-2 text-xs font-medium text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
            Next <ChevronRight size={12} />
          </Link>
        ) : (
          <span className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground-subtle">
            Next <ChevronRight size={12} />
          </span>
        )}
      </div>
    </div>
  );
}
