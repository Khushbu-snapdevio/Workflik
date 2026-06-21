"use client";

import { getOptionColor, formatNumber, formatDate } from "@/components/database/property-registry";
import type { NumberFormat } from "@/components/database/property-registry";
import type { DbProperty, SelectOption } from "@/components/database/types";

interface CellDisplayProps {
  property: DbProperty;
  value: unknown;
  compact?: boolean;
}

export function CellDisplay({ property, value, compact }: CellDisplayProps) {
  const v = value as Record<string, unknown> | null;

  switch (property.type) {
    case "text": {
      const text = (v as { text?: string } | null)?.text ?? "";
      if (!text) return null;
      return <span className="truncate text-sm text-foreground">{text}</span>;
    }

    case "number": {
      const n = (v as { number?: number | null } | null)?.number ?? null;
      return (
        <span className="truncate text-sm tabular-nums text-foreground">
          {formatNumber(n, (property.config?.format as NumberFormat) ?? "number")}
        </span>
      );
    }

    case "select": {
      const optionId = (v as { optionId?: string | null } | null)?.optionId ?? null;
      if (!optionId) return null;
      const options = (property.config?.options ?? []) as SelectOption[];
      const opt = options.find((o) => o.id === optionId);
      if (!opt) return null;
      const color = getOptionColor(opt.color);
      return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>
          <span className={`size-1.5 shrink-0 rounded-full ${color.dot}`} />
          {opt.name}
        </span>
      );
    }

    case "multi_select": {
      const optionIds = (v as { optionIds?: string[] } | null)?.optionIds ?? [];
      const options   = (property.config?.options ?? []) as SelectOption[];
      const selected  = optionIds.map((id) => options.find((o) => o.id === id)).filter(Boolean) as SelectOption[];
      if (!selected.length) return null;
      const shown = compact ? selected.slice(0, 2) : selected;
      return (
        <div className="flex flex-wrap gap-1">
          {shown.map((opt) => {
            const color = getOptionColor(opt.color);
            return (
              <span key={opt.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>
                <span className={`size-1.5 shrink-0 rounded-full ${color.dot}`} />
                {opt.name}
              </span>
            );
          })}
          {compact && selected.length > 2 && (
            <span className="text-xs text-muted-foreground">+{selected.length - 2}</span>
          )}
        </div>
      );
    }

    case "date": {
      const date = (v as { date?: string | null } | null)?.date ?? null;
      if (!date) return null;
      return <span className="text-xs text-foreground">{formatDate(date)}</span>;
    }

    case "checkbox": {
      const checked = (v as { checked?: boolean } | null)?.checked ?? false;
      return (
        <span className="flex items-center">
          {checked ? (
            <svg className="size-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="2" width="16" height="16" rx="4" />
              <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          ) : (
            <svg className="size-4 text-muted-foreground/30" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
            </svg>
          )}
        </span>
      );
    }

    case "url": {
      const url = (v as { url?: string } | null)?.url ?? "";
      if (!url) return null;
      return (
        <a
          href={url.startsWith("http") ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="truncate text-xs text-primary hover:underline"
        >
          {url.replace(/^https?:\/\//, "")}
        </a>
      );
    }

    case "email": {
      const email = (v as { email?: string } | null)?.email ?? "";
      if (!email) return null;
      return (
        <a
          href={`mailto:${email}`}
          onClick={(e) => e.stopPropagation()}
          className="truncate text-xs text-primary hover:underline"
        >
          {email}
        </a>
      );
    }

    case "phone": {
      const phone = (v as { phone?: string } | null)?.phone ?? "";
      if (!phone) return null;
      return (
        <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="text-xs text-foreground">
          {phone}
        </a>
      );
    }

    case "person": {
      const userIds       = (v as { userIds?: string[] } | null)?.userIds ?? [];
      const cachedMembers = (v as { _members?: { id: string; name: string; email: string }[] } | null)?._members ?? [];
      if (!userIds.length) return null;
      const shown = userIds.slice(0, compact ? 2 : 3);
      return (
        <div className="flex flex-wrap items-center gap-1">
          {shown.map((id) => {
            const member  = cachedMembers.find((m) => m.id === id);
            const label   = member?.name ?? member?.email ?? id;
            const initial = label.slice(0, 1).toUpperCase();
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 pl-0.5 pr-2 py-0.5"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                  {initial}
                </span>
                <span className="max-w-[80px] truncate text-xs font-medium text-primary">
                  {label}
                </span>
              </span>
            );
          })}
          {userIds.length > (compact ? 2 : 3) && (
            <span className="text-xs text-muted-foreground">+{userIds.length - (compact ? 2 : 3)}</span>
          )}
        </div>
      );
    }

    case "relation": {
      const entryIds = (v as { entryIds?: string[] } | null)?.entryIds ?? [];
      if (!entryIds.length) return null;
      return (
        <span className="text-xs text-muted-foreground">
          {entryIds.length} {entryIds.length === 1 ? "entry" : "entries"}
        </span>
      );
    }

    default:
      return null;
  }
}
