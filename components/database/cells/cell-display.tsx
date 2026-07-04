"use client";

import { getOptionColor, formatNumber, formatDate } from "@/components/database/property-registry";
import type { NumberFormat } from "@/components/database/property-registry";
import type { DbProperty, SelectOption } from "@/components/database/types";

interface CellDisplayProps {
  property: DbProperty;
  value: unknown;
  compact?: boolean;
  /** When set, a checkbox-display select/status property renders as a real
   *  button that toggles in place instead of plain read-only text — used by
   *  the calendar card so a checkbox-style property can be checked/unchecked
   *  right there, without opening the entry's own full page. */
  onToggleCheckbox?: () => void;
  /** Resolved by the caller (view-property-resolver.ts, per the active view's
   *  own propertyOverrides), NOT read from property.config directly here —
   *  CellDisplay itself has no notion of which view it's rendering inside, so
   *  the same Status property can render as a checkbox in Board and a badge
   *  in Table/Calendar/Gallery. Falls back to the property's own global
   *  config when the caller doesn't pass these (keeps older call sites working). */
  resolvedDisplayAs?: "select" | "checkbox";
  resolvedWrapContent?: boolean;
}

// Same custom rounded-square glyph the checkbox-type property already uses in
// entry-properties-panel.tsx — the app's actual checkbox design, rather than
// the generic lucide Square/SquareCheck icons.
function CheckboxGlyph({ checked }: { checked: boolean }) {
  return checked ? (
    <svg className="size-4 shrink-0 text-primary" viewBox="0 0 20 20" fill="currentColor">
      <rect x="2" y="2" width="16" height="16" rx="4" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ) : (
    <svg className="size-4 shrink-0 text-muted-foreground/60" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
    </svg>
  );
}

export function CellDisplay({ property, value, compact, onToggleCheckbox, resolvedDisplayAs, resolvedWrapContent }: CellDisplayProps) {
  const v = value as Record<string, unknown> | null;
  const displayAs = resolvedDisplayAs ?? property.config?.displayAs;
  const wrapContent = resolvedWrapContent ?? property.config?.wrapContent;

  switch (property.type) {
    case "text": {
      const text = (v as { text?: string } | null)?.text ?? "";
      if (!text) return null;
      return <span className="truncate text-xs text-foreground">{text}</span>;
    }

    case "number": {
      const n = (v as { number?: number | null } | null)?.number ?? null;
      return (
        <span className="truncate text-xs tabular-nums text-foreground">
          {formatNumber(n, (property.config?.format as NumberFormat) ?? "number")}
        </span>
      );
    }

    case "select": {
      const optionId = (v as { optionId?: string | null } | null)?.optionId ?? null;
      if (displayAs === "checkbox") {
        const icon = <CheckboxGlyph checked={!!optionId} />;
        if (onToggleCheckbox) {
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleCheckbox(); }}
              className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-foreground"
            >
              {icon}
              {property.name}
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            {icon}
            {property.name}
          </span>
        );
      }
      if (!optionId) return null;
      const options = (property.config?.options ?? []) as SelectOption[];
      const opt = options.find((o) => o.id === optionId);
      if (!opt) return null;
      const wrapCls = wrapContent ? "whitespace-normal break-words" : "truncate";
      const color = getOptionColor(opt.color);
      return (
        <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
          <span className={wrapCls}>{opt.name}</span>
        </span>
      );
    }

    case "multi_select": {
      const optionIds = (v as { optionIds?: string[] } | null)?.optionIds ?? [];
      const options   = (property.config?.options ?? []) as SelectOption[];
      const selected  = optionIds.map((id) => options.find((o) => o.id === id)).filter(Boolean) as SelectOption[];
      if (displayAs === "checkbox") {
        const icon = <CheckboxGlyph checked={selected.length > 0} />;
        if (onToggleCheckbox) {
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleCheckbox(); }}
              className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-foreground"
            >
              {icon}
              {property.name}
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            {icon}
            {property.name}
          </span>
        );
      }
      if (!selected.length) return null;
      const shown = compact ? selected.slice(0, 2) : selected;
      return (
        <div className="flex flex-wrap gap-1">
          {shown.map((opt) => {
            const color = getOptionColor(opt.color);
            return (
              <span key={opt.id} className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
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
          <CheckboxGlyph checked={checked} />
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
            // `||`, not `??` — a cached member with a genuinely empty-string
            // name/email (old data saved before that was fixed) would leak
            // through as a blank label/initial otherwise.
            const label   = member?.name || member?.email || id;
            const initial = label.slice(0, 1).toUpperCase();
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] bg-muted pl-0.5 pr-2 py-0.5"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {initial}
                </span>
                <span className="max-w-[80px] truncate text-xs font-medium text-foreground">
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
